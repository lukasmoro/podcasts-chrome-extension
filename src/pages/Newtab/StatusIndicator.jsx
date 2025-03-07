import React from 'react';
import usePodcastPlayback from '../../hooks/usePodcastPlayback';
import './StatusIndicator.css';
import { CheckIcon } from '../Icons/CheckIcon';

const StatusIndicator = ({ podcastId }) => {
  const { status: playbackStatus, PLAYBACK_STATUS } =
    usePodcastPlayback(podcastId);

  const getStatusColor = () => {
    switch (playbackStatus) {
      case PLAYBACK_STATUS.UNPLAYED:
      case 'UNPLAYED':
        return 'var(--unplayed-color, #19a0fc)';
      case PLAYBACK_STATUS.IN_PROGRESS:
      case 'IN_PROGRESS':
        return 'var(--in-progress-color, #ffa500)';
      case PLAYBACK_STATUS.FINISHED:
      case 'FINISHED':
        return 'var(--completed-color, #5dffb1)';
      case PLAYBACK_STATUS.NOT_STARTED:
      case 'NOT_STARTED':
        return 'var(--default-color, #d0d0d0)';
      default:
        return 'var(--default-color, #d0d0d0)';
    }
  };

  const getStatusIcon = () => {
    switch (playbackStatus) {
      case PLAYBACK_STATUS.UNPLAYED:
      case 'UNPLAYED':
      case PLAYBACK_STATUS.NOT_STARTED:
      case 'NOT_STARTED':
      case PLAYBACK_STATUS.IN_PROGRESS:
      case 'IN_PROGRESS':
        return null;
      case PLAYBACK_STATUS.FINISHED:
      case 'FINISHED':
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
