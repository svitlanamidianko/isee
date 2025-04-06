import React, { useRef } from 'react';
import { useDrag } from '@use-gesture/react';
import { motion } from 'framer-motion';
import { animated } from '@react-spring/web';
import CommentInput from './CommentInput';
import IntroPage from './IntroPage';
import Card from './Card';
import CardText from './CardText';
import Entry from './Entry';
import { useStoryView } from '../hooks/useStoryView';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import './StoryView.css';

const StoryView: React.FC = () => {
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
    handleSubmittingChange
  } = useStoryView();

  // Use keyboard navigation
  useKeyboardNavigation({
    sceneRef,
    isAnimating,
    currentCardIndex: currentCard ? cards.indexOf(currentCard) : -1,
    cardsLength: cards.length,
    swipeCard,
    goBack
  });

  // Add the bind function from useDrag
  const bind = useDrag(({ args: [index], active, movement: [mx], direction: [xDir], velocity }) => {
    if (isAnimating) return;
    
    if (!currentCard || index !== cards.indexOf(currentCard)) return;
    
    const trigger = Math.abs(mx) > 100 || Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1]) > 0.2;
    const dir = xDir < 0 ? -1 : 1;
    
    // Update card position during drag
    api.start((i: number) => {
      if (index !== i) return;
      
      // Calculate rotation based on movement
      const rot = mx / 100 + (dir * 2 * Math.sign(mx));
      
      return {
        x: active ? mx : 0,
        rot: active ? rot : 0,
        scale: 1,
        config: { friction: active ? 50 : 40, tension: active ? 300 : 500 }
      };
    });
    
    if (!active && trigger) {
      swipeCard(index, dir);
    }
  });

  if (!hasAccess) {
    return <IntroPage onAccessGranted={() => setHasAccess(true)} />;
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-white" style={{ 
        fontFamily: 'Papyrus',
        fontSize: '1.5rem',
        textAlign: 'center',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
      }}>
        baking svitlana-ing home-cooked app. wait a sec
      </div>
    );
  }

  if (error) {
    return <div className="fixed inset-0 flex items-center justify-center text-red-500">Error: {error}</div>;
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
          onClick={goBack}
          className="absolute left-2 top-1/2 transform -translate-y-1/2 z-30
                   text-white transition-all duration-300
                   hover:scale-110"
          style={{ 
            fontFamily: 'Papyrus',
            fontSize: '1.75rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
        >
          ←
        </motion.button>
      )}
      
      {/* Cards */}
      <div className="w-full h-full absolute inset-0 z-20">
        {springs.map((spring, i) => {
          const relPos = getRelativePosition(i);
          const zIndex = 1000 - (relPos >= 0 ? relPos : 1000);

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
                marginTop: '40px',
                overflow: 'visible', 
                opacity: allCardsSwiped ? 0 : 1,
                transition: 'opacity 0.5s ease-out',
                pointerEvents: allCardsSwiped ? 'none' : 'auto',
                zIndex
              }}
            >
              <div style={{ position: 'relative' }}>
                {i === cards.indexOf(currentCard) && currentCard && (
                  <CardText text={currentCard.text} linkie={currentCard.linkie} isHorizontal={currentCard.is_horizontal} />
                )}
                <Card
                  card={cards[i]}
                  style={spring}
                  bind={bind}
                  videoRefs={videoRefs}
                />
              </div>
            </animated.div>
          );
        })}
      </div>

      {/* Comment Input */}
      <div className="absolute bottom-16 left-0 right-0 z-20">
        {cards.length > 0 && !allCardsSwiped && currentCard && (
          <CommentInput 
            cardId={currentCard.card_id} 
            isSubmitting={isAnimating}
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
              letterSpacing: '0.05em'
            }}
            className="bg-white/30 hover:bg-white/40 text-white py-6 px-12 rounded-xl
                     backdrop-blur-md border-2 border-white/40 transition-all duration-300
                     shadow-xl hover:shadow-2xl text-3xl hover:scale-105"
          >
            start over
          </motion.button>
        </motion.div>
      )}

      {/* Entries */}
      {!allCardsSwiped && currentCard && (
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