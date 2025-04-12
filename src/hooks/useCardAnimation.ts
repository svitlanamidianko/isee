import { useCallback } from 'react';
import { SpringRef } from '@react-spring/web';
import { Card } from '../types';

interface UseCardAnimationProps {
  api: SpringRef<any>;
  cards: Card[];
}

export const useCardAnimation = ({ api, cards }: UseCardAnimationProps) => {
  const animateCards = useCallback(() => {
    api.start(i => {
      const relPos = i;
      const maxTilt = 5;
      const rot = (Math.random() * 2 - 1) * maxTilt;

      return {
        x: 0,
        y: 0,
        scale: relPos === cards.length - 1 ? 1 : 0.7,
        rot,
        config: { tension: 300, friction: 30 }
      };
    });
  }, [api, cards]);

  return animateCards;
};