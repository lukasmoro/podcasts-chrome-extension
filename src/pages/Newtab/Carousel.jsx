// Carousel.jsx - Updated to work with unified storage
import React, { useEffect, useState, useRef } from 'react';
import AudioPlayer from './AudioPlayer.jsx';
import StatusIndicator from './StatusIndicator.jsx';
import DraggableInfoCard from './DraggableInfoCard.jsx';
import Overlay from './Overlay.jsx';
import { parseRss } from '../../utils/rssParser';
import { textTruncate } from '../../utils/textTruncate.js';
import useScrollPosition from '../../hooks/useScrollPosition';
import { usePodcastStore } from '../../hooks/usePodcastStore';
import './Carousel.css';

<<<<<<< Updated upstream
const Carousel = () => {
=======
const PODCAST_UPDATED_EVENT = 'podcast-storage-updated';

const Carousel = ({ isBlurVisible, handleBlurToggle, onPodcastEnd }) => {
  const { podcasts, isLoaded } = usePodcastStore();
>>>>>>> Stashed changes
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoadingActive] = useState(true);
  const [isBlurVisible, setIsBlurVisible] = useState(false);
  const [activeInfoCard, setActiveInfoCard] = useState(null);
  const isMountedRef = useRef(true);

  const { scrollPosition, indicatorIndex } = useScrollPosition(
    'parent-container',
    items.length
  );

  const handleClick = () => {
    setIsBlurVisible((prevIsBlurVisible) => !prevIsBlurVisible);
  };

  const handlePodcastEnd = () => {
    setIsBlurVisible(false);
  };

  const handleLoading = () => {
    if (isMountedRef.current) {
      setIsLoadingActive(false);
    }
  };

<<<<<<< Updated upstream
  useEffect(() => {
    if (isBlurVisible) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }

    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [isBlurVisible]);

  useEffect(() => {
    chrome.storage.local.get(['latestPodcasts', 'newUrls'], (items) => {
      if (items.latestPodcasts && items.latestPodcasts.length > 0) {
        setItems(items.latestPodcasts);
      } else if (items.newUrls) {
        const newUrls = items.newUrls.map((newUrl) => newUrl.text);
        Promise.all(newUrls.map((url) => fetch(url)))
          .then((responses) => Promise.all(responses.map((r) => r.text())))
          .then((xmlStrings) => {
            const firstPodcasts = xmlStrings.map(parseRss);
            setItems(firstPodcasts);
          })
          .catch((error) => console.error(error));
      }
    });
  }, []);

  useEffect(() => {
    const loadingTimer = setTimeout(() => {
=======
  const loadPodcasts = async () => {
    if (!isMountedRef.current) return;

    setIsLoadingActive(true);

    try {
      if (podcasts && podcasts.length > 0) {
        // Get latest podcasts from unified storage
        const podcastUrls = podcasts.map((podcast) => podcast.feedUrl);

        // Fetch and parse RSS feeds
        const responses = await Promise.all(
          podcastUrls.map((url) => fetch(url))
        );
        const xmlStrings = await Promise.all(responses.map((r) => r.text()));

        // Parse RSS data
        const parsedPodcasts = xmlStrings.map((xml, index) => {
          const parsed = parseRss(xml);
          // Add podcast ID from our unified store
          return {
            ...parsed,
            podcastId: podcasts[index].id,
            // Add playback status for status indicator
            PLAYBACK_STATUS: podcasts[index].playback?.status,
          };
        });

        if (isMountedRef.current) {
          setItems(parsedPodcasts);
          setTimeout(() => {
            if (isMountedRef.current) {
              setIsLoadingActive(false);
            }
          }, 500);
        }
      } else {
        if (isMountedRef.current) {
          setItems([]);
          setIsLoadingActive(false);
        }
      }
    } catch (error) {
      console.error('Error fetching podcast feeds:', error);
      if (isMountedRef.current) {
        setIsLoadingActive(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;

    if (isLoaded) {
      loadPodcasts();
    }

    const handlePodcastUpdated = (event) => {
      console.log('Podcast storage updated:', event.detail?.action);
      if (isMountedRef.current) {
        loadPodcasts();
      }
    };

    window.addEventListener(PODCAST_UPDATED_EVENT, handlePodcastUpdated);

    const initialLoadingTimer = setTimeout(() => {
>>>>>>> Stashed changes
      handleLoading();
    }, 2000);

    return () => {
<<<<<<< Updated upstream
      clearTimeout(loadingTimer);
=======
      isMountedRef.current = false;
      window.removeEventListener(PODCAST_UPDATED_EVENT, handlePodcastUpdated);
      clearTimeout(initialLoadingTimer);
>>>>>>> Stashed changes
    };
  }, [isLoaded, podcasts]);

  return (
    <div className="App">
      <ul
        id="parent-container"
        className={`cards ${isBlurVisible ? 'visible' : ''}`}
      >
        <Overlay />
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
                          <StatusIndicator podcastId={podcast.podcastId} />
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
<<<<<<< Updated upstream
                        podcastId={`${podcast.title}-${podcast.episode}`}
                        handleClick={handleClick}
                        onEnded={handlePodcastEnd}
=======
                        podcastId={podcast.podcastId}
                        title={podcast.title}
                        handleClick={handleBlurToggle}
                        onEnded={onPodcastEnd}
>>>>>>> Stashed changes
                      />
                    </div>
                  </div>
                </li>
              )
          )}
          <div className={`blur ${isBlurVisible ? 'visible' : ''}`}></div>
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
    </div>
  );
};

export default Carousel;
