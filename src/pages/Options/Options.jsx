<<<<<<< Updated upstream
import React from 'react';
=======
// Options.jsx - Updated to work with unified storage
import React, { useState } from 'react';
>>>>>>> Stashed changes
import Form from './Form';
import List from './List';
import Overlay from '../Newtab/Overlay';
import Recommendations from '../Newtab/Recommendations';
import BuyMeACoffeeButton from '../Newtab/BuyMeACoffeeButton';
import { ThemeProvider } from '../Newtab/ThemeProvider';
<<<<<<< Updated upstream
import { usePodcastStorage } from '../../hooks/usePodcastStorage';
=======
import { usePodcastStore } from '../../hooks/usePodcastStore';
>>>>>>> Stashed changes
import './Options.css';
import './Form.css';
import './List.css';
import '../../root/Root.css';

export default function Options() {
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
>>>>>>> Stashed changes

  const podcastsRow1 = [
    {
      collectionId: '1001591696',
      collectionName: 'The Daily',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/c8/1a/71/c81a716b-b5d1-61b7-7d3e-0253a56e63d5/mza_15186388159121451528.jpg/600x600bb.jpg',
      feedUrl: 'https://feeds.simplecast.com/54nAGcIl',
    },
    {
      collectionId: '1002345678',
      collectionName: 'Tetragrammaton',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts112/v4/7c/0c/5a/7c0c5ac5-d264-c8b8-092c-e783a7d90acd/mza_5701251400846604141.png/600x600bb.jpg',
      feedUrl: 'https://feeds.megaphone.fm/tetragrammaton',
    },
    {
      collectionId: '1003456789',
      collectionName: 'Hard Fork',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/a9/6b/6c/a96b6c32-c995-99bb-ca21-2b3513a73ed5/mza_13537672625974326334.jpg/600x600bb.jpg',
      feedUrl: 'https://feeds.simplecast.com/l2i9YnTd',
    },
    {
      collectionId: '1004567890',
      collectionName: 'Metamuse',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts122/v4/ab/85/0e/ab850e67-ef76-23ad-b0e5-178d5a62defb/mza_10900988606734060896.png/600x600bb.jpg',
      feedUrl: 'https://museapp.com/podcast.rss',
    },
  ];

  return (
    <div className="App">
      <ThemeProvider>
        <Overlay />
        <div className="cards-container">
          <div className="card left-card">
            <div className="container">
              <h2 className="sub-header">Manage Podcasts</h2>
              <h1 className="header">Subscriptions</h1>
              <p className="instructions">
                Manage podcasts here or in the pop-up window.
              </p>
              <Form onSubmit={handleAddPodcast} />
              <div className="overflow">
                <div className="podcast-divider"></div>
                <List
                  podcasts={podcasts}
                  removeUrl={handleRemovePodcast}
                  className="options-list-overflow"
                />
              </div>
            </div>
          </div>
          <div className="right-cards">
            <div className="card right-card">
              <div className="container">
                <h2 className="sub-header">Find Podcasts</h2>
                <h1 className="header">Recommendations</h1>
                <p className="instructions">
                  Unsure where to start? Here are some favorites.
                </p>
                <Recommendations
                  podcasts={podcastsRow1}
                  onAddPodcast={handleAddPodcast}
                />
              </div>
            </div>
            <div className="card right-card">
              <div className="container">
                <h2 className="sub-header">Enjoy Podcasts?</h2>
                <h1 className="header">Tip Char</h1>
                <p className="instructions">
                  <em>Tiny Podcasts</em> is the first project of{' '}
                  <em>Tiny Software</em>. Every tip supports the creation of
                  future <em>Tiny Products</em>. <br /> Thank you!
                </p>
                <BuyMeACoffeeButton />
                <div className="items">
                  <p></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
