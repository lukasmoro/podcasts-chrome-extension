import React from 'react';
import './Recommendations.css';

function Recommendations({ podcasts, onAddPodcast }) {
  const handleAddPodcast = (podcast) => {
    if (!podcast.feedUrl) {
      console.error('No feed URL available for this podcast');
      return;
    }

    const timestamp = Date.now();

    const podcastItem = {
      id: `podcast_${timestamp}`,
      url: podcast.feedUrl,
      title: podcast.collectionName,
      image: podcast.artworkUrl600,
      playback: {
        currentTime: 0,
        duration: 0,
        status: 'NOT_STARTED',
      },
      addedAt: timestamp,
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
