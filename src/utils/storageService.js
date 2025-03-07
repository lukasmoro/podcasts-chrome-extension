// Storage keys
const STORAGE_KEYS = {
  PODCASTS: 'podcasts',
  PLAYBACK: 'playback',
};

// Event names for broadcasting updates
const EVENTS = {
  PODCAST_UPDATED: 'podcast-data-updated',
  PLAYBACK_UPDATED: 'playback-data-updated',
};

// Standard podcast item structure
const createPodcastItem = (data) => {
  const title = data.title || data.podcastName || 'Unknown Podcast';
  
  return {
    id: data.id || data.key || `podcast_${Date.now()}`,
    url: data.url || data.text || '',
    title: title,
    podcastName: title, // For backward compatibility
    key: data.key || data.id || `podcast_${Date.now()}`, // For backward compatibility
    text: data.text || data.url || '', // For backward compatibility
    artwork: data.artwork || data.artworkUrl || null,
    author: data.author || null,
    publisher: data.publisher || null,
    category: data.category || null,
    description: data.description || null,
    playback: {
      currentTime: data.currentTime || 0,
      duration: data.duration || 0,
      status: data.playbackStatus || 'NOT_STARTED',
    },
    // Also keep flat properties for backward compatibility
    currentTime: data.currentTime || 0,
    duration: data.duration || 0,
    playbackStatus: data.playbackStatus || 'NOT_STARTED',
    addedAt: data.addedAt || Date.now(),
  };
};

// Broadcast events when storage changes
const broadcastEvent = (eventName, detail = {}) => {
  console.log(`Broadcasting event: ${eventName}`, detail);
  const event = new CustomEvent(eventName, { detail });
  window.dispatchEvent(event);
};

