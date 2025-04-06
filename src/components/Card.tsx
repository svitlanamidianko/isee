import React, { useRef, memo } from 'react';
import { animated } from '@react-spring/web';
import { API_BASE_URL } from '../config';
import useIsMobile from '../hooks/useIsMobile';

interface CardProps {
  card: {
    card_id: string;
    card_url: string;
    card_name: string;
    is_horizontal: boolean;
  };
  style: any;
  bind: (...args: any[]) => any;
  videoRefs: React.MutableRefObject<{ [key: string]: HTMLVideoElement | null }>;
}

const Card: React.FC<CardProps> = memo(({ card, style, bind, videoRefs }) => {
  const isMobile = useIsMobile();
  
  // Prevent default drag behavior
  const preventDrag = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };

  const handleVideoClick = () => {
    const videoRef = videoRefs.current[card.card_id];
    if (videoRef) {
      if (videoRef.paused) {
        videoRef.play();
      } else {
        videoRef.pause();
      }
    }
  };

  // Calculate dimensions while maintaining aspect ratio
  const getCardDimensions = () => {
    if (!isMobile) {
      return {
        width: card.is_horizontal ? '775px' : '281.25px',
        height: '506.25px'
      };
    }

    // For mobile
    if (card.is_horizontal) {
      // For horizontal cards, calculate height based on screen width
      // Original aspect ratio is 775:506.25 ≈ 1.53:1
      const screenWidth = window.innerWidth;
      const padding = 32; // 16px padding on each side
      const maxWidth = screenWidth - padding;
      const height = maxWidth / 1.53; // maintain aspect ratio

      return {
        width: `${maxWidth}px`,
        height: `${height}px`,
        maxWidth: '100%',
      };
    } else {
      // Vertical cards can be taller
      return {
        width: '100vw',
        height: '60vh',
        maxWidth: '100%',
      };
    }
  };

  const cardDimensions = getCardDimensions();

  return (
    <animated.div
      {...bind()}
      style={{
        ...style,
        backgroundColor: 'white',
        ...cardDimensions,
        borderRadius: isMobile ? '0px' : '10px',
        boxShadow: '0 12.5px 100px -10px rgba(50, 50, 73, 0.4), 0 10px 10px -10px rgba(50, 50, 73, 0.3)',
        overflow: 'hidden',
        position: 'relative',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        transformStyle: 'preserve-3d',
        margin: isMobile && card.is_horizontal ? '0 auto' : undefined
      }}
      onDragStart={preventDrag}
    >
      {card.card_url.match(/\.(mov|mp4)$/i) ? (
        <div 
          style={{ position: 'relative', width: '100%', height: '100%' }}
          onClick={handleVideoClick}
          onDragStart={preventDrag}
        >
          <video
            ref={el => videoRefs.current[card.card_id] = el}
            src={`${API_BASE_URL}${card.card_url}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              willChange: 'transform'
            }}
            loop
            muted={false}
            playsInline
            draggable="false"
            onDragStart={preventDrag}
          />
        </div>
      ) : (
        <img
          src={`${API_BASE_URL}${card.card_url}`}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            willChange: 'transform'
          }}
          alt={card.card_name}
          draggable="false"
          onDragStart={preventDrag}
        />
      )}
    </animated.div>
  );
});

Card.displayName = 'Card';

export default Card; 