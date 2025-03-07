import { useState, useEffect, useCallback, useRef } from 'react';
import { StorageService, EVENTS } from '../utils/storageService';
import { parseRss } from '../utils/rssParser';

// usePodcastData hook - uses the centralized StorageService
export const usePodcastData = () => {
  // State for podcast collection
  const [items, setItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const isReorderingRef = useRef(false);
  const lastReorderSignatureRef = useRef(null);
  const initiatedUpdateRef = useRef(false);

  // Debugging function with filtered logging for playback updates
  const logPodcastChange = (action, data) => {
    // Skip logging playback updates to avoid console flooding
    if (action === 'Playback updated') {
      // Only log important playback events like finished
      if (data.playbackData && data.playbackData.status !== 'IN_PROGRESS') {
        console.log(`[PodcastData] ${action}:`, data);
      }
    } else {
      // Log all other events normally
      console.log(`[PodcastData] ${action}:`, data);
    }
  };

  // Load podcasts and set up listeners
  useEffect(() => {
    console.log('usePodcastData: initializing...');
    
    // Load podcasts from storage
    loadPodcasts();

    function loadPodcasts() {
      console.log('usePodcastData: loading podcasts...');
      StorageService.getAllPodcasts().then(podcasts => {
        console.log('usePodcastData: podcasts loaded:', podcasts.length);
        setItems(podcasts);
        setIsLoaded(true);
        logPodcastChange('Loaded podcasts', podcasts);
      });
    }

    // Set up storage change listener - only for podcast collection changes
    const removeStorageListener = StorageService.addStorageListener((newPodcasts, changes) => {
      console.log('usePodcastData: storage updated', initiatedUpdateRef.current);
      if (!initiatedUpdateRef.current) {
        console.log('usePodcastData: reloading after storage change');
        loadPodcasts();
      }
      initiatedUpdateRef.current = false;
    });

    // Set up custom event listener - with optimizations for playback updates
    const removeEventListener = StorageService.addEventListener(
      EVENTS.PODCAST_UPDATED,
      (event) => {
        // Skip collection refresh on playback updates
        // These should be handled by usePodcastPlayback instead
        if (event.detail?.action === 'update-playback' || event.detail?.silent) {
          return;
        }
        
        console.log(
          'usePodcastData: podcast event received', 
          event.detail?.action, 
          initiatedUpdateRef.current
        );
        
        if (!initiatedUpdateRef.current) {
          console.log('usePodcastData: reloading after podcast event');
          loadPodcasts();
        }
        initiatedUpdateRef.current = false;
      }
    );

    return () => {
      removeStorageListener();
      removeEventListener();
    };
  }, []);

  // Add a new podcast
  const handleAddPodcast = useCallback(
    async (item) => {
      // Validations
      if (items.length > 4) {
        alert('Maximum number of podcasts reached (5)');
        return;
      }

      const urlExists = items.some(podcast => 
        podcast.url === item.text || podcast.url === item.url);
      
      if (urlExists) {
        alert('This podcast has already been added! 👀');
        return;
      }
      
      const urlPattern = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/;
      const url = item.text || item.url;
      
      if (!urlPattern.test(url)) {
        alert('Please enter a valid URL');
        return;
      }

      try {
        // Fetch and parse the RSS feed
        const response = await fetch(url);
        const text = await response.text();
        
        // Use the DOMParser for basic extraction and full parseRss for details
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const podcastName = xml.querySelector('channel > title')?.textContent || 'Unnamed Podcast';
        
        // Get additional podcast details from the RSS parser
        const rssData = parseRss(text) || {};
        
        // Create a new podcast item
        const podcastId = item.key || `podcast_${Date.now()}`;
        const newPodcastData = {
          id: podcastId,
          key: podcastId, // For backward compatibility
          url: url,
          text: url, // For backward compatibility
          title: podcastName,
          podcastName: podcastName, // For backward compatibility
          artwork: item.artwork || rssData.image,
          author: rssData.author,
          publisher: rssData.publisher,
          category: rssData.category,
          description: rssData.description,
          currentTime: 0,
          duration: 0,
          playbackStatus: 'NOT_STARTED',
        };
        
        // Store the podcast using the storage service
        initiatedUpdateRef.current = true;
        await StorageService.addPodcast(newPodcastData);
        
        // Update local state
        const updatedPodcasts = await StorageService.getAllPodcasts();
        setItems(updatedPodcasts);
        
        logPodcastChange('Podcast added', newPodcastData);
      } catch (error) {
        console.error('Error adding podcast:', error);
        alert('Error adding podcast. Please check the URL and try again.');
      }
    },
    [items]
  );

  // Remove a podcast
  const handleRemovePodcast = useCallback(
    async (id) => {
      try {
        initiatedUpdateRef.current = true;
        await StorageService.removePodcast(id);
        
        // Update local state
        const updatedPodcasts = await StorageService.getAllPodcasts();
        setItems(updatedPodcasts);
        
        logPodcastChange('Podcast removed', id);
      } catch (error) {
        console.error('Error removing podcast:', error);
      }
    },
    []
  );

  // Reorder podcasts
  const handleReorderPodcasts = useCallback(
    async (sourceIndex, destinationIndex) => {
      const reorderSignature = `${sourceIndex}-${destinationIndex}`;

      if (
        lastReorderSignatureRef.current === reorderSignature &&
        isReorderingRef.current
      ) {
        return;
      }

      try {
        isReorderingRef.current = true;
        lastReorderSignatureRef.current = reorderSignature;
        initiatedUpdateRef.current = true;
        
        await StorageService.reorderPodcasts(sourceIndex, destinationIndex);
        
        // Update local state
        const reorderedPodcasts = await StorageService.getAllPodcasts();
        setItems(reorderedPodcasts);
        
        logPodcastChange('Podcasts reordered', { sourceIndex, destinationIndex });
        isReorderingRef.current = false;
      } catch (error) {
        console.error('Error reordering podcasts:', error);
        isReorderingRef.current = false;
      }
    },
    []
  );

  // Update podcast playback state
  // Track updates to avoid excessive storage operations
  const lastPlaybackUpdatesRef = useRef({});

  const handleUpdatePlayback = useCallback(
    async (id, playbackData) => {
      try {
        // Only log non-progress updates to reduce console spam
        if (playbackData.status !== 'IN_PROGRESS') {
          console.log(`[PodcastData] Updating playback for podcast: ${id}`, playbackData);
        }
        
        // Skip redundant updates with same values
        const lastUpdate = lastPlaybackUpdatesRef.current[id];
        const isSameUpdate = lastUpdate && 
          lastUpdate.currentTime === playbackData.currentTime &&
          lastUpdate.status === playbackData.status;
          
        if (isSameUpdate) {
          return; // Skip duplicate update
        }
        
        // Store this update for future comparison
        lastPlaybackUpdatesRef.current[id] = {
          currentTime: playbackData.currentTime,
          status: playbackData.status,
          timestamp: Date.now()
        };
        
        // Mark as initiated by this component
        initiatedUpdateRef.current = true;
        
        // Use the StorageService which already has debouncing for IN_PROGRESS updates
        await StorageService.updatePlayback(id, playbackData);
        
        // Only update local state for significant changes (not for regular progress)
        // This prevents unnecessary re-renders during normal playback
        if (playbackData.status !== 'IN_PROGRESS') {
          const updatedPodcasts = await StorageService.getAllPodcasts();
          setItems(updatedPodcasts);
        }
        
        // Log is managed by the logPodcastChange function which filters progress updates
        logPodcastChange('Playback updated', { id, playbackData });
      } catch (error) {
        console.error(`Error updating playback for podcast ${id}:`, error);
      }
    },
    []
  );

  return {
    items,
    isLoaded,
    handleAddPodcast,
    handleRemovePodcast,
    handleReorderPodcasts,
    handleUpdatePlayback,
  };
};
