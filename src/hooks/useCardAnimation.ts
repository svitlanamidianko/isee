import { useCallback } from 'react';
import { SpringRef } from '@react-spring/web';
import { Card } from '../types';

interface UseCardAnimationProps {
  api: SpringRef<any>;
  cards: Card[];
}

export const useCardAnimation = ({ api, cards }: UseCardAnimationProps) => {
  const animateCards = useCallback(() => {
    console.log('useCardAnimation: Starting animation for', cards.length, 'cards');
    const lastAngles: number[] = [];
    
    api.start(i => {
      console.log(`useCardAnimation: Animating card ${i} with delay ${i * 200}ms`);
      const relPos = i;
      const maxTilt = 6;
      let rot: number;
      do {
        rot = (Math.random() * 2 - 1) * maxTilt;
      } while (lastAngles.some(lastAngle => Math.abs(lastAngle - rot) < 2));
      
      lastAngles.push(rot);
      if (lastAngles.length > 3) lastAngles.shift();
      
      const animationConfig = {
        x: 0,
        y: i * -8,
        scale: relPos === cards.length - 1 ? 1 : relPos === cards.length - 2 ? 0.5 : Math.max(0.2, 0.5 - ((cards.length - 1 - relPos) - 1) * 0.05),
        rot,
        delay: i * 200,
        config: { 
          tension: 400,
          friction: 40,
          mass: 1,
          duration: 1000
        }
      };
      
      console.log(`useCardAnimation: Card ${i} animation config:`, {
        ...animationConfig,
        config: '...' // Don't log the full config object
      });
      
      return animationConfig;
    });
  }, [api, cards]);

  return animateCards;
}; 