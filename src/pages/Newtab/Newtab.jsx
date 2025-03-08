import React, { useEffect, useState } from 'react';
import { ThemeProvider } from './ThemeProvider.jsx';
import Carousel from './Carousel';
import Overlay from './Overlay.jsx';
import Onboarding from '../Panel/Onboarding.jsx';
import Redirect from './Redirect';
import { StorageService } from '../../utils/storageService';
import '../../root/Root.css';

const Newtab = () => {
  const [onboarding, setOnboarding] = useState(false);
  const [redirect, setRedirect] = useState(false);
  const [isBlurVisible, setIsBlurVisible] = useState(false);

  // runs once & checks for other open newtabs
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
  }, []);

  // check if podcasts exist in storage
  const checkForPodcasts = async () => {
    try {
      const podcasts = await StorageService.getAllPodcasts();
      if (podcasts && podcasts.length > 0) {
        setOnboarding(false);
      } else {
        setOnboarding(true);
      }
    } catch (error) {
      setOnboarding(true);
    }
  };

  // Initial check
  useEffect(() => {
    checkForPodcasts();
    const storageListener = StorageService.addStorageListener(
      (newPodcasts, changes) => {
        if (newPodcasts && newPodcasts.length > 0 && onboarding) {
          setOnboarding(false);
        } else if ((!newPodcasts || newPodcasts.length === 0) && !onboarding) {
          setOnboarding(true);
        }
      }
    );

    return () => {
      if (storageListener) storageListener();
    };
  }, [onboarding]);

  const handleBlurToggle = () => {
    setIsBlurVisible((prevIsBlurVisible) => !prevIsBlurVisible);
  };

  const handlePodcastEnd = () => {
    setIsBlurVisible(false);
  };

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
