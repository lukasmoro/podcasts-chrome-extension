<<<<<<< Updated upstream
import React from 'react';
import usePlaybackPosition from '../../hooks/usePlaybackPosition';
=======
// StatusIndicator.jsx - Updated to work with unified storage
import React, { useState, useEffect } from 'react';
import { usePodcastStore } from '../../hooks/usePodcastStore';
>>>>>>> Stashed changes
import './StatusIndicator.css';
import { CheckIcon } from '../Icons/CheckIcon';

const StatusIndicator = ({ podcastId }) => {
<<<<<<< Updated upstream
  const { status: playbackStatus, PLAYBACK_STATUS } =
    usePlaybackPosition(podcastId);
=======
  const { getPodcastPlayback, PLAYBACK_STATUS } = usePodcastStore();
  const [playbackStatus, setPlaybackStatus] = useState(
    PLAYBACK_STATUS.UNPLAYED
  );

  useEffect(() => {
    const loadPlaybackStatus = () => {
      const playback = getPodcastPlayback(podcastId);
      setPlaybackStatus(playback.status);
    };

    loadPlaybackStatus();

    const handleStorageUpdate = (event) => {
      if (
        event.detail.action === 'playback-update' ||
        event.detail.action === 'playback-reset'
      ) {
        loadPlaybackStatus();
      }
    };

    window.addEventListener('podcast-storage-updated', handleStorageUpdate);

    return () => {
      window.removeEventListener(
        'podcast-storage-updated',
        handleStorageUpdate
      );
    };
  }, [podcastId, getPodcastPlayback]);
>>>>>>> Stashed changes

  const getStatusColor = () => {
    switch (playbackStatus) {
      case PLAYBACK_STATUS.UNPLAYED:
        return 'var(--unplayed-color, #19a0fc)';
      case PLAYBACK_STATUS.IN_PROGRESS:
        return 'var(--in-progress-color, #ffa500)';
      case PLAYBACK_STATUS.FINISHED:
        return 'var(--completed-color, #5dffb1)';
      default:
        return 'var(--default-color, #d0d0d0)';
    }
  };

  const getStatusIcon = () => {
    switch (playbackStatus) {
      case PLAYBACK_STATUS.UNPLAYED:
        return null;
      case PLAYBACK_STATUS.IN_PROGRESS:
        return null;
      case PLAYBACK_STATUS.FINISHED:
        return <CheckIcon className="status-icon" />;
      default:
        return null;
    }
  };

  return (
    <div
      className="status-indicator"
      style={{
        backgroundColor: getStatusColor(),
        '--outline-color': getStatusColor(),
      }}
    >
      {getStatusIcon()}
      <span className="status-dot"></span>
    </div>
  );
};

export default StatusIndicator;
