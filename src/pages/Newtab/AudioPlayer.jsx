import React, { useState, useRef, useEffect } from 'react';
import { animated } from '@react-spring/web';
import { useSpring } from '@react-spring/core';
import './AudioPlayer.css';
import BehaviourClick from './BehaviourClick.jsx';
import usePlaybackPosition from '../../hooks/usePlaybackPosition.js';
import Play from '../../assets/img/play.fill.svg';
import Pause from '../../assets/img/pause.fill.svg';

const AudioPlayer = (props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    currentTime: savedTime,
    duration: savedDuration,
    status,
    updatePlaybackState,
    PLAYBACK_STATUS,
    wasFinished,
  } = usePlaybackPosition(props.podcastId);

  const audioPlayer = useRef();
  const progressBar = useRef();
  const animationRef = useRef();
  const lastUpdateTimeRef = useRef(0);

  const [springs, api] = useSpring(() => ({
    from: { opacity: 0, y: 0 },
    to: { opacity: isPlaying ? 1 : 0, y: isPlaying ? 50 : 0 },
    config: { tension: 280, friction: 60 },
  }));

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
  }, [savedTime, isInitialized]);

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

      const now = Date.now();
      if (now - lastUpdateTimeRef.current > 1000) {
        lastUpdateTimeRef.current = now;
        updatePlaybackState(currentValue, audioDuration);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [updatePlaybackState]);

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
      });
    };

    const handlePause = () => {
      setIsPlaying(false);

      api.start({
        to: {
          opacity: 0,
          y: 0,
        },
      });

      if (audio.currentTime && audio.duration) {
        updatePlaybackState(audio.currentTime, audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);

      api.start({
        to: {
          opacity: 0,
          y: 0,
        },
      });

      if (audio.duration) {
        updatePlaybackState(audio.duration, audio.duration);
      }

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

      if (audio.currentTime && audio.duration) {
        updatePlaybackState(audio.currentTime, audio.duration);
      }
    };
  }, [updatePlaybackState, props.onEnded, api]);

  const togglePlayPause = () => {
    if (!audioPlayer.current) return;

    if (!isPlaying) {
      audioPlayer.current.play().catch((err) => {
        console.error('Error playing audio:', err);
      });
    } else {
      audioPlayer.current.pause();
    }
  };

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
      updatePlaybackState(newTime, audioPlayer.current.duration);
    }
  };

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
              <img
                src={isPlaying ? Pause : Play}
                alt={isPlaying ? 'Pause' : 'Play'}
              />
            </button>
          </BehaviourClick>
        </div>
        <animated.div style={springs} className="progress-container">
          <div className="current-time">{calculateTime(currentTime)}</div>
          <div>
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
