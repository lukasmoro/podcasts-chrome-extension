import React, { useEffect, useState } from 'react';
import AudioPlayer from './AudioPlayer.jsx';
import StatusIndicator from './StatusIndicator.jsx';
import DraggableInfoCard from './DraggableInfoCard.jsx';
import { parseRss } from '../../utils/rssParser';
import { textTruncate } from '../../utils/textTruncate.js';
import useScrollPosition from '../../hooks/useScrollPosition';
import './Carousel.css';

const PODCAST_UPDATED_EVENT = 'podcast-storage-updated';

const Carousel = ({ isBlurVisible, handleBlurToggle, onPodcastEnd }) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoadingActive] = useState(true);
  const [activeInfoCard, setActiveInfoCard] = useState(null);

  const { scrollPosition, indicatorIndex } = useScrollPosition(
    'parent-container',
    items.length
  );

  const handleLoading = () => {
    setIsLoadingActive(false);
  };

  const loadPodcasts = () => {
    setIsLoadingActive(true);

    chrome.storage.local.get(['latestPodcasts', 'newUrls'], (items) => {
      if (items.latestPodcasts && items.latestPodcasts.length > 0) {
        setItems(items.latestPodcasts);
        setTimeout(() => setIsLoadingActive(false), 500);
      } else if (items.newUrls && items.newUrls.length > 0) {
        const newUrls = items.newUrls.map((newUrl) => newUrl.text);
        Promise.all(newUrls.map((url) => fetch(url)))
          .then((responses) => Promise.all(responses.map((r) => r.text())))
          .then((xmlStrings) => {
            const firstPodcasts = xmlStrings.map(parseRss);
            setItems(firstPodcasts);
            setTimeout(() => setIsLoadingActive(false), 500);
          })
          .catch((error) => {
            console.error('Error fetching podcast feeds:', error);
            setIsLoadingActive(false);
          });
      } else {
        setItems([]);
        setIsLoadingActive(false);
      }
    });
  };

  useEffect(() => {
    loadPodcasts();

    const handlePodcastUpdated = (event) => {
      console.log('Podcast storage updated:', event.detail?.action);
      loadPodcasts();
    };

    window.addEventListener(PODCAST_UPDATED_EVENT, handlePodcastUpdated);

    const handleStorageChanged = (changes, area) => {
      if (area === 'local' && changes.newUrls) {
        console.log('Chrome storage updated with new podcast data');
        loadPodcasts();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChanged);

    return () => {
      window.removeEventListener(PODCAST_UPDATED_EVENT, handlePodcastUpdated);
      chrome.storage.onChanged.removeListener(handleStorageChanged);
    };
  }, []);

  useEffect(() => {
    const initialLoadingTimer = setTimeout(() => {
      handleLoading();
    }, 2000);
    return () => {
      clearTimeout(initialLoadingTimer);
    };
  }, []);

  return (
    <>
      <ul
        id="parent-container"
        className={`cards ${isBlurVisible ? 'visible' : ''}`}
      >
        <div className={`loader ${isLoading ? 'active' : ''}`}>
          <li className="spacer"></li>
          {items.map(
            (podcast, index) =>
              podcast && (
                <li key={index}>
                  <div className="cover-container">
                    <div className="header-container">
                      <div className="header-content">
                        <div className="podcast-title-container">
                          <h2 className="podcast-title">
                            {textTruncate(podcast.title || 'Unknown Title', 30)}
                          </h2>
                          <StatusIndicator
                            status={podcast.PLAYBACK_STATUS}
                            podcastId={`${podcast.title}-${podcast.episode}`}
                          />
                        </div>
                        <h3 className="podcast-episode">
                          {textTruncate(
                            podcast.episode || 'Unknown Episode',
                            45
                          )}
                        </h3>
                      </div>
                    </div>
                    <div className="cover-mask"></div>
                    <img
                      className="cover"
                      src={podcast.image}
                      alt={podcast.title}
                    />
                    <DraggableInfoCard
                      podcast={podcast}
                      expanded={activeInfoCard === index}
                      setExpanded={setActiveInfoCard}
                    />
                    <div className="player-container">
                      <AudioPlayer
                        src={podcast.mp3}
                        podcastId={podcast.key}
                        handleClick={handleBlurToggle}
                        onEnded={onPodcastEnd}
                      />
                    </div>
                  </div>
                </li>
              )
          )}
          <li className="spacer"></li>
        </div>
      </ul>
      {items.length > 1 && (
        <span className="indicators">
          {items.map((__, index) => (
            <button
              key={index}
              className={`indicator ${
                index === indicatorIndex ? 'active' : ''
              }`}
            ></button>
          ))}
        </span>
      )}
    </>
  );
};

export default Carousel;
