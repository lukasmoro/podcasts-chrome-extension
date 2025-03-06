// Onboarding.jsx - Updated to work with unified storage
import React from 'react';
import Recommendations from '../Newtab/Recommendations.jsx';
import Overlay from '../Newtab/Overlay.jsx';
import Form from '../Options/Form.jsx';
import { ThemeProvider } from '../Newtab/ThemeProvider';
<<<<<<< Updated upstream
import { usePodcastStorage } from '../../hooks/usePodcastStorage.js';
=======
import { usePodcastStore } from '../../hooks/usePodcastStore';
>>>>>>> Stashed changes
import './Onboarding.css';
import '../../root/Root.css';

<<<<<<< Updated upstream
export default function Onboarding() {
  const { items, handleAddPodcast } = usePodcastStorage();
=======
export default function Onboarding({ onPodcastAdded }) {
  const { podcasts, handleAddPodcast } = usePodcastStore();

  // Create a wrapper for handleAddPodcast that also calls onPodcastAdded
  const handleAddPodcastWithCallback = async (item) => {
    await handleAddPodcast(item);

    // After podcast is added, notify parent component to switch views
    if (onPodcastAdded) {
      onPodcastAdded();
    }
  };
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

  const podcastsRow2 = [
    {
      collectionId: '2001234567',
      collectionName: 'Hidden Brain',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/d9/97/f0/d997f0f5-284b-b90c-16f6-e2e675b831b3/mza_3280114077256997969.jpg/600x600bb.jpg',
      feedUrl: 'https://feeds.simplecast.com/kwWc0lhf',
    },
    {
      collectionId: '2002345678',
      collectionName: 'About Buildings + Cities',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/ab/0d/d6/ab0dd645-99bc-984d-4cd5-b6d28f74bf5d/mza_11891563292108691057.jpg/600x600bb.jpg',
      feedUrl: 'https://pinecast.com/feed/about-buildings-and-cities',
    },
    {
      collectionId: '2003456789',
      collectionName: 'Dwarkesh Podcast',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/26/a9/01/26a90187-8d2e-3299-0ffb-e9cadd7502f0/mza_7624305085535858475.jpg/600x600bb.jpg',
      feedUrl: 'https://api.substack.com/feed/podcast/69345.rss',
    },
    {
      collectionId: '2004567890',
      collectionName: 'Ologies',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts125/v4/44/4e/42/444e42f6-1ce8-1e7b-2d50-4ed506c27004/mza_18370866018545460916.jpg/600x600bb.jpg',
      feedUrl: 'https://feeds.simplecast.com/FO6kxYGj',
    },
  ];

  const podcastsRow3 = [
    {
      collectionId: '3001234567',
      collectionName: 'Dive Club',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/e8/95/23/e8952365-580e-36cf-6edb-f3495e6d6650/mza_17891313632392964837.jpg/600x600bb.jpg',
      feedUrl: 'https://media.rss.com/diveclub/feed.xml',
    },
    {
      collectionId: '3002345678',
      collectionName: 'Beyond the Screenplay',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts125/v4/81/00/68/81006885-489d-f3ba-ef8e-40bb6d935649/mza_79346667952768321.jpg/600x600bb.jpg',
      feedUrl: 'https://anchor.fm/s/86e1204/podcast/rss',
    },
    {
      collectionId: '3003456789',
      collectionName: 'Freakonomics Radio',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts115/v4/f7/0c/c5/f70cc540-ce36-d96f-b111-c970aad5505c/mza_17703422762227531425.jpg/600x600bb.jpg',
      feedUrl: 'https://feeds.simplecast.com/Y8lFbOT4',
    },
    {
      collectionId: '3004567890',
      collectionName: 'Nature Podcast',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/b0/56/82/b05682ce-9ea4-5344-bb60-88507456c327/mza_14062456357964887097.jpg/600x600bb.jpg',
      feedUrl:
        'https://feeds.acast.com/public/shows/0185cea5-9e3b-4b82-a887-26f91f92765f',
    },
  ];

  const podcastsRow4 = [
    {
      collectionId: '4001234567',
      collectionName: 'Revisionist History',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts112/v4/5f/a5/31/5fa53178-8efc-5bbf-2cb2-88eac2f7a7a4/mza_8828738869024330911.jpg/600x600bb.jpg',
      feedUrl:
        'https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/0e563f45-9d14-4ce8-8ef0-ae32006cd7e7/0d4cc74d-fff7-4b89-8818-ae32006cd7f0/podcast.rss',
    },
    {
      collectionId: '4002345678',
      collectionName: '99% Invisible',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/38/31/3a/38313a2e-6646-c890-1455-f995e17ee852/mza_5297003633662055505.jpg/600x600bb.jpg',
      feedUrl: 'https://feeds.simplecast.com/BqbsxVfO',
    },
    {
      collectionId: '4003456789',
      collectionName: 'Future Of Coding',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts123/v4/77/1a/5a/771a5aba-928e-c0ae-2d5e-193861f3e9d8/mza_11591220753382993754.jpg/600x600bb.jpg',
      feedUrl:
        'https://www.omnycontent.com/d/playlist/c4157e60-c7f8-470d-b13f-a7b30040df73/564f493f-af32-4c48-862f-a7b300e4df49/ac317852-8807-44b8-8eff-a7b300e4df52/podcast.rss',
    },
    {
      collectionId: '4004567890',
      collectionName: 'Time Sensitive',
      artworkUrl600:
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/21/23/76/212376c9-b3df-fd26-56d1-a5cdcf7a5f85/mza_2424932258659502495.jpg/600x600bb.jpg',
      feedUrl: 'https://feeds.simplecast.com/P0r8htaw',
    },
  ];

  return (
    <div className="App">
      <ThemeProvider>
        <Overlay />
        <div className="card">
          <div className="container">
            <h2 className="sub-header">Onboarding</h2>
            <h1 className="header">Welcome! 👋</h1>
            <p className="instructions">
              Search a podcast or pick a recommendation...
            </p>
            <Form onSubmit={handleAddPodcast} />
            <div className="recommendations-container">
              <Recommendations
                podcasts={podcastsRow1}
                onAddPodcast={handleAddPodcast}
              />
              <Recommendations
                podcasts={podcastsRow2}
                onAddPodcast={handleAddPodcast}
              />
              <Recommendations
                podcasts={podcastsRow3}
                onAddPodcast={handleAddPodcast}
              />
              <Recommendations
                podcasts={podcastsRow4}
                onAddPodcast={handleAddPodcast}
              />
            </div>
          </div>
        </div>
      </ThemeProvider>
    </div>
  );
}
