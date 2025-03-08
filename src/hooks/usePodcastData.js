import { useState, useEffect, useCallback, useRef } from 'react';
import { StorageService, EVENTS } from '../utils/storageService';
import { parseRss } from '../utils/rssParser';

export const usePodcastData = () => {
  //states & refs
  const [items, setItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const isReorderingRef = useRef(false);
  const lastReorderSignatureRef = useRef(null);
  const initiatedUpdateRef = useRef(false);

  useEffect(() => {
    loadPodcasts();

    function loadPodcasts() {
      StorageService.getAllPodcasts().then((podcasts) => {
        setItems(podcasts);
        setIsLoaded(true);
      });
    }

    const removeStorageListener = StorageService.addStorageListener(
      (newPodcasts, changes) => {
        if (!initiatedUpdateRef.current) {
          loadPodcasts();
        }
        initiatedUpdateRef.current = false;
      }
    );

    const removeEventListener = StorageService.addEventListener(
      EVENTS.PODCAST_UPDATED,
      (event) => {
        if (
          event.detail?.action === 'update-playback' ||
          event.detail?.silent
        ) {
          return;
        }

        if (!initiatedUpdateRef.current) {
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

  // add podcast item callback
  const handleAddPodcast = useCallback(
    async (item) => {
      if (items.length > 4) {
        alert('Maximum number of podcasts reached (5)');
        return;
      }

      const urlExists = items.some(
        (podcast) => podcast.url === item.text || podcast.url === item.url
      );

      if (urlExists) {
        alert('This podcast has already been added! 👀');
        return;
      }

      const urlPattern =
        /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/;
      const url = item.text || item.url;

      if (!urlPattern.test(url)) {
        alert('Please enter a valid URL');
        return;
      }

      try {
        const response = await fetch(url);
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const podcastName =
          xml.querySelector('channel > title')?.textContent ||
          'Unnamed Podcast';
        const rssData = parseRss(text) || {};
        const podcastId = item.id || `podcast_${Date.now()}`;
        const newPodcastData = {
          id: podcastId,
          url: url,
          title: podcastName,
          image: item.image || rssData.image,
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
      } catch (error) {
        console.error('Error adding podcast:', error);
        alert('Error adding podcast. Please check the URL and try again.');
      }
    },
    [items]
  );

  const handleRemovePodcast = useCallback(async (id) => {
    try {
      initiatedUpdateRef.current = true;
      await StorageService.removePodcast(id);
      const updatedPodcasts = await StorageService.getAllPodcasts();
      setItems(updatedPodcasts);
    } catch (error) {
      console.error('Error removing podcast:', error);
      console.error('Failed to remove podcast with ID:', id);
    }
  }, []);

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
        const reorderedPodcasts = await StorageService.getAllPodcasts();
        setItems(reorderedPodcasts);
        isReorderingRef.current = false;
      } catch (error) {
        console.error('Error reordering podcasts:', error);
        isReorderingRef.current = false;
      }
    },
    []
  );
  const lastPlaybackUpdatesRef = useRef({});

  const handleUpdatePlayback = useCallback(async (id, playbackData) => {
    try {
      const lastUpdate = lastPlaybackUpdatesRef.current[id];
      const isSameUpdate =
        lastUpdate &&
        lastUpdate.currentTime === playbackData.currentTime &&
        lastUpdate.status === playbackData.status;

      if (isSameUpdate) {
        return;
      }

      lastPlaybackUpdatesRef.current[id] = {
        currentTime: playbackData.currentTime,
        status: playbackData.status,
        timestamp: Date.now(),
      };

      initiatedUpdateRef.current = true;

      await StorageService.updatePlayback(id, playbackData);

      if (playbackData.status !== 'IN_PROGRESS') {
        const updatedPodcasts = await StorageService.getAllPodcasts();
        setItems(updatedPodcasts);
      }
    } catch (error) {
      console.error(`Error updating playback for podcast ${id}:`, error);
    }
  }, []);

  return {
    items,
    isLoaded,
    handleAddPodcast,
    handleRemovePodcast,
    handleReorderPodcasts,
    handleUpdatePlayback,
  };
};
