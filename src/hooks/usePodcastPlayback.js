import { useState, useEffect } from 'react';
import { StorageService, EVENTS } from '../utils/storageService';

const PLAYBACK_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  UNPLAYED: 'UNPLAYED',
  IN_PROGRESS: 'IN_PROGRESS',
  FINISHED: 'FINISHED',
};

const FINISHED_THRESHOLD = 30;

const usePodcastPlayback = (podcastId) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState(PLAYBACK_STATUS.NOT_STARTED);
  const [wasFinished, setWasFinished] = useState(false);

  useEffect(() => {
    let unsubscribeStorage = null;
    let unsubscribeEvents = null;

    const loadPlaybackState = async () => {
      try {
        // First try to get the podcast info from the centralized storage
        const podcast = await StorageService.getPodcast(podcastId);

        if (podcast && podcast.playback) {
          // Use the playback data from the podcast object
          const playback = podcast.playback;

          if (playback.status === PLAYBACK_STATUS.FINISHED) {
            setCurrentTime(0);
            setWasFinished(true);
          } else {
            setCurrentTime(playback.currentTime || 0);
          }

          setStatus(playback.status || PLAYBACK_STATUS.NOT_STARTED);
          setDuration(playback.duration || 0);
        } else {
          // No playback data found, set default state
          setCurrentTime(0);
          setStatus(PLAYBACK_STATUS.NOT_STARTED);
          setDuration(0);
          setWasFinished(false);
        }
      } catch (error) {
        console.error('Error loading playback state:', error);
      }
    };

    loadPlaybackState();

    // Listen for Storage updates
    unsubscribeStorage = StorageService.addStorageListener(() => {
      loadPlaybackState();
    });

    // Listen for centralized playback events
    unsubscribeEvents = StorageService.addEventListener(
      EVENTS.PLAYBACK_UPDATED,
      (event) => {
        if (event.detail && event.detail.podcastId === podcastId) {
          const { playbackState } = event.detail;

          if (playbackState) {
            if (
              !wasFinished ||
              (playbackState.time > 0 &&
                playbackState.time <
                  playbackState.duration - FINISHED_THRESHOLD)
            ) {
              setCurrentTime(playbackState.time || 0);
            }

            setStatus(playbackState.status || PLAYBACK_STATUS.NOT_STARTED);
            setDuration(playbackState.duration || 0);

            if (playbackState.status === PLAYBACK_STATUS.FINISHED) {
              setWasFinished(true);
            }
          }
        }
      }
    );

    return () => {
      if (unsubscribeStorage) unsubscribeStorage();
      if (unsubscribeEvents) unsubscribeEvents();
    };
  }, [podcastId, wasFinished]);

  const updatePlaybackState = async (time, totalDuration) => {
    try {
      let newStatus = status;

      if (time === 0) {
        newStatus = wasFinished
          ? PLAYBACK_STATUS.FINISHED
          : PLAYBACK_STATUS.UNPLAYED;
      } else if (totalDuration && totalDuration - time <= FINISHED_THRESHOLD) {
        newStatus = PLAYBACK_STATUS.FINISHED;
        setWasFinished(true);
      } else if (time > 0) {
        newStatus = PLAYBACK_STATUS.IN_PROGRESS;
      }

      // Use the centralized storage service
      await StorageService.updatePlayback(podcastId, {
        currentTime: time,
        duration: totalDuration,
        status: newStatus,
      });

      // Update local state
      setCurrentTime(time);
      setStatus(newStatus);
      setDuration(totalDuration);
    } catch (error) {
      console.error('Error saving playback state:', error);
    }
  };

  const resetPlaybackState = async () => {
    try {
      // Use the centralized storage service
      await StorageService.updatePlayback(podcastId, {
        currentTime: 0,
        duration: 0,
        status: PLAYBACK_STATUS.NOT_STARTED,
      });

      // Update local state
      setCurrentTime(0);
      setStatus(PLAYBACK_STATUS.NOT_STARTED);
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

export default usePodcastPlayback;