// Storage Service
const StorageService = {
  // Get all podcasts
  async getAllPodcasts() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.PODCASTS]);
      return result[STORAGE_KEYS.PODCASTS] || [];
    } catch (error) {
      console.error('Storage error (getAllPodcasts):', error);
      return [];
    }
  },

  // Add a podcast
  async addPodcast(podcastData) {
    try {
      console.log('StorageService: Adding podcast:', podcastData);
      
      const podcasts = await this.getAllPodcasts();
      console.log('StorageService: Current podcasts count:', podcasts.length);
      
      // Check if podcast already exists
      const exists = podcasts.some(podcast => 
        (podcast.url && podcast.url === podcastData.url) || 
        (podcast.text && podcast.text === podcastData.text)
      );
      
      if (exists) {
        console.warn('StorageService: Podcast already exists');
        throw new Error('Podcast already exists');
      }
      
      // Format the podcast data with consistent structure
      const newPodcast = createPodcastItem(podcastData);
      console.log('StorageService: Formatted podcast:', newPodcast);
      
      // Add to storage
      const updatedPodcasts = [newPodcast, ...podcasts];
      console.log('StorageService: Saving updated podcasts:', updatedPodcasts.length);
      
      await chrome.storage.local.set({ [STORAGE_KEYS.PODCASTS]: updatedPodcasts });
      
      // Broadcast updates
      console.log('StorageService: Broadcasting add event');
      broadcastEvent(EVENTS.PODCAST_UPDATED, { 
        action: 'add', 
        podcast: newPodcast 
      });
      
      return newPodcast;
    } catch (error) {
      console.error('Storage error (addPodcast):', error);
      throw error;
    }
  },

  // Remove a podcast
  async removePodcast(podcastId) {
    try {
      console.log('StorageService: Removing podcast:', podcastId);
      
      const podcasts = await this.getAllPodcasts();
      console.log('StorageService: Current podcasts count:', podcasts.length);
      
      const updatedPodcasts = podcasts.filter(podcast => 
        podcast.id !== podcastId && podcast.key !== podcastId
      );
      
      console.log('StorageService: Updated podcasts count:', updatedPodcasts.length);
      await chrome.storage.local.set({ [STORAGE_KEYS.PODCASTS]: updatedPodcasts });
      
      console.log('StorageService: Broadcasting remove event');
      broadcastEvent(EVENTS.PODCAST_UPDATED, { 
        action: 'remove', 
        podcastId,
        remainingCount: updatedPodcasts.length 
      });
      
      return podcastId;
    } catch (error) {
      console.error('Storage error (removePodcast):', error);
      throw error;
    }
  },

  // Reorder podcasts
  async reorderPodcasts(sourceIndex, destinationIndex) {
    try {
      console.log('StorageService: Reordering podcasts:', sourceIndex, '->', destinationIndex);
      
      const podcasts = await this.getAllPodcasts();
      console.log('StorageService: Current podcasts count:', podcasts.length);
      
      if (podcasts.length <= 1) {
        console.log('StorageService: Not enough podcasts to reorder');
        return podcasts;
      }
      
      const reorderedPodcasts = Array.from(podcasts);
      const [movedItem] = reorderedPodcasts.splice(sourceIndex, 1);
      reorderedPodcasts.splice(destinationIndex, 0, movedItem);
      
      console.log('StorageService: Saving reordered podcasts');
      await chrome.storage.local.set({ [STORAGE_KEYS.PODCASTS]: reorderedPodcasts });
      
      console.log('StorageService: Broadcasting reorder event');
      broadcastEvent(EVENTS.PODCAST_UPDATED, { 
        action: 'reorder', 
        sourceIndex, 
        destinationIndex,
        count: reorderedPodcasts.length
      });
      
      return reorderedPodcasts;
    } catch (error) {
      console.error('Storage error (reorderPodcasts):', error);
      throw error;
    }
  },

  // Update podcast playback - optimized version with debouncing
  _playbackUpdateQueue: {},
  _playbackTimeouts: {},
  
  async updatePlayback(podcastId, playbackData) {
    try {
      // Don't broadcast normal playback progress updates during active playback
      const isProgressUpdate = playbackData.status === 'IN_PROGRESS';
      
      // Always update the individual playback state immediately
      // This is critical for local UI responsiveness
      const playbackState = {
        time: playbackData.currentTime,
        duration: playbackData.duration,
        status: playbackData.status,
        lastUpdated: Date.now(),
      };
      
      // Update individual storage for direct access (needed for playback state)
      await chrome.storage.local.set({ [podcastId]: playbackState });
      
      // For progress updates during active playback, we debounce the main storage updates
      // and full broadcast events to avoid overwhelming the system
      if (isProgressUpdate) {
        // Clear any pending timeout for this podcast
        if (this._playbackTimeouts[podcastId]) {
          clearTimeout(this._playbackTimeouts[podcastId]);
        }
        
        // Store the latest update in the queue
        this._playbackUpdateQueue[podcastId] = playbackData;
        
        // Set a new timeout to process this update after a delay
        this._playbackTimeouts[podcastId] = setTimeout(async () => {
          // Get the latest data from the queue
          const latestData = this._playbackUpdateQueue[podcastId];
          
          // Clear the queue and timeout
          delete this._playbackUpdateQueue[podcastId];
          delete this._playbackTimeouts[podcastId];
          
          // Actually do the full update with the latest data
          await this._doFullPlaybackUpdate(podcastId, latestData);
          
          // Only broadcast on debounced updates for progress
          broadcastEvent(EVENTS.PLAYBACK_UPDATED, { 
            podcastId, 
            playbackState: {
              time: latestData.currentTime,
              duration: latestData.duration,
              status: latestData.status,
              lastUpdated: Date.now(),
            }
          });
        }, 2000); // 2 second debounce
        
        // Return early for debounced updates
        return null;
      } else {
        // For non-progress updates (FINISHED, UNPLAYED, etc.),
        // we do the full update immediately
        const result = await this._doFullPlaybackUpdate(podcastId, playbackData);
        
        // Broadcast events for important state changes
        broadcastEvent(EVENTS.PLAYBACK_UPDATED, { podcastId, playbackState });
        
        return result;
      }
    } catch (error) {
      console.error('Storage error (updatePlayback):', error);
      throw error;
    }
  },
  
  // Helper method to update the full podcast entry in storage
  async _doFullPlaybackUpdate(podcastId, playbackData) {
    try {
      const podcasts = await this.getAllPodcasts();
      const podcastIndex = podcasts.findIndex(podcast => 
        podcast.id === podcastId || podcast.key === podcastId
      );
      
      if (podcastIndex === -1) {
        console.warn(`Podcast with ID ${podcastId} not found for playback update`);
        return null;
      }
      
      // Create an updated version of the podcast with new playback data
      const updatedPodcast = {
        ...podcasts[podcastIndex],
        playback: {
          currentTime: playbackData.currentTime,
          duration: playbackData.duration,
          status: playbackData.status,
        },
        // Update flat properties too for backward compatibility
        currentTime: playbackData.currentTime,
        duration: playbackData.duration,
        playbackStatus: playbackData.status
      };
      
      // IMPORTANT CHANGE: We now use a specialized storage key for each podcast's playback
      // This avoids updating the entire podcasts collection, which was causing unwanted refreshes
      const playbackStorageKey = `playback_${podcastId}`;
      await chrome.storage.local.set({ [playbackStorageKey]: updatedPodcast });
      
      // We still need to periodically update the full podcast list, but only for
      // important state changes, not regular playback updates
      if (playbackData.status !== 'IN_PROGRESS') {
        // Update the podcast in the full collection, but in a way that won't trigger refreshes
        // This ensures data is eventually consistent but doesn't cause UI updates
        const updatedPodcasts = [...podcasts];
        updatedPodcasts[podcastIndex] = updatedPodcast;
        
        // Use a different storage key for silently updating the full collection
        // This won't trigger storage listeners that are only watching STORAGE_KEYS.PODCASTS
        await chrome.storage.local.set({ 
          [`${STORAGE_KEYS.PODCASTS}_silent_update`]: updatedPodcasts 
        });
        
        // Then update the actual PODCASTS collection during browser idle time
        // to ensure consistency without disrupting the user experience
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => {
            chrome.storage.local.set({ [STORAGE_KEYS.PODCASTS]: updatedPodcasts })
              .catch(err => console.error('Error updating podcasts in idle callback:', err));
          }, { timeout: 2000 });
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(() => {
            chrome.storage.local.set({ [STORAGE_KEYS.PODCASTS]: updatedPodcasts })
              .catch(err => console.error('Error updating podcasts in timeout:', err));
          }, 2000);
        }
        
        // Only broadcast for important state changes
        broadcastEvent(EVENTS.PODCAST_UPDATED, { 
          action: 'update-playback', 
          podcastId, 
          playbackData,
          silent: true  // Flag to indicate this shouldn't trigger full UI refreshes
        });
      }
      
      return updatedPodcast;
    } catch (error) {
      console.error('Error in _doFullPlaybackUpdate:', error);
      return null;
    }
  },

  // Get podcast details (duplicate method - remove this one)
  // This method was moved to the end of the service
  // Delete after testing that the new version works correctly,

  // Listen for storage changes
  addStorageListener(callback) {
    const storageChangeHandler = (changes, area) => {
      if (area === 'local' && changes[STORAGE_KEYS.PODCASTS]) {
        // Pass both the new value and the changes object so listeners can determine the type of change
        callback(changes[STORAGE_KEYS.PODCASTS].newValue, changes);
      }
    };
    
    chrome.storage.onChanged.addListener(storageChangeHandler);
    return () => chrome.storage.onChanged.removeListener(storageChangeHandler);
  },

  // Add event listener for custom events
  addEventListener(event, callback) {
    console.log(`Adding listener for ${event}`);
    window.addEventListener(event, callback);
    return () => {
      console.log(`Removing listener for ${event}`);
      window.removeEventListener(event, callback);
    };
  },

  // Get podcast details - prioritizes the individual playback storage
  async getPodcast(podcastId) {
    try {
      // First try to get the podcast from its dedicated playback storage
      // This is the most up-to-date source for playback information
      const playbackStorageKey = `playback_${podcastId}`;
      const result = await chrome.storage.local.get([playbackStorageKey]);
      
      if (result && result[playbackStorageKey]) {
        return result[playbackStorageKey];
      }
      
      // If not found in dedicated storage, fall back to the podcasts collection
      const podcasts = await this.getAllPodcasts();
      return podcasts.find(podcast => 
        podcast.id === podcastId || podcast.key === podcastId
      ) || null;
    } catch (error) {
      console.error('Storage error (getPodcast):', error);
      return null;
    }
  }
};

export { StorageService, EVENTS, createPodcastItem };