import { useState, useEffect } from 'react';

const PLAYBACK_STATUS = {
  UNPLAYED: 'UNPLAYED',
  IN_PROGRESS: 'IN_PROGRESS',
  FINISHED: 'FINISHED',
};

const FINISHED_THRESHOLD = 30;

const usePlaybackPosition = (podcastId) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState(PLAYBACK_STATUS.UNPLAYED);
  const [wasFinished, setWasFinished] = useState(false);

  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const result = await chrome.storage.local.get(podcastId);
        if (result[podcastId]) {
          const {
            time,
            status: savedStatus,
            duration: savedDuration,
          } = result[podcastId];

          // Check if the podcast was previously finished
          if (savedStatus === PLAYBACK_STATUS.FINISHED) {
            // Set time to 0 for replay but maintain FINISHED status
            setCurrentTime(0);
            setWasFinished(true);
          } else {
            setCurrentTime(time || 0);
          }

          setStatus(savedStatus || PLAYBACK_STATUS.UNPLAYED);
          setDuration(savedDuration || 0);
        }
      } catch (error) {
        console.error('Error loading playback state:', error);
      }
    };

    loadSavedState();

    // Add storage change listener
    const handleStorageChange = (changes, namespace) => {
      if (namespace === 'local' && changes[podcastId]) {
        const newValue = changes[podcastId].newValue;
        if (newValue) {
          // Only update time if not previously finished or explicitly setting a new time
          if (
            !wasFinished ||
            (newValue.time > 0 &&
              newValue.time < newValue.duration - FINISHED_THRESHOLD)
          ) {
            setCurrentTime(newValue.time || 0);
          }

          setStatus(newValue.status || PLAYBACK_STATUS.UNPLAYED);
          setDuration(newValue.duration || 0);

          // Update wasFinished flag
          if (newValue.status === PLAYBACK_STATUS.FINISHED) {
            setWasFinished(true);
          }
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [podcastId, wasFinished]);

  const updatePlaybackState = async (time, totalDuration) => {
    try {
      let newStatus = status;

      if (time === 0) {
        // If starting from beginning but was previously finished, keep FINISHED status
        newStatus = wasFinished
          ? PLAYBACK_STATUS.FINISHED
          : PLAYBACK_STATUS.UNPLAYED;
      } else if (totalDuration && totalDuration - time <= FINISHED_THRESHOLD) {
        newStatus = PLAYBACK_STATUS.FINISHED;
        setWasFinished(true);
      } else if (time > 0) {
        // When in progress, update status normally
        newStatus = PLAYBACK_STATUS.IN_PROGRESS;
      }

      const newState = {
        time,
        status: newStatus,
        duration: totalDuration,
        lastUpdated: Date.now(),
      };

      await chrome.storage.local.set({ [podcastId]: newState });

      setCurrentTime(time);
      setStatus(newStatus);
      setDuration(totalDuration);
    } catch (error) {
      console.error('Error saving playback state:', error);
    }
  };

  const resetPlaybackState = async () => {
    try {
      await chrome.storage.local.remove(podcastId);
      setCurrentTime(0);
      setStatus(PLAYBACK_STATUS.UNPLAYED);
      setDuration(0);
      setWasFinished(false);
    } catch (error) {
      console.error('Error resetting playback state:', error);
    }
  };

  return {
    currentTime,
    duration,
    status,
    updatePlaybackState,
    resetPlaybackState,
    PLAYBACK_STATUS,
    wasFinished,
  };
};

export default usePlaybackPosition;
