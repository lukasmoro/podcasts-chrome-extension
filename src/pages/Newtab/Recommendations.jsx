import React from 'react';
import './Recommendations.css';

function Recommendations({ podcasts, onAddPodcast }) {
  const handleAddPodcast = (podcast) => {
    if (!podcast.feedUrl) {
      console.error('No feed URL available for this podcast');
      return;
    }
    
    const timestamp = Date.now();
    const podcastId = `podcast_${timestamp}`;
    
    const podcastItem = {
      id: podcastId, 
      key: podcastId,
      url: podcast.feedUrl,
      text: podcast.feedUrl,
      title: podcast.collectionName,
      podcastName: podcast.collectionName,
      artwork: podcast.artworkUrl600,
      currentTime: 0,
      duration: 0,
      playbackStatus: 'NOT_STARTED',
      addedAt: timestamp
    };
    
    onAddPodcast(podcastItem);
  };

  return (
    <div className="podcast-recommendations">
      <div className="podcast-recommendations-grid">
        {podcasts &&
          podcasts.map((podcast) => (
            <div
              key={podcast.collectionId}
              className="podcast-recommendation-item"
              onClick={() => handleAddPodcast(podcast)}
            >
              <img
                className="podcast-recommendation-thumbnail"
                src={podcast.artworkUrl600}
                alt={podcast.collectionName}
                title={`Subscribe to ${podcast.collectionName}`}
              />
            </div>
          ))}
      </div>
    </div>
  );
}

export default Recommendations;
