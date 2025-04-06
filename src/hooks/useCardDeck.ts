import { useState, useCallback, useRef, useEffect } from 'react';
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
    config: {
      mass: 1,
      tension: 180,
      friction: 50,
      precision: 0.001
    }
  };
};

export const useCardDeck = (initialCards: Card[]) => {
  console.log('useCardDeck called with cards:', initialCards);
  
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [gone] = useState(() => new Set<number>());
  const [swipeOrder, setSwipeOrder] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [allCardsSwiped, setAllCardsSwiped] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(initialCards.length - 1);
  const lastSwipeTime = useRef(Date.now());

  const [springs, api] = useSprings(cards.length || 0, i => {
    console.log('Creating spring for card', i, 'out of', cards.length);
    return {
      ...to(i, cards, gone),
      from: from(i)
    };
  });

  // Update cards when initialCards changes
  useEffect(() => {
    console.log('Cards updated in useCardDeck:', initialCards);
    setCards(initialCards);
    const newIndex = initialCards.length - 1;
    console.log('Setting current card index to:', newIndex);
    setCurrentCardIndex(newIndex);
    
    // Reset and update springs when cards change
    if (initialCards.length > 0) {
      gone.clear();
      setSwipeOrder([]);
      setIsAnimating(false);
      setAllCardsSwiped(false);
      
      api.start(i => ({
        ...to(i, initialCards, gone),
        from: from(i),
        immediate: false
      }));
    }
  }, [initialCards, api, gone]);

  const getRelativePosition = useCallback((index: number): number => {
    const goneCount = gone.size;
    if (gone.has(index)) return -1;
    return index - (cards.length - goneCount - 1);
  }, [gone, cards.length]);

  const getCurrentCard = useCallback(() => {
    console.log('getCurrentCard called with index:', currentCardIndex);
    console.log('Available cards:', cards);
    const card = currentCardIndex >= 0 ? cards[currentCardIndex] : null;
    console.log('Returning card:', card);
    return card;
  }, [currentCardIndex, cards]);

  const swipeCard = useCallback((index: number, direction: number) => {
    if (isAnimating || cards.length === 0 || index !== currentCardIndex) return;

    // Reduce cooldown time for keyboard navigation
    const now = Date.now();
    const minSwipeInterval = 50;
    if (now - lastSwipeTime.current < minSwipeInterval) return;
    lastSwipeTime.current = now;

    setIsAnimating(true);
    gone.add(index);
    setSwipeOrder(prev => [...prev, index]);
    setCurrentCardIndex(prev => prev - 1);

    api.start(i => {
      if (index !== i) {
        const relPos = getRelativePosition(i);
        if (relPos >= 0) {
          return {
            ...to(i, cards, gone),
            config: {
              mass: 1,
              tension: 180,
              friction: 50,
              precision: 0.001
            }
          };
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
        config: { 
          friction: 80,
          tension: 120,
          mass: 1.2,
          precision: 0.001
        },
        onRest: () => {
          // Reset isAnimating immediately after the swipe animation
          setIsAnimating(false);
          if (gone.size === cards.length) {
            setAllCardsSwiped(true);
          }
        }
      };
    });

    // Allow next swipe sooner by resetting isAnimating after a shorter delay
    setTimeout(() => {
      setIsAnimating(false);
    }, 100);

  }, [isAnimating, cards, gone, api, getRelativePosition, currentCardIndex]);

  const goBack = useCallback(() => {
    if (isAnimating || currentCardIndex >= cards.length - 1) return;

    const now = Date.now();
    const minSwipeInterval = 50;
    if (now - lastSwipeTime.current < minSwipeInterval) return;
    lastSwipeTime.current = now;

    setIsAnimating(true);
    const lastSwipedIndex = swipeOrder[swipeOrder.length - 1];
    gone.delete(lastSwipedIndex);
    setSwipeOrder(prev => prev.slice(0, -1));
    setCurrentCardIndex(prev => prev + 1);

    // Calculate new positions for all cards
    api.start(i => {
      // This is the card we're bringing back
      if (i === lastSwipedIndex) {
        return {
          x: 0,
          y: 0,
          rot: 0,
          scale: 1,
          config: { 
            friction: 50, 
            tension: 180,
            mass: 1,
            precision: 0.001
          },
          onRest: () => {
            setIsAnimating(false);
          }
        };
      }

      // For all other cards, calculate their new position in the stack
      const newGoneSize = gone.size;
      const topCardIndex = cards.length - 1 - newGoneSize;
      
      // If this card should be visible
      if (!gone.has(i)) {
        // Calculate scale based on position from top
        const distanceFromTop = topCardIndex - i;
        const scale = distanceFromTop === 0 ? 1 : 
                     distanceFromTop === 1 ? 0.5 : 
                     Math.max(0.2, 0.5 - (distanceFromTop - 1) * 0.05);
        
        return {
          x: 0,
          y: 0,
          rot: 0,
          scale,
          config: {
            mass: 1,
            tension: 180,
            friction: 50,
            precision: 0.001
          }
        };
      }
      
      return;
    });

    // Allow next action sooner
    setTimeout(() => {
      setIsAnimating(false);
    }, 100);
    
  }, [isAnimating, gone, api, swipeOrder, cards, currentCardIndex]);

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
    getRelativePosition,
    api,
    currentCard: getCurrentCard()
  };
}; 