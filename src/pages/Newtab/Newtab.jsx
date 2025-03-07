import React, { useEffect, useState } from 'react';
import { ThemeProvider } from './ThemeProvider.jsx';
import Carousel from './Carousel';
import Overlay from './Overlay.jsx';
import Onboarding from '../Panel/Onboarding.jsx';
import Redirect from './Redirect';
import { StorageService, EVENTS } from '../../utils/storageService';
import '../../root/Root.css';

// Use central event constants from storageService

const Newtab = () => {
  const [onboarding, setOnboarding] = useState(false);
  const [redirect, setRedirect] = useState(false);
  const [isBlurVisible, setIsBlurVisible] = useState(false);

  useEffect(() => {
    console.log('Newtab: Checking tab status for redirect...');
    chrome.tabs.query({ currentWindow: true }, function (tabs) {
      let shouldRedirect = false;
      
      for (let i = 0; i < tabs.length - 1; i++) {
        let tab = tabs[i];
        if (
          tab.pendingUrl === 'chrome://newtab/' ||
          tab.url === 'chrome://newtab/'
        ) {
          console.log('Newtab: Found another newtab, should redirect');
          shouldRedirect = true;
          break;
        }
      }
      
      setRedirect(shouldRedirect);
    });
  }, []); // Add empty dependency array to run only once

  // Check if podcasts exist in storage
  const checkForPodcasts = async () => {
    console.log('Newtab: Checking for podcasts...');
    try {
      // Use the StorageService to get all podcasts
      const podcasts = await StorageService.getAllPodcasts();
      console.log('Newtab: Found', podcasts.length, 'podcasts');
      
      if (podcasts && podcasts.length > 0) {
        console.log('Newtab: Podcasts found, disabling onboarding');
        setOnboarding(false);
      } else {
        console.log('Newtab: No podcasts found, enabling onboarding');
        setOnboarding(true);
      }
    } catch (error) {
      console.error('Newtab: Error checking for podcasts:', error);
      setOnboarding(true);
    }
  };

  // Initial check
  useEffect(() => {
    console.log('Newtab: Initial podcasts check');
    checkForPodcasts();

    // Set up event listeners for updates - but only for collection changes, not playback
    const storageListener = StorageService.addStorageListener((newPodcasts, changes) => {
      console.log('Newtab: Storage updated, podcasts count:', newPodcasts?.length);
      
      // Only update onboarding state if needed - avoid unnecessary re-renders
      if (newPodcasts && newPodcasts.length > 0 && onboarding) {
        console.log('Newtab: Podcasts exist, disabling onboarding');
        setOnboarding(false);
      } else if ((!newPodcasts || newPodcasts.length === 0) && !onboarding) {
        console.log('Newtab: No podcasts exist, enabling onboarding');
        setOnboarding(true);
      }
    });

    // Listen for new storage service events - but filter playback updates
    const newEventListener = StorageService.addEventListener(
      EVENTS.PODCAST_UPDATED,
      (event) => {
        // Skip handling playback updates which happen frequently
        // and shouldn't affect the high-level UI state
        if (event.detail?.action === 'update-playback') {
          return;
        }
        
        console.log('Newtab: Podcast updated event:', event.detail?.action);
        
        if (event.detail?.action === 'add' && onboarding) {
          console.log('Newtab: Podcast added, checking storage...');
          checkForPodcasts();
        } else if (event.detail?.action === 'remove' && event.detail?.remainingCount === 0) {
          console.log('Newtab: All podcasts removed, enabling onboarding');
          setOnboarding(true);
        }
      }
    );

    return () => {
      if (storageListener) storageListener();
      if (newEventListener) newEventListener();
    };
  }, [onboarding]);

  // Move the blur functionality up to Newtab
  const handleBlurToggle = () => {
    setIsBlurVisible((prevIsBlurVisible) => !prevIsBlurVisible);
  };

  const handlePodcastEnd = () => {
    setIsBlurVisible(false);
  };

  // Add useEffect for body no-scroll class
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

  return (
    <ThemeProvider>
      <div>
        {onboarding ? (
          <div>
            <Onboarding onPodcastAdded={() => setOnboarding(false)} />
          </div>
        ) : redirect ? (
          <div>
            <Redirect />
          </div>
        ) : (
          <div className="App">
            <Overlay />
            <Carousel
              isBlurVisible={isBlurVisible}
              handleBlurToggle={handleBlurToggle}
              onPodcastEnd={handlePodcastEnd}
            />
            <div className={`blur ${isBlurVisible ? 'visible' : ''}`}></div>
          </div>
        )}
      </div>
    </ThemeProvider>
  );
};

export default Newtab;
