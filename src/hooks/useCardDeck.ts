import { useState, useCallback, useRef } from 'react';
import { useSprings } from '@react-spring/web';

interface Card {
  card_id: string;
  card_name: string;
  card_url: string;
  entries: Array<{ entry_text: string }>;
  linkie: string;
  order: string;
  text: string;
  is_horizontal: boolean;
}

const from = (i: number) => ({
  x: window.innerWidth * 1.5,
  rot: 0,
  scale: 1.5,
  y: -1000
});

const to = (i: number, cards: Card[], gone: Set<number>) => {
  if (!cards.length) return { x: 0, y: 0, scale: 1, rot: 0, delay: 0 };
  
  const topPos = cards.length - 1 - gone.size;
  const scale = i === topPos ? 1 : i === topPos - 1 ? 0.5 : Math.max(0.2, 0.5 - (topPos - i - 1) * 0.05);
  
  // Generate unique rotation
  const maxTilt = 6;
  const rot = (Math.random() * 2 - 1) * maxTilt;
  
  return {
    x: 0,
    y: 0,
    scale,
    rot,
    delay: i * 100,
  };
};

export const useCardDeck = (initialCards: Card[]) => {
  const [cards] = useState<Card[]>(initialCards);
  const [gone] = useState(() => new Set<number>());
  const [swipeOrder, setSwipeOrder] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [allCardsSwiped, setAllCardsSwiped] = useState(false);
  const lastSwipeTime = useRef(Date.now());

  const [springs, api] = useSprings(cards.length, i => ({
    ...to(i, cards, gone),
    from: from(i)
  }));

  const getRelativePosition = useCallback((index: number): number => {
    const goneCount = gone.size;
    if (gone.has(index)) return -1;
    return index - (cards.length - goneCount - 1);
  }, [gone, cards.length]);

  const swipeCard = useCallback((index: number, direction: number) => {
    if (isAnimating || cards.length === 0) return;

    const now = Date.now();
    if (now - lastSwipeTime.current < 150) return;
    lastSwipeTime.current = now;

    setIsAnimating(true);
    gone.add(index);
    setSwipeOrder(prev => [...prev, index]);

    api.start(i => {
      if (index !== i) {
        const relPos = getRelativePosition(i);
        if (relPos >= 0) {
          return to(i, cards, gone);
        }
        return;
      }

      const x = (200 + window.innerWidth) * direction;
      const rot = direction * 10;

      return {
        x,
        rot,
        scale: 1,
        delay: undefined,
        config: { friction: 50, tension: 200 },
        onRest: () => {
          setIsAnimating(false);
          if (gone.size === cards.length) {
            setAllCardsSwiped(true);
          }
        }
      };
    });
  }, [isAnimating, cards, gone, api, getRelativePosition]);

  const goBack = useCallback(() => {
    if (isAnimating || gone.size === 0) return;

    const now = Date.now();
    if (now - lastSwipeTime.current < 150) return;
    lastSwipeTime.current = now;

    setIsAnimating(true);
    const lastSwipedIndex = swipeOrder[swipeOrder.length - 1];
    gone.delete(lastSwipedIndex);
    setSwipeOrder(prev => prev.slice(0, -1));

    api.start(i => {
      if (i === lastSwipedIndex) {
        return {
          x: 0,
          y: 0,
          rot: 0,
          scale: 1,
          config: { friction: 50, tension: 200 },
          onRest: () => {
            setIsAnimating(false);
          }
        };
      }
      return to(i, cards, gone);
    });
  }, [isAnimating, gone, api, swipeOrder, cards]);

  const reset = useCallback(() => {
    setAllCardsSwiped(false);
    gone.clear();
    setSwipeOrder([]);
    setIsAnimating(true);

    api.start(i => ({
      ...from(i),
      immediate: true,
      onRest: () => {
        api.start(i => ({
          ...to(i, cards, gone),
          immediate: false,
          onRest: () => {
            setIsAnimating(false);
          }
        }));
      }
    }));
  }, [api, cards, gone]);

  return {
    cards,
    springs,
    gone,
    isAnimating,
    allCardsSwiped,
    swipeCard,
    goBack,
    reset,
    getRelativePosition
  };
}; 