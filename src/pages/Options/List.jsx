<<<<<<< Updated upstream
import React from 'react';
import { animated } from '@react-spring/web';
import Item from './Item';
=======
// List.jsx - Updated to work with unified storage
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSprings, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import clamp from 'lodash/clamp';
import swap from 'lodash-move';
import './List.css';

const PODCAST_UPDATED_EVENT = 'podcast-storage-updated';

const List = ({
  podcasts,
  removeUrl,
  moveItem,
  onDragStateChange,
  isPopup = false,
}) => {
  const [itemHeight, setItemHeight] = useState(70);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);
  const itemsRef = useRef([]);
  const order = useRef(podcasts.map((_, index) => index));
  const animationCompleteRef = useRef(true);
  const initialRenderRef = useRef(true);
  const lastReorderedRef = useRef(null);
  const lastProcessedPodcastsRef = useRef([]);

  const arePodcastsEquivalent = useCallback((prevPodcasts, newPodcasts) => {
    if (prevPodcasts.length !== newPodcasts.length) return false;

    return newPodcasts.every((podcast, index) => {
      return podcast.id === prevPodcasts[index]?.id;
    });
  }, []);

  useEffect(() => {
    const podcastsChanged = !arePodcastsEquivalent(
      lastProcessedPodcastsRef.current,
      podcasts
    );

    // In popup mode, always sync order ref with podcasts when podcasts change (if actually changed)
    if ((isPopup && !initialRenderRef.current) || podcastsChanged) {
      order.current = podcasts.map((_, index) => index);
      lastProcessedPodcastsRef.current = [...podcasts];
    }
  }, [podcasts, isPopup, arePodcastsEquivalent]);

  // Listen for podcast storage updates
  useEffect(() => {
    const handleStorageUpdate = (event) => {
      if (event.detail.action === 'reorder' && !initialRenderRef.current) {
        api.start(fn(order.current));
      }
    };
    window.addEventListener(PODCAST_UPDATED_EVENT, handleStorageUpdate);
    return () => {
      window.removeEventListener(PODCAST_UPDATED_EVENT, handleStorageUpdate);
    };
  }, []);

  // Initialize positions and prevent any animations on first render
  useEffect(() => {
    if (initialRenderRef.current) {
      order.current = podcasts.map((_, index) => index);
      lastProcessedPodcastsRef.current = [...podcasts];
      setItemHeight(70);
      setIsVisible(true);
      initialRenderRef.current = false;
    }
  }, []);

  // Update order ref when podcasts change (after initial render and if not in animation)
  useEffect(() => {
    if (!initialRenderRef.current && animationCompleteRef.current) {
      if (!arePodcastsEquivalent(lastProcessedPodcastsRef.current, podcasts)) {
        order.current = podcasts.map((_, index) => index);
        lastProcessedPodcastsRef.current = [...podcasts];
      }
    }
  }, [podcasts, arePodcastsEquivalent]);

  // The animation function
  const fn =
    (order, active = false, originalIndex = 0, curIndex = 0, y = 0) =>
    (index) => {
      if (active && index === originalIndex) {
        return {
          y: curIndex * itemHeight + y,
          scale: 1.03,
          zIndex: 1,
          immediate: (key) => key === 'y' || key === 'zIndex',
        };
      }

      return {
        y: order.indexOf(index) * itemHeight,
        scale: 1,
        zIndex: 0,
        shadow: 1,
        immediate: !isVisible,
        config: { tension: 300, friction: 30 },
      };
    };

  // Create springs with initial positions and no animation
  const [springs, api] = useSprings(podcasts.length, (index) => ({
    y: index * itemHeight,
    scale: 1,
    zIndex: 0,
    immediate: true,
  }));

  // Debounce drag updates to prevent flooding the storage
  const lastDragTimestampRef = useRef(0);
  const pendingDragUpdateRef = useRef(null);

  const bind = useDrag(
    ({ args: [originalIndex], active, movement: [_, y], last }) => {
      if (onDragStateChange) {
        onDragStateChange(active);
      }

      if (isPopup && active) {
        animationCompleteRef.current = false;
      } else {
        animationCompleteRef.current = !active;
      }

      const curIndex = order.current.indexOf(originalIndex);

      const curRow = clamp(
        Math.round((curIndex * itemHeight + y) / itemHeight),
        0,
        podcasts.length - 1
      );

      const newOrder = swap(order.current, curIndex, curRow);

      api.start(fn(newOrder, active, originalIndex, curIndex, y));

      if (!active && last) {
        if (curIndex !== curRow) {
          lastReorderedRef.current = {
            originalIndex,
            curIndex,
            curRow,
            timestamp: Date.now(),
          };

          console.log('Drag completed:', {
            originalIndex,
            curIndex,
            curRow,
            newOrder: JSON.stringify(newOrder),
            isPopup,
          });

          order.current = newOrder;
          api.start(fn(order.current));

          pendingDragUpdateRef.current = setTimeout(() => {
            lastDragTimestampRef.current = Date.now();
            moveItem(curIndex, curRow);
            animationCompleteRef.current = true;
            pendingDragUpdateRef.current = null;
          }, 300);
        }
      }
    }
  );

  const handleRemove = (id) => {
    removeUrl(id);
  };
>>>>>>> Stashed changes

function List({ items, removeUrl, className = '' }) {
  return (
<<<<<<< Updated upstream
    <animated.div className={`podcast-list-container ${className}`}>
      <div className="podcast-list-overflow">
        <Item items={items} removeUrl={removeUrl} />
      </div>
    </animated.div>
=======
    <div className="podcast-items-container" ref={containerRef}>
      {springs.map(({ y, scale, zIndex }, i) => (
        <animated.div
          key={podcasts[i]?.id || `item-${i}`}
          ref={(el) => (itemsRef.current[i] = el)}
          {...bind(i)}
          style={{
            zIndex,
            y,
            scale,
            position: 'absolute',
            width: '100%',
            touchAction: 'none',
          }}
          className="podcast-item-wrapper"
        >
          <div className="podcast-items">
            <img
              className="podcast-item-thumbnail"
              src={podcasts[i]?.artwork}
              alt={podcasts[i]?.podcastName || 'Podcast'}
            />
            <p
              className={
                podcasts[i]?.podcastName?.length > 10
                  ? 'podcast-item-title podcast-truncate-text'
                  : 'podcast-item-title'
              }
            >
              {podcasts[i]?.podcastName || 'Unnamed Podcast'}
            </p>
            <button
              className="podcast-remove-btn"
              onClick={() => handleRemove(podcasts[i]?.id, i)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              Remove
            </button>
          </div>
        </animated.div>
      ))}
    </div>
>>>>>>> Stashed changes
  );
}

export default List;
