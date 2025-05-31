import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { motion, AnimatePresence } from 'framer-motion';
import { animated } from '@react-spring/web';
import CommentInput from './CommentInput';
import IntroPage from './IntroPage';
import Card from './Card';
import CardText from './CardText';
import Entry from './Entry';
import LoadingView from './LoadingView';
import ErrorView from './ErrorView';
import { useStoryView } from '../hooks/useStoryView';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import useIsMobile from '../hooks/useIsMobile';
import './StoryView.css';

const StoryView: React.FC = () => {
  const isMobile = useIsMobile();
  const sceneRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  
  const {
    hasAccess,
    setHasAccess,
    cards,
    isLoading,
    error,
    springs,
    gone,
    isAnimating,
    allCardsSwiped,
    swipeCard,
    goBack,
    reset,
    getRelativePosition,
    api,
    currentCard,
    entryStates,
    handleCommentSubmit,
    handleSubmittingChange,
    retryFetch,
    isSubmittingEntry
  } = useStoryView({ videoRefs });

  // Use keyboard navigation
  useKeyboardNavigation({
    sceneRef,
    isAnimating,
    currentCardIndex: currentCard ? cards.indexOf(currentCard) : -1,
    cardsLength: cards.length,
    swipeCard,
    goBack,
    onSubmittingChange: handleSubmittingChange,
    onSubmitSuccess: handleCommentSubmit
  });

  // Add the bind function from useDrag
  const bind = useDrag(
    async ({ args: [index], active, movement: [mx], direction: [xDir], velocity, type, event }) => {
      console.log('Drag event:', { index, active, mx, xDir, velocity, type });  // Debug log
      
      if (isAnimating) {
        console.log('Animation in progress, ignoring drag');
        return;
      }
      
      if (!currentCard || index !== cards.indexOf(currentCard)) {
        console.log('Invalid card index or no current card');
        return;
      }
      
      // Make the trigger threshold smaller for desktop
      const triggerThreshold = type === 'touch' ? 100 : 50;
      const velocityThreshold = type === 'touch' ? 0.2 : 0.1;
      const trigger = Math.abs(mx) > triggerThreshold || Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1]) > velocityThreshold;
      const dir = xDir < 0 ? -1 : 1;
      
      // Update card position during drag
      api.start((i: number) => {
        if (index !== i) return;
        
        // Calculate rotation based on movement
        const rot = (mx / 100) * (type === 'touch' ? 1 : 2) + (dir * 2 * Math.sign(mx));
        
        const config = {
          x: active ? mx : 0,
          rot: active ? rot : 0,
          scale: active ? 1 : 0.95,
          config: { 
            friction: active ? 25 : 40,  // Lower friction for more responsive movement
            tension: active ? 200 : 500,  // Lower tension for more responsive movement
            mass: 1
          }
        };
        
        console.log('Updating spring:', config);  // Debug log
        return config;
      });
      
      if (!active && trigger) {
        console.log('Triggering swipe:', { dir });  // Debug log
        
        // First trigger comment submission
        if (handleSubmittingChange) {
          handleSubmittingChange(true);
          // Wait for submission to complete
          await new Promise(resolve => setTimeout(resolve, 150));
          // Reset submitting state
          handleSubmittingChange(false);
        }
        
        // Then swipe the card
        swipeCard(index, dir);
      }
    },
    {
      filterTaps: true,
      bounds: { left: -1000, right: 1000 },
      rubberband: true,
      axis: 'x',
      pointer: { mouse: true, touch: true },
      preventScroll: true,
      preventScrollAxis: 'x'
    }
  );

  if (!hasAccess) {
    return <IntroPage onAccessGranted={() => setHasAccess(true)} />;
  }

  if (isLoading) {
    return <LoadingView />;
  }

  if (error) {
    return <ErrorView error={error} onRetry={retryFetch} />;
  }

  if (cards.length === 0) return null;

  return (
    <div className="fixed inset-0 w-full h-full">
      <div 
        ref={sceneRef} 
        className="w-full h-full absolute inset-0 z-10 pointer-events-auto" 
      />
      
      {/* Back arrow button */}
      {gone.size > 0 && !isAnimating && !allCardsSwiped && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          onClick={async () => {
            // First trigger comment submission
            if (handleSubmittingChange) {
              handleSubmittingChange(true);
              // Wait for submission to complete
              await new Promise(resolve => setTimeout(resolve, 50));
              // Reset submitting state
              handleSubmittingChange(false);
            }
            // Then go back
            goBack();
          }}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 z-30
                   text-white transition-all duration-300
                   hover:scale-110"
          style={{ 
            fontFamily: 'Papyrus',
            fontSize: isMobile ? '1.25rem' : '1.75rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          ←
        </motion.button>
      )}
      
      {/* Forward arrow button */}
      {!isAnimating && !allCardsSwiped && currentCard && (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          onClick={async () => {
            // First trigger comment submission
            if (handleSubmittingChange) {
              handleSubmittingChange(true);
              // Wait for submission to complete
              await new Promise(resolve => setTimeout(resolve, 500));
              // Reset submitting state
              handleSubmittingChange(false);
            }
            // Then swipe the card
            if (currentCard) {
              const currentIndex = cards.indexOf(currentCard);
              if (currentIndex !== -1) {
                swipeCard(currentIndex, 1);
              }
            }
          }}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 z-30
                   text-white transition-all duration-300
                   hover:scale-110"
          style={{ 
            fontFamily: 'Papyrus',
            fontSize: isMobile ? '1.25rem' : '1.75rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          →
        </motion.button>
      )}
      
      {/* Cards */}
      <div className="w-full h-full absolute inset-0 z-20">
        {springs.map((spring, i) => {
          const relPos = getRelativePosition(i);
          const zIndex = 1000 - (relPos >= 0 ? relPos : 1000);
          
          // Only render current card and next card
          if (!currentCard || (i !== cards.indexOf(currentCard) && i !== cards.indexOf(currentCard) + 1)) {
            return null;
          }

          return (
            <animated.div 
              key={i} 
              style={{ 
                ...spring,
                position: 'absolute',
                width: '100%',
                height: '100%',
                willChange: 'transform',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: isMobile ? '0px' : '40px',
                overflow: 'visible', 
                opacity: allCardsSwiped ? 0 : 1,
                transition: 'opacity 0.5s ease-out',
                pointerEvents: allCardsSwiped ? 'none' : 'auto',
                zIndex
              }}
            >
              <div style={{ position: 'relative' }}>
                {i === cards.indexOf(currentCard) && currentCard && (
                  <CardText
                    text={currentCard?.text || ''}
                    linkie={currentCard?.linkie || ''}
                    isHorizontal={currentCard?.is_horizontal || false}
                  />
                )}
                <Card
                  card={cards[i]}
                  style={spring}
                  bind={bind}
                  videoRefs={videoRefs}
                  index={i}
                />
              </div>
            </animated.div>
          );
        })}
      </div>

      {/* Comment Input */}
      <div className={`absolute ${isMobile ? 'bottom-4' : 'bottom-16'} left-0 right-0 z-20`}>
        {cards.length > 0 && !allCardsSwiped && currentCard && (
          <CommentInput 
            cardId={currentCard.card_id} 
            isSubmitting={isSubmittingEntry}
            onSubmitSuccess={handleCommentSubmit}
            onSubmittingChange={handleSubmittingChange}
          />
        )}
      </div>

      {/* Start Over button */}
      {allCardsSwiped && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 flex items-center justify-center z-30"
        >
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            onClick={reset}
            style={{
              fontFamily: 'Papyrus',
              textTransform: 'lowercase',
              letterSpacing: '0.05em',
              fontSize: isMobile ? '1.5rem' : '2rem'
            }}
            className="bg-white/30 hover:bg-white/40 text-white py-6 px-12 rounded-xl
                     backdrop-blur-md border-2 border-white/40 transition-all duration-300
                     shadow-xl hover:shadow-2xl text-3xl hover:scale-105"
          >
            start over
          </motion.button>
        </motion.div>
      )}

      {/* Entries - Only show on desktop */}
      {!isMobile && !allCardsSwiped && currentCard && (
        <EntryBubblesLoop entryStates={entryStates} cardId={currentCard.card_id} />
      )}
    </div>
  );
};

const MAX_VISIBLE = 2;      // Show up to 2 bubbles at a time
const STAGGER = 3000;       // 3 seconds between new bubbles appearing
const DISPLAY_TIME = 6000;  // 6 seconds each bubble stays
const FADE_DURATION = 2000; // 2 seconds fade in/out duration

interface EntryBubblesLoopProps {
  entryStates: Array<{
    text: string;
    position: { x: number; y: number };
    dimensions: { width: number; height: number };
    opacity: number;
  }>;
  cardId: string;
}

const EntryBubblesLoop: React.FC<EntryBubblesLoopProps> = ({ entryStates, cardId }) => {
  const [visible, setVisible] = useState<Array<{ idx: number; key: string }>>([]);
  const nextIdx = useRef(0);
  const animationRef = useRef<NodeJS.Timeout>();

  // Reset animation when card changes
  useEffect(() => {
    setVisible([]);
    nextIdx.current = 0;
    if (animationRef.current) {
      clearInterval(animationRef.current);
    }
    
    if (!entryStates || entryStates.length === 0) return;

    // Helper to add a bubble
    const addBubble = () => {
      setVisible(prev => {
        // Remove oldest if at max
        const newArr = prev.length >= MAX_VISIBLE ? prev.slice(1) : prev.slice();
        newArr.push({
          idx: nextIdx.current,
          key: `${cardId}-${nextIdx.current}-${Date.now()}`
        });
        nextIdx.current = (nextIdx.current + 1) % entryStates.length;
        return newArr;
      });
    };

    // Start with first bubble
    addBubble();

    // Add a new bubble every STAGGER ms
    animationRef.current = setInterval(addBubble, STAGGER);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [entryStates, cardId]);

  // Remove bubbles after DISPLAY_TIME
  useEffect(() => {
    if (!visible.length) return;
    const timers = visible.map((v, i) =>
      setTimeout(() => {
        setVisible(prev => prev.filter(b => b.key !== v.key));
      }, DISPLAY_TIME)
    );
    return () => timers.forEach(clearTimeout);
  }, [visible]);

  // Function to detect URLs in text and replace with clickable [link]
  const detectAndReplaceUrl = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#7ecbff', textDecoration: 'underline', pointerEvents: 'auto' }}
          >
            [link]
          </a>
        );
      }
      return part;
    });
  };

  if (!entryStates || entryStates.length === 0) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      <AnimatePresence>
        {visible.map(({ idx, key }) => {
          const state = entryStates[idx];
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.6, y: -30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: 30 }}
              transition={{ 
                duration: FADE_DURATION / 1000,
                ease: [0.4, 0, 0.2, 1], // More gentle easing curve
                opacity: { duration: FADE_DURATION / 1000 },
                scale: { duration: FADE_DURATION / 1000 },
                y: { duration: FADE_DURATION / 1000 }
              }}
              className="absolute flex items-start p-3 backdrop-blur-xl rounded-lg"
              style={{
                left: state.position.x - state.dimensions.width / 2,
                top: state.position.y - state.dimensions.height / 2,
                width: state.dimensions.width,
                height: state.dimensions.height,
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                pointerEvents: 'none',
                fontFamily: 'Papyrus',
                zIndex: 1
              }}
            >
              <div
                className="flex-1 overflow-hidden text-left pb-4 pr-2 select-none"
                style={{
                  fontWeight: 400,
                  color: '#ffffff',
                  textShadow: '0 1px 4px rgba(0,0,0,1.0)',
                  fontSize: '18px',
                  lineHeight: '1.4',
                  letterSpacing: '0.02em'
                }}
              >
                {detectAndReplaceUrl(state.text)}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default StoryView;