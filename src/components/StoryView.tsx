import React, { useRef, useCallback } from 'react';
import { useDrag } from '@use-gesture/react';
import { motion } from 'framer-motion';
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
          await new Promise(resolve => setTimeout(resolve, 500));
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
              await new Promise(resolve => setTimeout(resolve, 500));
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
        <div className="absolute inset-0 z-30 pointer-events-none">
          {entryStates.map((state, index) => (
            <Entry
              key={`entry-${index}-${currentCard.card_id}`}
              text={state.text}
              position={state.position}
              dimensions={state.dimensions}
              opacity={state.opacity}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StoryView;