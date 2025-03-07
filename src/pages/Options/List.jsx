import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSprings, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import clamp from 'lodash/clamp';
import swap from 'lodash-move';
import { EVENTS } from '../../utils/storageService';
import './List.css';

const List = ({
  items,
  removeUrl,
  moveItem,
  onDragStateChange,
  isPopup = false,
}) => {
  const [itemHeight, setItemHeight] = useState(70);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);
  const itemsRef = useRef([]);
  const order = useRef(items.map((_, index) => index));
  const animationCompleteRef = useRef(true);
  const initialRenderRef = useRef(true);
  const lastReorderedRef = useRef(null);
  const lastProcessedItemsRef = useRef([]);

  const areItemsEquivalent = useCallback((prevItems, newItems) => {
    if (prevItems.length !== newItems.length) return false;

    return newItems.every((item, index) => {
      return item.key === prevItems[index]?.key;
    });
  }, []);

  useEffect(() => {
    const itemsChanged = !areItemsEquivalent(
      lastProcessedItemsRef.current,
      items
    );

    // In popup mode, always sync order ref with items when items change (if actually changed)
    if ((isPopup && !initialRenderRef.current) || itemsChanged) {
      order.current = items.map((_, index) => index);
      lastProcessedItemsRef.current = [...items];
    }
  }, [items, isPopup, areItemsEquivalent]);

  // Listen for podcast storage updates
  useEffect(() => {
    const handleStorageUpdate = (event) => {
      if (event.detail.action === 'reorder' && !initialRenderRef.current) {
        api.start(fn(order.current));
      }
    };
    window.addEventListener(EVENTS.PODCAST_UPDATED, handleStorageUpdate);
    return () => {
      window.removeEventListener(EVENTS.PODCAST_UPDATED, handleStorageUpdate);
    };
  }, []);

  // Initialize positions and prevent any animations on first render
  useEffect(() => {
    if (initialRenderRef.current) {
      order.current = items.map((_, index) => index);
      lastProcessedItemsRef.current = [...items];
      setItemHeight(70);
      setIsVisible(true);
      initialRenderRef.current = false;
    }
  }, []);

  // Update order ref when items change (after initial render and if not in animation)
  useEffect(() => {
    if (!initialRenderRef.current && animationCompleteRef.current) {
      if (!areItemsEquivalent(lastProcessedItemsRef.current, items)) {
        order.current = items.map((_, index) => index);
        lastProcessedItemsRef.current = [...items];
      }
    }
  }, [items, areItemsEquivalent]);

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
  const [springs, api] = useSprings(items.length, (index) => ({
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
        items.length - 1
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

  const handleRemove = (key) => {
    removeUrl(key);
  };

  return (
    <div className="podcast-items-container" ref={containerRef}>
      {springs.map(({ y, scale, zIndex }, i) => (
        <animated.div
          key={items[i]?.key || `item-${i}`}
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
              src={items[i]?.artwork}
              alt={items[i]?.title || items[i]?.podcastName || 'Podcast'}
            />
            <p
              className={
                (items[i]?.title || items[i]?.podcastName || '').length > 10
                  ? 'podcast-item-title podcast-truncate-text'
                  : 'podcast-item-title'
              }
            >
              {items[i]?.title || items[i]?.podcastName || 'Podcast'}
            </p>
            <button
              className="podcast-remove-btn"
              onClick={() => handleRemove(items[i]?.key, i)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              Remove
            </button>
          </div>
        </animated.div>
      ))}
    </div>
  );
};

export default List;
