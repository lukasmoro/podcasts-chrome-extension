import React, { useState, useRef, useEffect } from 'react';
import { animated } from '@react-spring/web';
import { useSpring } from '@react-spring/core';
import './AudioPlayer.css';
import BehaviourClick from './BehaviourClick.jsx';
import usePodcastPlayback from '../../hooks/usePodcastPlayback.js';
import { usePodcastData } from '../../hooks/usePodcastData.js';
import { PlayIcon } from '../Icons/PlayIcon';
import { PauseIcon } from '../Icons/PauseIcon';
import { trackButtonClick } from '../../utils/googleAnalytics';

const AudioPlayer = (props) => {
  // AudioPlayer local state
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Hook for playback state management
  const {
    currentTime: savedTime,
    duration: savedDuration,
    status,
    updatePlaybackState,
    PLAYBACK_STATUS,
    wasFinished,
  } = usePodcastPlayback(props.podcastId);

  // Hook for podcast collection management
  const { handleUpdatePlayback } = usePodcastData();

  // Refs for DOM elements and tracking
  const audioPlayer = useRef();
  const progressBar = useRef();
  // Removed unused animationRef
  const lastUpdateTimeRef = useRef(0);

  // Spring animation for player controls
  const [springs, api] = useSpring(() => ({
    from: { opacity: 0, y: 0 },
    to: { opacity: isPlaying ? 1 : 0, y: isPlaying ? 50 : 0 },
    config: { tension: 280, friction: 60 },
  }));

  // Initialize player with saved playback state
  useEffect(() => {
    if (!isInitialized && audioPlayer.current) {
      const timeToSet = status === PLAYBACK_STATUS.FINISHED ? 0 : savedTime;

      if (
        (timeToSet > 0 || status === PLAYBACK_STATUS.FINISHED) &&
        savedDuration > 0
      ) {
        setCurrentTime(timeToSet);

        if (progressBar.current) {
          progressBar.current.max = savedDuration;
          setDuration(savedDuration);
          progressBar.current.value = timeToSet;
          const percentage = (timeToSet / savedDuration) * 100;
          const validPercentage = isFinite(percentage) ? percentage : 0;
          progressBar.current.style.setProperty(
            '--seek-before-width',
            `${validPercentage}%`
          );
        }
      }
    }
  }, [savedTime, savedDuration, isInitialized, status, PLAYBACK_STATUS]);

  // Handle audio metadata loading
  useEffect(() => {
    const audio = audioPlayer.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      const audioDuration = audio.duration;
      if (isNaN(audioDuration) || !isFinite(audioDuration)) return;
      setDuration(audioDuration);

      if (progressBar.current) {
        progressBar.current.max = audioDuration;
      }

      if (status === PLAYBACK_STATUS.FINISHED && !isInitialized) {
        audio.currentTime = 0;

        if (progressBar.current) {
          progressBar.current.value = 0;
          progressBar.current.style.setProperty('--seek-before-width', '0%');
        }

        setCurrentTime(0);
        setIsInitialized(true);
      } else if (!isInitialized && savedTime > 0 && savedTime < audioDuration) {
        audio.currentTime = savedTime;

        if (progressBar.current) {
          progressBar.current.value = savedTime;
          const percentage = (savedTime / audioDuration) * 100;
          progressBar.current.style.setProperty(
            '--seek-before-width',
            `${percentage}%`
          );
        }
        setCurrentTime(savedTime);
        setIsInitialized(true);
      } else if (!isInitialized) {
        setIsInitialized(true);
      }
    };
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    if (audio.readyState >= 2) {
      handleLoadedMetadata();
    }
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [savedTime, isInitialized, status, PLAYBACK_STATUS]);

  // Handle continuous playback updates
  useEffect(() => {
    const audio = audioPlayer.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const currentValue = audio.currentTime;
      const audioDuration = audio.duration;

      setCurrentTime(currentValue);

      if (progressBar.current && isFinite(audioDuration) && audioDuration > 0) {
        progressBar.current.value = currentValue;

        const percentage = (currentValue / audioDuration) * 100;

        const minVisibleWidth =
          currentValue > 0 ? Math.max(percentage, 0.5) : 0;

        const rightRadius = percentage >= 66.67 ? '3.5px' : '0px';
        progressBar.current.style.setProperty('--right-radius', rightRadius);

        const widthAdjust = percentage >= 66.67 ? '0px' : '1px';
        progressBar.current.style.setProperty('--width-adjust', widthAdjust);

        progressBar.current.style.setProperty(
          '--seek-before-width',
          `${minVisibleWidth}%`
        );
      }

      // Update storage much less frequently during playback - every 5 seconds is sufficient
      // The storage service also has additional debouncing for these updates
      const now = Date.now();
      if (now - lastUpdateTimeRef.current > 5000) {  // Increased from 1s to 5s
        lastUpdateTimeRef.current = now;
        
        // Only update if playing and not already finished
        if (isPlaying && status !== PLAYBACK_STATUS.FINISHED) {
          // Use only one update method during regular playback
          // The storage service will handle both storage locations and additional debouncing
          updatePlaybackState(currentValue, audioDuration);
        }
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      lastUpdateTimeRef.current = 0; // Reset this ref on cleanup
    };
  }, [updatePlaybackState, props.podcastId, isPlaying, status, PLAYBACK_STATUS]);

  // Handle play/pause/ended events
  useEffect(() => {
    const audio = audioPlayer.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);

      api.start({
        to: {
          opacity: 1,
          y: 50,
        },
      }).catch(err => console.error('Animation error:', err));

      trackButtonClick('audio_play', {
        podcast_id: props.podcastId,
        podcast_title: props.title || props.podcastName || 'Unknown',
        playback_position: audio.currentTime,
      }).catch((err) => console.error('Error tracking play event:', err));
    };

    const handlePause = () => {
      setIsPlaying(false);

      api.start({
        to: {
          opacity: 0,
          y: 0,
        },
      }).catch(err => console.error('Animation error:', err));

      if (audio.currentTime && audio.duration) {
        // Use only the primary update method for important state changes
        // This will coordinate storage updates and event broadcasting
        const status = audio.currentTime >= audio.duration ? 'FINISHED' : 'IN_PROGRESS';
        updatePlaybackState(audio.currentTime, audio.duration);
      }

      trackButtonClick('audio_pause', {
        podcast_id: props.podcastId,
        podcast_title: props.title || props.podcastName || 'Unknown',
        playback_position: audio.currentTime,
        duration_played: audio.currentTime,
      }).catch((err) => console.error('Error tracking pause event:', err));
    };

    const handleEnded = () => {
      setIsPlaying(false);

      api.start({
        to: {
          opacity: 0,
          y: 0,
        },
      }).catch(err => console.error('Animation error:', err));

      // Add a check to prevent duplicate finished state updates
      if (audio.duration && status !== PLAYBACK_STATUS.FINISHED) {
        // Use only the primary update method for the finished state
        // This is an important state change that should be persisted immediately
        updatePlaybackState(audio.duration, audio.duration);
      }

      trackButtonClick('audio_completed', {
        podcast_id: props.podcastId,
        podcast_title: props.title || props.podcastName || 'Unknown',
        duration: audio.duration,
      }).catch((err) => console.error('Error tracking completion event:', err));

      if (props.onEnded) {
        props.onEnded();
      }
    };

    const handleDurationChange = () => {
      if (audio.duration && isFinite(audio.duration)) {
        const seconds = Math.floor(audio.duration);
        setDuration(seconds);
        if (progressBar.current) {
          progressBar.current.max = seconds;
        }
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('durationchange', handleDurationChange);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('durationchange', handleDurationChange);

      // Save current state on unmount
      if (audio.currentTime && audio.duration) {
        // Use only one update method to prevent duplicate updates
        const status = audio.currentTime >= audio.duration ? 'FINISHED' : 'IN_PROGRESS';
        updatePlaybackState(audio.currentTime, audio.duration);
      }
    };
  }, [
    updatePlaybackState,
    props.onEnded,
    api,
    props.podcastId,
    props.title,
    status,
    PLAYBACK_STATUS,
  ]);

  // Play/pause toggle handler
  const togglePlayPause = () => {
    if (!audioPlayer.current) return;

    if (!isPlaying) {
      audioPlayer.current.play().catch((err) => {
        console.error('Error playing audio:', err);
        if (typeof trackError === 'function') {
          trackError(err).catch((trackErr) =>
            console.error('Error tracking error event:', trackErr)
          );
        }
      });
    } else {
      audioPlayer.current.pause();
    }
  };

  // Progress bar change handler
  const changeRange = () => {
    if (!audioPlayer.current || !progressBar.current) return;

    const newTime = Number(progressBar.current.value);
    if (isNaN(newTime)) return;

    audioPlayer.current.currentTime = newTime;
    setCurrentTime(newTime);

    if (audioPlayer.current.duration && progressBar.current) {
      const percentage = (newTime / audioPlayer.current.duration) * 100;
      progressBar.current.style.setProperty(
        '--seek-before-width',
        `${percentage}%`
      );
    }

    if (audioPlayer.current.duration) {
      // User-initiated seek - this is an important playback event that should be persisted promptly
      const status = newTime >= audioPlayer.current.duration ? 'FINISHED' : 'IN_PROGRESS';
      updatePlaybackState(newTime, audioPlayer.current.duration);
    }

    trackButtonClick('audio_seek', {
      podcast_id: props.podcastId,
      podcast_title: props.title || props.podcastName || 'Unknown',
      seek_position: newTime,
      seek_percentage: audioPlayer.current.duration
        ? Math.round((newTime / audioPlayer.current.duration) * 100)
        : 0,
    }).catch((err) => console.error('Error tracking seek event:', err));
  };

  // Format time display
  const calculateTime = (secs) => {
    if (!isFinite(secs) || secs < 0) return '00:00';
    const timeInSeconds = Number(secs);
    const minutes = Math.floor(timeInSeconds / 60);
    const returnedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const seconds = Math.floor(timeInSeconds % 60);
    const returnedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
    return `${returnedMinutes}:${returnedSeconds}`;
  };

  return (
    <div className="audio-player">
      <div className="player-container">
        <audio ref={audioPlayer} src={props.src} preload="metadata" />
        <div className="button">
          <BehaviourClick>
            <button
              className="play-pause"
              onClick={() => {
                togglePlayPause();
                if (props.handleClick) props.handleClick();
              }}
            >
              {isPlaying ? (
                <PauseIcon className="player-icon" />
              ) : (
                <PlayIcon className="player-icon" />
              )}
            </button>
          </BehaviourClick>
        </div>
        <animated.div style={springs} className="progress-container">
          <div className="current-time">{calculateTime(currentTime)}</div>
          <div className="progress-bar-wrapper">
            <input
              className="progress-bar"
              type="range"
              defaultValue="0"
              ref={progressBar}
              onChange={changeRange}
              onInput={changeRange}
            />
          </div>
          <div className="duration">
            {duration && isFinite(duration) ? calculateTime(duration) : '00:00'}
          </div>
        </animated.div>
      </div>
    </div>
  );
};

export default AudioPlayer;
