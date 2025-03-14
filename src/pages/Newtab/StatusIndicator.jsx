import React from 'react';

const StatusIndicator = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'unplayed':
        return 'var(--unplayed-color, #19a0fc)';
      case 'playing':
        return 'var(--in-progress-color, #ffa500)';
      case 'played':
        return 'var(--completed-color, #5dffb1)';
      default:
        return 'var(--default-color, #d0d0d0)';
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
      <span className="status-dot"></span>
    </div>
  );
};

export default StatusIndicator;
