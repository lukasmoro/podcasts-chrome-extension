// usePodcastStore.js
import { useState, useEffect, useCallback, useRef } from 'react';

const PODCAST_UPDATED_EVENT = 'podcast-storage-updated';

const storageUpdateNotification = (detail = {}) => {
  const event = new CustomEvent(PODCAST_UPDATED_EVENT, { detail });
  window.dispatchEvent(event);
};

// Playback status constants
const PLAYBACK_STATUS = {
  UNPLAYED: 'UNPLAYED',
  IN_PROGRESS: 'IN_PROGRESS',
  FINISHED: 'FINISHED',
};

const FINISHED_THRESHOLD = 30;

export const usePodcastStore = () => {
  const [podcasts, setPodcasts] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const isReorderingRef = useRef(false);
  const lastReorderSignatureRef = useRef(null);
  const initiatedUpdateRef = useRef(false);

  useEffect(() => {
    const loadPodcasts = () => {
      chrome.storage.local.get(['podcastData'], (item) => {
        const podcastData = item.podcastData || { items: [] };
        setPodcasts(podcastData.items);
        setIsLoaded(true);
      });
    };

    loadPodcasts();

    const storageChangeHandler = (changes, area) => {
      if (
        area === 'local' &&
        changes.podcastData &&
        !initiatedUpdateRef.current
      ) {
        loadPodcasts();
      }
      initiatedUpdateRef.current = false;
    };

    const customEventHandler = () => {
      if (!initiatedUpdateRef.current) {
        loadPodcasts();
      }
      initiatedUpdateRef.current = false;
    };

    chrome.storage.onChanged.addListener(storageChangeHandler);
    window.addEventListener(PODCAST_UPDATED_EVENT, customEventHandler);

    return () => {
      chrome.storage.onChanged.removeListener(storageChangeHandler);
      window.removeEventListener(PODCAST_UPDATED_EVENT, customEventHandler);
    };
  }, []);

  // Fetch the current storage
  const getCurrentStorage = async () => {
    return new Promise((resolve) => {
      chrome.storage.local.get(['podcastData'], (result) => {
        resolve(result.podcastData || { items: [] });
      });
    });
  };

  // Save the storage
  const saveStorage = async (newData, action, detail = {}) => {
    initiatedUpdateRef.current = true;

    return new Promise((resolve) => {
      chrome.storage.local.set({ podcastData: newData }, () => {
        storageUpdateNotification({ action, ...detail });
        resolve();
      });
    });
  };

  const handleAddPodcast = useCallback(
    async (item) => {
      const urlChecker = (podcast) => podcast.feedUrl !== item.text;
      let check = podcasts.every(urlChecker);

      if (
        podcasts.length > 4 ||
        !check ||
        !/(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/.test(
          item.text
        )
      ) {
        alert('This podcast has already been added! 👀');
        return;
      }

      try {
        const response = await fetch(item.text);
        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        const podcastName =
          xml.querySelector('channel > title')?.textContent ||
          'Unnamed Podcast';

        const newPodcast = {
          id: `podcast_${Date.now()}`,
          feedUrl: item.text,
          podcastName,
          artwork: item.artwork,
          position: 0, // Default to first position
          playback: {
            status: PLAYBACK_STATUS.UNPLAYED,
            currentTime: 0,
            duration: 0,
            lastUpdated: Date.now(),
          },
        };

        // Reposition existing podcasts
        const updatedPodcasts = podcasts.map((podcast) => ({
          ...podcast,
          position: podcast.position + 1,
        }));

        const storage = await getCurrentStorage();
        const newStorage = {
          ...storage,
          items: [newPodcast, ...updatedPodcasts],
        };

        await saveStorage(newStorage, 'add', { podcast: newPodcast });
        setPodcasts(newStorage.items);

        console.log('Podcast added:', newPodcast);
      } catch (error) {
        console.error('Error fetching podcast feed:', error);
        alert(
          'Error fetching podcast feed. Please check the URL and try again.'
        );
      }
    },
    [podcasts]
  );

  const handleRemovePodcast = useCallback(
    async (id) => {
      const updatedPodcasts = podcasts.filter((podcast) => podcast.id !== id);

      // Reindex positions
      const reindexedPodcasts = updatedPodcasts.map((podcast, index) => ({
        ...podcast,
        position: index,
      }));

      const storage = await getCurrentStorage();
      const newStorage = {
        ...storage,
        items: reindexedPodcasts,
      };

      await saveStorage(newStorage, 'remove', { id });
      setPodcasts(reindexedPodcasts);
    },
    [podcasts]
  );

  const handleReorderPodcasts = useCallback(
    async (sourceIndex, destinationIndex) => {
      const reorderSignature = `${sourceIndex}-${destinationIndex}`;

      if (
        lastReorderSignatureRef.current === reorderSignature &&
        isReorderingRef.current
      ) {
        return;
      }

      isReorderingRef.current = true;
      lastReorderSignatureRef.current = reorderSignature;
      const reorderedPodcasts = Array.from(podcasts);
      const [movedPodcast] = reorderedPodcasts.splice(sourceIndex, 1);
      reorderedPodcasts.splice(destinationIndex, 0, movedPodcast);

      // Update positions
      const updatedPodcasts = reorderedPodcasts.map((podcast, index) => ({
        ...podcast,
        position: index,
      }));

      const storage = await getCurrentStorage();
      const newStorage = {
        ...storage,
        items: updatedPodcasts,
      };

      await saveStorage(newStorage, 'reorder', {
        sourceIndex,
        destinationIndex,
      });
      setPodcasts(updatedPodcasts);

      isReorderingRef.current = false;
    },
    [podcasts]
  );

  const updatePlaybackState = useCallback(
    async (id, time, totalDuration) => {
      try {
        const podcastIndex = podcasts.findIndex((podcast) => podcast.id === id);
        if (podcastIndex === -1) return;

        const podcast = podcasts[podcastIndex];
        const currentStatus =
          podcast.playback?.status || PLAYBACK_STATUS.UNPLAYED;
        const wasFinished = currentStatus === PLAYBACK_STATUS.FINISHED;

        let newStatus = currentStatus;

        if (time === 0) {
          newStatus = wasFinished
            ? PLAYBACK_STATUS.FINISHED
            : PLAYBACK_STATUS.UNPLAYED;
        } else if (
          totalDuration &&
          totalDuration - time <= FINISHED_THRESHOLD
        ) {
          newStatus = PLAYBACK_STATUS.FINISHED;
        } else if (time > 0) {
          newStatus = PLAYBACK_STATUS.IN_PROGRESS;
        }

        const updatedPodcast = {
          ...podcast,
          playback: {
            status: newStatus,
            currentTime: time,
            duration: totalDuration,
            lastUpdated: Date.now(),
          },
        };

        const updatedPodcasts = [...podcasts];
        updatedPodcasts[podcastIndex] = updatedPodcast;

        const storage = await getCurrentStorage();
        const newStorage = {
          ...storage,
          items: updatedPodcasts,
        };

        await saveStorage(newStorage, 'playback-update', { id });
        setPodcasts(updatedPodcasts);
      } catch (error) {
        console.error('Error updating playback state:', error);
      }
    },
    [podcasts]
  );

  const resetPlaybackState = useCallback(
    async (id) => {
      try {
        const podcastIndex = podcasts.findIndex((podcast) => podcast.id === id);
        if (podcastIndex === -1) return;

        const podcast = podcasts[podcastIndex];
        const updatedPodcast = {
          ...podcast,
          playback: {
            status: PLAYBACK_STATUS.UNPLAYED,
            currentTime: 0,
            duration: 0,
            lastUpdated: Date.now(),
          },
        };

        const updatedPodcasts = [...podcasts];
        updatedPodcasts[podcastIndex] = updatedPodcast;

        const storage = await getCurrentStorage();
        const newStorage = {
          ...storage,
          items: updatedPodcasts,
        };

        await saveStorage(newStorage, 'playback-reset', { id });
        setPodcasts(updatedPodcasts);
      } catch (error) {
        console.error('Error resetting playback state:', error);
      }
    },
    [podcasts]
  );

  const getPodcastPlayback = useCallback(
    (id) => {
      const podcast = podcasts.find((p) => p.id === id);
      return (
        podcast?.playback || {
          status: PLAYBACK_STATUS.UNPLAYED,
          currentTime: 0,
          duration: 0,
          lastUpdated: Date.now(),
        }
      );
    },
    [podcasts]
  );

  return {
    podcasts,
    isLoaded,
    PLAYBACK_STATUS,
    handleAddPodcast,
    handleRemovePodcast,
    handleReorderPodcasts,
    updatePlaybackState,
    resetPlaybackState,
    getPodcastPlayback,
  };
};
