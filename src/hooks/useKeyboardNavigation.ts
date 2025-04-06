import { useEffect, RefObject } from 'react';

interface UseKeyboardNavigationProps {
  sceneRef: RefObject<HTMLDivElement>;
  isAnimating: boolean;
  currentCardIndex: number;
  cardsLength: number;
  swipeCard: (index: number, direction: number) => void;
  goBack: () => void;
}

export const useKeyboardNavigation = ({
  sceneRef,
  isAnimating,
  currentCardIndex,
  cardsLength,
  swipeCard,
  goBack
}: UseKeyboardNavigationProps) => {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (currentCardIndex >= 0 && !isAnimating) {
          swipeCard(currentCardIndex, 1);
        }
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goBack();
      }
    };

    if (sceneRef.current) {
      sceneRef.current.tabIndex = 0;
      sceneRef.current.focus();
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAnimating, currentCardIndex, cardsLength, swipeCard, goBack, sceneRef]);
}; 