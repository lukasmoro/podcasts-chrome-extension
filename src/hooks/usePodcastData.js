import { useState, useEffect, useCallback, useRef } from 'react';

// broadcasted events
const PODCAST_UPDATED_EVENT = 'podcast-storage-updated';

const storageUpdateNotification = (detail = {}) => {
  const event = new CustomEvent(PODCAST_UPDATED_EVENT, { detail });
  window.dispatchEvent(event);
};

// usePodcastData hook
export const usePodcastData = () => {
  // item states
  const [items, setItems] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const isReorderingRef = useRef(false);
  const lastReorderSignatureRef = useRef(null);
  const initiatedUpdateRef = useRef(false);

  // debugging function
  const logPodcastChange = (action, data) => {
    console.log(`[PodcastData] ${action}:`, data);
  };

  // data structure storage, init & listeners
  useEffect(() => {
    const loadPodcasts = () => {
      chrome.storage.local.get(['newUrls'], (item) => {
        const existingItems = item.newUrls || [];
        const feedItems = existingItems.map((feedItem) => ({
          key: feedItem.key,
          text: feedItem.text,
          podcastName: feedItem.podcastName,
          artwork: feedItem.artwork || feedItem.artworkUrl,
          currentTime: feedItem.currentTime || 0,
          duration: feedItem.duration || 0,
          playbackStatus: feedItem.playbackStatus || 'NOT_STARTED',
        }));
        setItems(feedItems);
        setIsLoaded(true);
        logPodcastChange('Loaded podcasts', feedItems);
      });
    };

    loadPodcasts();

    const storageChangeHandler = (changes, area) => {
      if (area === 'local' && changes.newUrls && !initiatedUpdateRef.current) {
        logPodcastChange('Storage changed externally', changes.newUrls);
        loadPodcasts();
      }
      initiatedUpdateRef.current = false;
    };

    const customEventHandler = () => {
      if (!initiatedUpdateRef.current) {
        logPodcastChange('Custom event received', event.detail);
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

  // adding podcast data item to storage with callback function
  const handleAddPodcast = useCallback(
    async (item) => {
      const urlChecker = (url) => url.text !== item.text;
      let check = items.every(urlChecker);

      if (
        items.length > 4 ||
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
        const newItem = {
          ...item,
          podcastName,
          artwork: item.artwork,
          currentTime: 0,
          duration: 0,
          playbackStatus: 'NOT_STARTED',
        };
        const newUrls = [newItem, ...items];
        initiatedUpdateRef.current = true;

        setItems(newUrls);

        chrome.storage.local.set({ newUrls }, () => {
          console.log('Podcast added:', newItem);
          storageUpdateNotification({ action: 'add', item: newItem });
        });
      } catch (error) {
        console.error('Error fetching podcast feed:', error);
        alert(
          'Error fetching podcast feed. Please check the URL and try again.'
        );
      }
    },
    [items]
  );

  // removing podcast data item from storage with callback function
  const handleRemovePodcast = useCallback(
    (key) => {
      const newUrls = items.filter((item) => item.key !== key);
      initiatedUpdateRef.current = true;
      setItems(newUrls);

      chrome.storage.local.set({ newUrls }, () => {
        storageUpdateNotification({ action: 'remove', key });
      });
    },
    [items]
  );

  // reordering podcast data item from storage with callback function
  const handleReorderPodcasts = useCallback(
    (sourceIndex, destinationIndex) => {
      const reorderSignature = `${sourceIndex}-${destinationIndex}`;

      if (
        lastReorderSignatureRef.current === reorderSignature &&
        isReorderingRef.current
      ) {
        return;
      }

      isReorderingRef.current = true;
      lastReorderSignatureRef.current = reorderSignature;
      const reorderedItems = Array.from(items);
      const [movedItem] = reorderedItems.splice(sourceIndex, 1);
      reorderedItems.splice(destinationIndex, 0, movedItem);
      initiatedUpdateRef.current = true;
      setItems(reorderedItems);

      chrome.storage.local.set({ newUrls: reorderedItems }, () => {
        storageUpdateNotification({
          action: 'reorder',
          sourceIndex,
          destinationIndex,
        });
        isReorderingRef.current = false;
      });
    },
    [items]
  );

  // adding playback data to podcast data item to storage with callback function
  const handleUpdatePlayback = useCallback(
    (key, playbackData) => {
      const podcastIndex = items.findIndex((item) => item.key === key);

      if (podcastIndex === -1) return;

      const updatedItems = [...items];
      const podcast = { ...updatedItems[podcastIndex] };

      podcast.currentTime = playbackData.currentTime;
      podcast.duration = playbackData.duration;
      podcast.playbackStatus = playbackData.status;

      updatedItems[podcastIndex] = podcast;

      initiatedUpdateRef.current = true;
      setItems(updatedItems);

      chrome.storage.local.set({ newUrls: updatedItems }, () => {
        storageUpdateNotification({
          action: 'update-playback',
          key,
          playbackData,
        });
      });
    },
    [items]
  );

  return {
    items,
    isLoaded,
    setItems,
    handleAddPodcast,
    handleRemovePodcast,
    handleReorderPodcasts,
    handleUpdatePlayback,
  };
};
