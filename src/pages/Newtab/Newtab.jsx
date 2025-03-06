// Newtab.jsx - Updated to work with unified storage
import React, { useEffect, useState } from 'react';
import { ThemeProvider } from './ThemeProvider.jsx';
import Carousel from './Carousel';
import Onboarding from '../Panel/Onboarding.jsx';
import Redirect from './Redirect';
import { usePodcastStore } from '../../hooks/usePodcastStore';
import '../../root/Root.css';

<<<<<<< Updated upstream
=======
// Import the same event constant used in usePodcastStore
const PODCAST_UPDATED_EVENT = 'podcast-storage-updated';

>>>>>>> Stashed changes
const Newtab = () => {
  const [onboarding, setOnboarding] = useState(false);
  const [redirect, setRedirect] = useState(false);

  // Use the unified podcast store
  const { podcasts, isLoaded } = usePodcastStore();

  useEffect(() => {
    chrome.tabs.query({ currentWindow: true }, function (tabs) {
      for (let i = 0; i < tabs.length - 1; i++) {
        let tab = tabs[i];
        if (
          tab.pendingUrl === 'chrome://newtab/' ||
          tab.url === 'chrome://newtab/'
        ) {
          setRedirect(true);
        } else {
          setRedirect(false);
        }
      }
    });
  });

<<<<<<< Updated upstream
  useEffect(() => {
    chrome.storage.local.get(['newUrls'], (item, key) => {
      const checker = item.newUrls.length;
      if (checker === 0) {
        setOnboarding(true);
      }
    });
  }, []);
=======
  // Check for podcasts using our unified store's data
  useEffect(() => {
    if (isLoaded) {
      if (podcasts && podcasts.length > 0) {
        setOnboarding(false);
      } else {
        setOnboarding(true);
      }
    }
  }, [podcasts, isLoaded]);

  // Listen for podcast updates to automatically switch to Carousel
  useEffect(() => {
    const handlePodcastUpdated = (event) => {
      console.log('Podcast storage updated in Newtab:', event.detail?.action);

      // If a podcast was added and we're in onboarding, switch to carousel
      if (event.detail?.action === 'add' && onboarding) {
        setOnboarding(false);
      }
    };

    // Listen for custom events
    window.addEventListener(PODCAST_UPDATED_EVENT, handlePodcastUpdated);

    return () => {
      window.removeEventListener(PODCAST_UPDATED_EVENT, handlePodcastUpdated);
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
>>>>>>> Stashed changes

  // Don't render until we've loaded podcast data
  if (!isLoaded) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <ThemeProvider>
      <div>
        {onboarding ? (
          <div>
            <Onboarding />
          </div>
        ) : redirect ? (
          <div>
            <Redirect />
          </div>
        ) : (
          <Carousel />
        )}
      </div>
    </ThemeProvider>
  );
};

export default Newtab;
