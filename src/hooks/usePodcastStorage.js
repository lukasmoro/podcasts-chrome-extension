import { useState, useEffect } from 'react';

export const usePodcastStorage = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    chrome.storage.local.get(['newUrls'], (item) => {
      const existingItems = item.newUrls || [];
      // Map items to ensure consistent format
      const feedItems = existingItems.map((feedItem) => ({
        key: feedItem.key,
        text: feedItem.text,
        podcastName: feedItem.podcastName,
        artwork: feedItem.artwork || feedItem.artworkUrl,
      }));
      setItems(feedItems);
    });
  }, []);

  const handleAddPodcast = async (item) => {
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
        xml.querySelector('channel > title')?.textContent || 'Unnamed Podcast';
      const newItem = { ...item, podcastName, artwork: item.artwork };

      let newUrls = [newItem, ...items];

      chrome.storage.local.set({ newUrls }, () => {
        setItems(newUrls);
        console.log('Podcast added:', newItem);

        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            chrome.tabs.reload(tabs[0].id);
          }
        );
      });
    } catch (error) {
      console.error('Error fetching podcast feed:', error);
      alert('Error fetching podcast feed. Please check the URL and try again.');
    }
  };

  const handleRemovePodcast = (key) => {
    const newUrls = items.filter((item) => item.key !== key);
    chrome.storage.local.set({ newUrls }, () => {
      setItems(newUrls);
    });
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.reload(tabs[0].id);
    });
  };

  return {
    items,
    setItems,
    handleAddPodcast,
    handleRemovePodcast,
  };
};
