// usePodcastPlayback.js - Updated to work with unified storage
import { useState, useEffect, useCallback } from 'react';
import { usePodcastStore } from './usePodcastStore';

<<<<<<< Updated upstream:src/hooks/usePlaybackPosition.js
const usePlaybackPosition = (podcastId) => {
=======
const usePodcastPlayback = (podcastId) => {
  const {
    podcasts,
    PLAYBACK_STATUS,
    updatePlaybackState: updateStore,
    resetPlaybackState: resetStore,
    getPodcastPlayback,
  } = usePodcastStore();

>>>>>>> Stashed changes:src/hooks/usePodcastPlayback.js
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState(PLAYBACK_STATUS.UNPLAYED);
  const [wasFinished, setWasFinished] = useState(false);

  useEffect(() => {
    const loadPlaybackState = () => {
      const playback = getPodcastPlayback(podcastId);

<<<<<<< Updated upstream:src/hooks/usePlaybackPosition.js
          // Check if the podcast was previously finished
          if (savedStatus === PLAYBACK_STATUS.FINISHED) {
            // Set time to 0 for replay but maintain FINISHED status
            setCurrentTime(0);
            setWasFinished(true);
          } else {
            setCurrentTime(time || 0);
          }
=======
      if (playback.status === PLAYBACK_STATUS.FINISHED) {
        setCurrentTime(0);
        setWasFinished(true);
      } else {
        setCurrentTime(playback.currentTime || 0);
      }
>>>>>>> Stashed changes:src/hooks/usePodcastPlayback.js

      setStatus(playback.status || PLAYBACK_STATUS.UNPLAYED);
      setDuration(playback.duration || 0);
    };

    loadPlaybackState();

    // Listen for podcast storage updates
    const handleStorageUpdate = (event) => {
      if (
        event.detail.action === 'playback-update' ||
        event.detail.action === 'playback-reset'
      ) {
        loadPlaybackState();
      }
    };

<<<<<<< Updated upstream:src/hooks/usePlaybackPosition.js
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
=======
    window.addEventListener('podcast-storage-updated', handleStorageUpdate);
>>>>>>> Stashed changes:src/hooks/usePodcastPlayback.js

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener(
        'podcast-storage-updated',
        handleStorageUpdate
      );
    };
  }, [podcastId, PLAYBACK_STATUS, getPodcastPlayback]);

  const updatePlaybackState = useCallback(
    async (time, totalDuration) => {
      await updateStore(podcastId, time, totalDuration);

<<<<<<< Updated upstream:src/hooks/usePlaybackPosition.js
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
=======
      // Update local state
      if (totalDuration && totalDuration - time <= 30) {
        setWasFinished(true);
>>>>>>> Stashed changes:src/hooks/usePodcastPlayback.js
      }

      setCurrentTime(time);
      setDuration(totalDuration);

      // Update status based on the new time
      if (time === 0) {
        setStatus(
          wasFinished ? PLAYBACK_STATUS.FINISHED : PLAYBACK_STATUS.UNPLAYED
        );
      } else if (totalDuration && totalDuration - time <= 30) {
        setStatus(PLAYBACK_STATUS.FINISHED);
      } else if (time > 0) {
        setStatus(PLAYBACK_STATUS.IN_PROGRESS);
      }
    },
    [podcastId, updateStore, wasFinished, PLAYBACK_STATUS]
  );

  const resetPlaybackState = useCallback(async () => {
    await resetStore(podcastId);
    setCurrentTime(0);
    setStatus(PLAYBACK_STATUS.UNPLAYED);
    setDuration(0);
    setWasFinished(false);
  }, [podcastId, resetStore, PLAYBACK_STATUS]);

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
