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
  const [podcastFeedItems, setPodcastFeedItems] = useState([]);

  const { scrollPosition, indicatorIndex } = useScrollPosition(
    'parent-container',
    items.length
  );

  const handleLoading = () => {
    setIsLoadingActive(false);
  };

  // Function to fetch and parse RSS feeds for each podcast
  const fetchPodcastContent = async (podcasts) => {
    if (!podcasts || podcasts.length === 0) {
      setPodcastFeedItems([]);
      setItems([]);
      setIsLoadingActive(false);
      return;
    }

    setIsLoadingActive(true);
    console.log('Fetching podcast content for', podcasts.length, 'podcasts');

    try {
      // Get URLs from the podcast entries
      const urls = podcasts.map(podcast => podcast.url || podcast.text);
      
      // Safety check - make sure we have valid URLs
      if (urls.filter(url => url).length === 0) {
        console.error('No valid URLs found in podcasts array:', podcasts);
        setIsLoadingActive(false);
        return;
      }

      // Fetch and parse each RSS feed
      const results = await Promise.all(
        podcasts.map(async (podcast, index) => {
          const url = podcast.url || podcast.text;
          if (!url) {
            console.error('No URL found for podcast:', podcast);
            return null;
          }
          
          try {
            const response = await fetch(url);
            if (!response.ok) {
              console.error(`Error fetching podcast at ${url}: ${response.status} ${response.statusText}`);
              // Return a minimal podcast object with the data we already have
              return {
                title: podcast.title || podcast.podcastName || 'Unknown Podcast',
                episode: 'Unable to load episode',
                mp3: null,
                image: podcast.artwork || podcast.artworkUrl,
                key: podcast.id || podcast.key,
                podcastId: podcast.id || podcast.key,
                originalUrl: url,
                error: true,
                errorMessage: `Failed to load podcast feed: ${response.status} ${response.statusText}`
              };
            }
            
            const text = await response.text();
            const parsedItem = parseRss(text);
            
            if (parsedItem) {
              // Add podcast collection item data to the parsed RSS feed
              return {
                ...parsedItem,
                title: parsedItem.title || podcast.title || podcast.podcastName,
                key: podcast.id || podcast.key,
                podcastId: podcast.id || podcast.key,
                originalUrl: url,
                playbackStatus: podcast.playbackStatus || podcast.playback?.status,
                error: false
              };
            }
            
            // Return a minimal podcast object if parsing failed
            return {
              title: podcast.title || podcast.podcastName || 'Unknown Podcast',
              episode: 'Unable to parse episode',
              mp3: null,
              image: podcast.artwork || podcast.artworkUrl,
              key: podcast.id || podcast.key,
              podcastId: podcast.id || podcast.key,
              originalUrl: url,
              error: true,
              errorMessage: 'Failed to parse podcast feed'
            };
          } catch (error) {
            console.error(`Error fetching podcast at ${url}:`, error);
            // Return a minimal podcast object with the data we already have
            return {
              title: podcast.title || podcast.podcastName || 'Unknown Podcast',
              episode: 'Unable to load episode',
              mp3: null,
              image: podcast.artwork || podcast.artworkUrl,
              key: podcast.id || podcast.key,
              podcastId: podcast.id || podcast.key,
              originalUrl: url,
              error: true,
              errorMessage: error.message
            };
          }
        })
      );

      console.log('Fetched podcast content results:', results);

      // Filter out any complete failures (should be rare now with our fallbacks)
      const validResults = results.filter(item => item !== null);
      setPodcastFeedItems(validResults);
      setItems(validResults);
      
    } catch (error) {
      console.error('Error in fetchPodcastContent:', error);
    } finally {
      setTimeout(() => setIsLoadingActive(false), 500);
    }
  };

  // Load podcasts from storage and fetch their content
  const loadPodcasts = async () => {
    try {
      // Get podcasts from the centralized storage
      const podcasts = await StorageService.getAllPodcasts();
      
      // Fetch and parse the RSS content for each podcast
      fetchPodcastContent(podcasts);
    } catch (error) {
      console.error('Error loading podcasts:', error);
      setIsLoadingActive(false);
    }
  };

  useEffect(() => {
    // Initial load
    loadPodcasts();

    // Set up listeners for updates - with performance optimizations
    const storageListener = StorageService.addStorageListener(() => {
      console.log('Storage updated - refreshing podcasts in Carousel');
      // Only reload on collection changes (handled by the storage listener)
      loadPodcasts();
    });

    const eventListener = StorageService.addEventListener(
      EVENTS.PODCAST_UPDATED,
      (event) => {
        // Playback updates shouldn't trigger a full reload of all podcasts
        if (event.detail?.action === 'update-playback' || event.detail?.silent) {
          console.log('Carousel: Ignoring playback update for efficiency');
          return;
        }
        
        console.log('Podcast updated event received in Carousel:', event.detail?.action);
        loadPodcasts();
      }
    );

    return () => {
      // Clean up all listeners
      if (storageListener) storageListener();
      if (eventListener) eventListener();
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
                <li key={podcast.key || podcast.podcastId || index}>
                  <div className="cover-container">
                    <div className="header-container">
                      <div className="header-content">
                        <div className="podcast-title-container">
                          <h2 className="podcast-title">
                            {textTruncate(podcast.title || 'Unknown Title', 30)}
                          </h2>
                          <StatusIndicator
                            status={podcast.playbackStatus || podcast.PLAYBACK_STATUS}
                            podcastId={podcast.key || podcast.podcastId}
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
                      {podcast.error ? (
                        <div className="error-message">
                          Unable to load podcast audio. Try refreshing.
                        </div>
                      ) : (
                        <AudioPlayer
                          src={podcast.mp3}
                          podcastId={podcast.key || podcast.podcastId}
                          title={podcast.title}
                          podcastName={podcast.title}
                          handleClick={handleBlurToggle}
                          onEnded={onPodcastEnd}
                        />
                      )}
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
