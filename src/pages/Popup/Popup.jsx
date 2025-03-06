<<<<<<< Updated upstream
import React from 'react';
import Form from '../Options/Form';
import List from '../Options/List';
import { ThemeProvider } from '../Newtab/ThemeProvider';
import { usePodcastStorage } from '../../hooks/usePodcastStorage';
=======
// Popup.jsx - Updated to work with unified storage
import React, { useState } from 'react';
import Form from '../Options/Form';
import List from '../Options/List';
import { ThemeProvider } from '../Newtab/ThemeProvider';
import { usePodcastStore } from '../../hooks/usePodcastStore';
>>>>>>> Stashed changes
import './Popup.css';
import '../Options/List.css';
import '../../root/Root.css';

const Popup = () => {
<<<<<<< Updated upstream
  const { items, handleAddPodcast, handleRemovePodcast } = usePodcastStorage();
=======
  const [isDragging, setIsDragging] = useState(false);
  const {
    podcasts,
    handleAddPodcast,
    handleRemovePodcast,
    handleReorderPodcasts,
  } = usePodcastStore();

  const handleDragStateChange = (dragging) => {
    setIsDragging(dragging);
  };
>>>>>>> Stashed changes

  return (
    <div className="App">
      <ThemeProvider>
        <div className="list-container">
          <Form onSubmit={handleAddPodcast} />
          <List
            podcasts={podcasts}
            removeUrl={handleRemovePodcast}
            className="popup-list-overflow"
            stretchContent={true}
          />
        </div>
      </ThemeProvider>
    </div>
  );
};

export default Popup;
