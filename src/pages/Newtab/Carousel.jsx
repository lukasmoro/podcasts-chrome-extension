import React, { useEffect, useState } from 'react';
import AudioPlayer from './AudioPlayer.jsx';
import StatusIndicator from './StatusIndicator.jsx';
import DraggableInfoCard from './DraggableInfoCard.jsx';
import { parseRss } from '../../utils/rssParser';
import { textTruncate } from '../../utils/textTruncate.js';
import useScrollPosition from '../../hooks/useScrollPosition';
import { StorageService, EVENTS } from '../../utils/storageService';
import './Carousel.css';

const Carousel = ({ isBlurVisible, handleBlurToggle, onPodcastEnd }) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoadingActive] = useState(true);
  const [activeInfoCard, setActiveInfoCard] = useState(null);

  // scroll position hook for indicators
  const { scrollPosition, indicatorIndex } = useScrollPosition(
    'parent-container',
    items.length
  );

  // fetch mp3 & episode name of podcast item
  const fetchEpisode = async (podcasts) => {
    if (!podcasts || podcasts.length === 0) {
      setItems([]);
      setIsLoadingActive(false);
      return;
    }
    setIsLoadingActive(true);
    try {
      const results = await Promise.all(
        podcasts.map(async (podcast) => {
          const url = podcast.url;
          try {
            const response = await fetch(url);
            if (!response.ok) {
              console.error(
                `Error fetching podcast at ${url}: ${response.status} ${response.statusText}`
              );
              return {
                episode: 'Unable to load episode',
                mp3: null,
              };
            }
            const text = await response.text();
            const parsedItem = parseRss(text);
            if (parsedItem) {
              return {
                ...parsedItem,
                title: parsedItem.title || podcast.title,
                podcastId: podcast.id,
              };
            }
          } catch (error) {
            console.error(`Error fetching podcast at ${url}:`, error);
          }
        })
      );
      const validResults = results.filter((item) => item !== null);
      setItems(validResults);
    } finally {
      setTimeout(() => setIsLoadingActive(false), 500);
    }
  };

  // load podcast items & fetch episode
  const loadPodcasts = async () => {
    try {
      const podcasts = await StorageService.getAllPodcasts();
      fetchEpisode(podcasts);
    } catch (error) {
      setIsLoadingActive(false);
    }
  };

  // initial loading & event listeners to trigger updates
  useEffect(() => {
    loadPodcasts();
    const storageListener = StorageService.addStorageListener(
      (newPodcasts, changes) => {
        const isPodcastsCollectionChange =
          changes && Object.keys(changes).some((key) => key === 'podcasts');
        if (isPodcastsCollectionChange) {
          loadPodcasts();
        }
      }
    );
    const eventListener = StorageService.addEventListener(
      EVENTS.PODCAST_UPDATED,
      (event) => {
        if (
          event.detail?.action === 'update-playback' ||
          event.detail?.silent
        ) {
          return;
        }
        loadPodcasts();
      }
    );
    return () => {
      if (storageListener) storageListener();
      if (eventListener) eventListener();
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
                <li key={podcast.podcastId || index}>
                  <div className="cover-container">
                    <div className="header-container">
                      <div className="header-content">
                        <div className="podcast-title-container">
                          <h2 className="podcast-title">
                            {textTruncate(podcast.title || 'Unknown Title', 30)}
                          </h2>
                          <StatusIndicator
                            status={podcast.playbackStatus}
                            podcastId={podcast.podcastId}
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
                        podcastId={podcast.podcastId}
                        title={podcast.title}
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
