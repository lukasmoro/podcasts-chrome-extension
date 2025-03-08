// storage key
const STORAGE_KEY = {
  PODCASTS: 'podcasts',
};

// events for broadcasting
const EVENTS = {
  PODCAST_UPDATED: 'podcast-data-updated',
  PLAYBACK_UPDATED: 'playback-data-updated',
};

// create new podcast item data structure
const createPodcastItem = (data) => {
  return {
    id: `podcast_${Date.now()}`,
    url: data.url,
    title: data.title || 'Unknown Podcast',
    image: data.image || null,
    author: data.author || null,
    publisher: data.publisher || null,
    category: data.category || null,
    description: data.description || null,
    playback: {
      currentTime: 0,
      duration: 0,
      status: 'NOT_STARTED',
    },
    addedAt: data.addedAt || Date.now(),
  };
};

// broadcast event
const broadcastEvent = (eventName, detail = {}) => {
  const event = new CustomEvent(eventName, { detail });
  window.dispatchEvent(event);
};

// storage service
const StorageService = {
  // get all podcast items from storage
  async getAllPodcasts() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY.PODCASTS]);
      return result[STORAGE_KEY.PODCASTS] || [];
    } catch (error) {
      console.error('Storage error (getAllPodcasts):', error);
      return [];
    }
  },
  // add podcast item to storage
  async addPodcast(podcastData) {
    try {
      const podcasts = await this.getAllPodcasts();
      const exists = podcasts.some(
        (podcast) => podcast.url === podcastData.url
      );
      if (exists) {
        console.warn('StorageService: Podcast already exists');
        throw new Error('Podcast already exists');
      }
      const newPodcast = createPodcastItem(podcastData);
      const updatedPodcasts = [newPodcast, ...podcasts];
      await chrome.storage.local.set({
        [STORAGE_KEY.PODCASTS]: updatedPodcasts,
      });
      broadcastEvent(EVENTS.PODCAST_UPDATED, {
        action: 'add',
        podcast: newPodcast,
      });
      return newPodcast;
    } catch (error) {
      console.error('Storage error (addPodcast):', error);
      throw error;
    }
  },
  // remove podcast item from storage
  async removePodcast(podcastID) {
    try {
      const podcasts = await this.getAllPodcasts();
      const updatedPodcasts = podcasts.filter(
        (podcast) => podcast.id !== podcastID
      );
      await chrome.storage.local.set({
        [STORAGE_KEY.PODCASTS]: updatedPodcasts,
      });
      await chrome.storage.local.remove([podcastID]);
      broadcastEvent(EVENTS.PODCAST_UPDATED, {
        action: 'remove',
        podcastID,
        remainingCount: updatedPodcasts.length,
      });
      return podcastID;
    } catch (error) {
      console.error('Storage error (removePodcast):', error);
      throw error;
    }
  },
  // reorder podcast item from storage
  async reorderPodcasts(sourceID, destinationID) {
    try {
      const podcasts = await this.getAllPodcasts();
      if (podcasts.length <= 1) {
        return podcasts;
      }
      const reorderedPodcasts = Array.from(podcasts);
      const [movedItem] = reorderedPodcasts.splice(sourceID, 1);
      reorderedPodcasts.splice(destinationID, 0, movedItem);
      await chrome.storage.local.set({
        [STORAGE_KEY.PODCASTS]: reorderedPodcasts,
      });
      broadcastEvent(EVENTS.PODCAST_UPDATED, {
        action: 'reorder',
        sourceID,
        destinationID,
        count: reorderedPodcasts.length,
      });
      return reorderedPodcasts;
    } catch (error) {
      console.error('Storage error (reorderPodcasts):', error);
      throw error;
    }
  },

  // update podcast item with new playback data
  async updatePlayback(podcastID, playbackData) {
    try {
      const podcasts = await this.getAllPodcasts();
      const podcastIndex = podcasts.findIndex(
        (podcast) => podcast.id === podcastID
      );
      if (podcastIndex === -1) {
        return null;
      }
      const updatedPodcast = {
        ...podcasts[podcastIndex],
        playback: {
          currentTime: playbackData.currentTime,
          duration: playbackData.duration,
          status: playbackData.status,
        },
      };
      const updatedPodcasts = [...podcasts];
      updatedPodcasts[podcastIndex] = updatedPodcast;
      await chrome.storage.local.set({
        [STORAGE_KEY.PODCASTS]: updatedPodcasts,
        [podcastID]: {
          time: playbackData.currentTime,
          duration: playbackData.duration,
          status: playbackData.status,
          lastUpdated: Date.now(),
        },
      });
      broadcastEvent(EVENTS.PLAYBACK_UPDATED, {
        podcastID,
        playbackState: {
          time: playbackData.currentTime,
          duration: playbackData.duration,
          status: playbackData.status,
          lastUpdated: Date.now(),
        },
      });
      return updatedPodcast;
    } catch (error) {
      console.error('Storage error (updatePlayback):', error);
      throw error;
    }
  },
  // add a listener for storage change events in callback
  addStorageListener(callback) {
    const storageChangeHandler = (changes, area) => {
      if (area === 'local' && changes[STORAGE_KEY.PODCASTS]) {
        callback(changes[STORAGE_KEY.PODCASTS].newValue, changes);
      }
    };
    chrome.storage.onChanged.addListener(storageChangeHandler);
    return () => chrome.storage.onChanged.removeListener(storageChangeHandler);
  },

  // Add event listener for custom events
  addEventListener(event, callback) {
    window.addEventListener(event, callback);
    return () => {
      window.removeEventListener(event, callback);
    };
  },

  // Get podcast details - prioritizes the individual playback storage
  async getPodcast(podcastID) {
    try {
      const result = await chrome.storage.local.get([podcastID]);
      const podcasts = await this.getAllPodcasts();
      const podcast = podcasts.find((podcast) => podcast.id === podcastID);
      if (!podcast) return null;
      if (result && result[podcastID]) {
        return {
          ...podcast,
          playback: {
            currentTime: result[podcastID].time,
            duration: result[podcastID].duration,
            status: result[podcastID].status,
          },
        };
      }
      return podcast;
    } catch (error) {
      console.error('Storage error (getPodcast):', error);
      return null;
    }
  },
};

export { StorageService, EVENTS, createPodcastItem };
