import React, { useRef } from 'react';
import { animated } from '@react-spring/web';
import { API_BASE_URL } from '../config';

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

const Card: React.FC<CardProps> = ({ card, style, bind, videoRefs }) => {
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

  return (
    <animated.div
      {...bind()}
      style={{
        ...style,
        backgroundColor: 'white',
        width: card.is_horizontal ? '775px' : '281.25px',
        height: '506.25px',
        borderRadius: '10px',
        boxShadow: '0 12.5px 100px -10px rgba(50, 50, 73, 0.4), 0 10px 10px -10px rgba(50, 50, 73, 0.3)',
        overflow: 'hidden',
        position: 'relative'
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
              objectFit: 'cover'
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
            objectFit: 'cover'
          }}
          alt={card.card_name}
          draggable="false"
          onDragStart={preventDrag}
        />
      )}
    </animated.div>
  );
};

export default React.memo(Card); 