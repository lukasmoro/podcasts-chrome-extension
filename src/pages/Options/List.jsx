import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSprings, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { EVENTS } from '../../utils/storageService';
import clamp from 'lodash/clamp';
import swap from 'lodash-move';
import './List.css';

const List = ({
  items,
  removeUrl,
  // moveItem,
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

  // Add state to track if we're currently in an animation
  const isAnimatingRef = useRef(false);
  // Track the most recent reordering
  const recentReorderingRef = useRef(null);

  const areItemsEquivalent = useCallback((prevItems, newItems) => {
    if (prevItems.length !== newItems.length) return false;

    return newItems.every((item, index) => {
      return item.id === prevItems[index]?.id;
    });
  }, []);

  // This function compares if the current items already reflect our last reordering
  const hasReorderingBeenApplied = useCallback(() => {
    if (!recentReorderingRef.current) return true;

    const { fromIndex, toIndex } = recentReorderingRef.current;

    // Check if the items are already in the correct order according to our last reordering
    const sourceKey = lastProcessedItemsRef.current[fromIndex]?.id;
    const matchesReordering = items[toIndex]?.id === sourceKey;

    return matchesReordering;
  }, [items]);

  useEffect(() => {
    // Don't process items changes during animation
    if (isAnimatingRef.current) return;

    const itemsChanged = !areItemsEquivalent(
      lastProcessedItemsRef.current,
      items
    );

    // Special handling for first render or popup mode
    if (
      initialRenderRef.current ||
      (isPopup && !initialRenderRef.current) ||
      itemsChanged
    ) {
      // If we have a recent reordering and items haven't been updated to match it,
      // keep our current order
      if (recentReorderingRef.current && !hasReorderingBeenApplied()) {
        console.log(
          'Items changed but maintaining local order due to recent reordering'
        );
      } else {
        // Otherwise, sync order with the new items
        order.current = items.map((_, index) => index);
      }

      lastProcessedItemsRef.current = [...items];
    }
  }, [items, isPopup, areItemsEquivalent, hasReorderingBeenApplied]);

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
  }, [items]);

  // The animation function
  const fn =
    (order, active = false, originalIndex = 0, curIndex = 0, y = 0) =>
    (index) => {
      if (active && index === originalIndex) {
        return {
          y: curIndex * itemHeight + y,
          scale: 1.03,
          zIndex: 1,
          immediate: (id) => id === 'y' || id === 'zIndex',
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

      // Update springs to show current drag state
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

          // Update local order
          order.current = newOrder;

          // Mark that we're animating
          isAnimatingRef.current = true;

          // Remember the reordering operation for comparison
          recentReorderingRef.current = {
            fromIndex: curIndex,
            toIndex: curRow,
            timestamp: Date.now(),
          };

          isAnimatingRef.current = false;
          // moveItem(curIndex, curRow);
          recentReorderingRef.current = null;
        }
      }
    }
  );

  const handleRemove = (id) => {
    removeUrl(id);
  };

  return (
    <div className="podcast-items-container" ref={containerRef}>
      {springs.map(({ y, scale, zIndex }, i) => (
        <animated.div
          id={items[i]?.id || `item-${i}`}
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
              src={items[i]?.image}
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
              onClick={() => handleRemove(items[i]?.id, i)}
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
