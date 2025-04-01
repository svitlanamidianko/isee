import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Matter, { Bodies, World, Mouse, MouseConstraint } from 'matter-js';
import MatterAttractors from 'matter-attractors';
import { useSprings, animated, to as interpolate } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { motion, AnimatePresence } from 'framer-motion';
import './StoryView.css';
import debounce from 'lodash/debounce';
import { API_ENDPOINTS, API_BASE_URL } from '../config';
import { logApiCall } from '../utils/apiLogger';
import CommentInput from './CommentInput';
import IntroPage from './IntroPage';

Matter.use(MatterAttractors);

// Move interfaces to the top
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

interface EntryProps {
  text: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  index: number;
  cycleCount: number;
}

interface RectangleState {
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  entry: { text: string };
}

interface MatterBody extends Matter.Body {
  entry?: { text: string };
}

const Entry: React.FC<EntryProps> = ({ text, position, dimensions, index, cycleCount }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="absolute flex items-start p-6 backdrop-blur-xs rounded-xl"
      style={{
        left: position.x,
        top: position.y,
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        fontFamily: 'Papyrus',
      }}
    >
      <div 
        className="flex-1 overflow-hidden text-left pb-8 pr-4 select-none"
        style={{
          fontWeight: 400,
          color: '#666666',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)',
          fontSize: '24px',
          lineHeight: '1.4',
          letterSpacing: '0.02em'
        }}
      >
        {text}
      </div>
    </motion.div>
  );
};

// Add new CardText component
const CardText: React.FC<{ text: string; linkie: string }> = ({ text, linkie }) => {
  if (!text && !linkie) return null;

  return (
    <motion.div 
      className="absolute text-center"
      style={{ 
        width: '120%',
        left: '-10%',
        bottom: 'calc(100% + 2.5rem)'
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {text && (
        <div 
          className="text-white text-3xl leading-relaxed mb-3 font-medium"
          style={{ 
            fontFamily: 'Papyrus',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            margin: '0 auto'
          }}
        >
          {text}
        </div>
      )}
      {linkie && (
        <a 
          href={linkie} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-300 text-lg hover:text-blue-200 transition-colors inline-block drop-shadow-[0_2px_4px_rgba(76,29,149,0.5)]"
        >
          {linkie}
        </a>
      )}
    </motion.div>
  );
};

// Helper functions
const from = (_i: number) => ({ x: 0, rot: 0, scale: 1.5, y: -1000 });

const trans = (r: number, s: number) =>
  `perspective(1000px) rotateX(5deg) rotateY(${r / 20}deg) rotateZ(${r}deg) scale(${s})`;

// Create a function that generates the 'to' function with access to cards
const createToFunction = (cards: Card[]) => (i: number) => {
  if (!cards.length) return { x: 0, y: 0, scale: 1, rot: 0, delay: 0 };
  
  // In the deck, cards[0] is the bottom card, cards[cards.length-1] is the top card
  // Calculate position from the top of the deck 
  const topPos = cards.length - 1;
  // Apply non-linear scaling
  // Top card (highest index) has scale 1
  // Second card has scale 0.5
  // Each subsequent card scales down by 0.05
  const scale = i === topPos ? 1 : i === topPos - 1 ? 0.5 : Math.max(0.2, 0.5 - (topPos - i - 1) * 0.05);
  
  return {
    x: 0,
    y: i * -8,
    scale,
    rot: -10 + Math.random() * 20,
    delay: i * 100,
  };
};

const StoryView: React.FC = () => {
  const [hasAccess, setHasAccess] = useState(true);

  const [cards, setCards] = useState<Card[]>([]);
  const [gone] = useState(() => new Set());
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [allCardsSwiped, setAllCardsSwiped] = useState(false);
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // Matter.js refs and state
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const [rectangleStates, setRectangleStates] = useState<RectangleState[]>([]);
  const rectanglesRef = useRef<MatterBody[]>([]);

  // Add this ref to track the last swipe time
  const lastSwipeTime = useRef(0);

  useEffect(() => {
    const fetchStoryData = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.storyView);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('API Response:', data);
        // Sort cards in descending order (highest to lowest)
        const sortedCards = data.cards.sort((a: Card, b: Card) => parseInt(b.order) - parseInt(a.order));
        console.log('Sorted Cards:', sortedCards);
        setCards(sortedCards);
      } catch (error) {
        console.error('Error fetching cards:', error);
      }
    };

    fetchStoryData();
  }, []);

  // Create the to function with access to cards
  const to = useMemo(() => createToFunction(cards), [cards]);

  // Create springs AFTER we have cards
  const [props, api] = useSprings(cards.length, i => ({
    ...to(i),
    from: from(i),
  }));

  // Add the bind function from useDrag
  const bind = useDrag(({ args: [index], active, movement: [mx], direction: [xDir], velocity }) => {
    if (isAnimating) return;
    
    // Get the current card being dragged
    const currentCardIndex = cards.length - 1 - [...gone].length;
    if (index !== currentCardIndex) return;
    
    // If drag just started, pause video if applicable
    if (active && cards[index]?.card_url.match(/\.(mov|mp4)$/i)) {
      const videoRef = videoRefs.current[cards[index].card_id];
      if (videoRef && !videoRef.paused) {
        videoRef.pause();
      }
    }
    
    const trigger = Math.abs(mx) > 100 || Math.sqrt(velocity[0] * velocity[0] + velocity[1] * velocity[1]) > 0.2;
    const dir = xDir < 0 ? -1 : 1;
    
    // Update card position during drag
    api.start(i => {
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
      swipeCard(dir);
    }
  });

  // Calculate the relative position of a card in the deck considering swiped cards
  const getRelativePosition = useCallback((index: number): number => {
    // How many cards have been swiped away
    const goneCount = gone.size;
    // If this card has been swiped, it's no longer in the deck
    if (gone.has(index)) return -1;
    // Return the position from the top of the visible deck (0 is top)
    return index - (cards.length - goneCount - 1);
  }, [gone, cards.length]);

  // Memoize the swipeCard function
  const swipeCard = useCallback((direction: number) => {
    console.log('swipeCard called with direction:', direction);
    
    if (isAnimating || cards.length === 0) {
      console.log('Swipe prevented - isAnimating or no cards');
      return;
    }
    
    const now = Date.now();
    if (now - lastSwipeTime.current < 150) {
      console.log('Swipe prevented - cooldown');
      return;
    }
    lastSwipeTime.current = now;
    
    // Stop video if it's playing
    const topCardIndex = cards.length - 1 - [...gone].length;
    const currentCard = cards[topCardIndex];
    if (currentCard && currentCard.card_url.match(/\.(mov|mp4)$/i)) {
      const videoRef = videoRefs.current[currentCard.card_id];
      if (videoRef) {
        videoRef.pause();
        videoRef.currentTime = 0;
      }
    }
    
    console.log('Swiping card at index:', topCardIndex);
    
    setIsAnimating(true);
    gone.add(topCardIndex);
    
    // Update current card index
    const nextCardIndex = topCardIndex - 1;
    console.log('Next card index will be:', nextCardIndex);
    setCurrentCardIndex(nextCardIndex);
    
    // First trigger the card animation
    api.start(i => {
      if (topCardIndex !== i) {
        // Update scales for all cards that are not being swiped
        const relPos = getRelativePosition(i);
        if (relPos >= 0) {
          return {
            x: 0,
            y: relPos * -8,
            scale: relPos === 0 ? 1 : relPos === 1 ? 0.5 : Math.max(0.2, 0.5 - (relPos - 1) * 0.05),
            rot: -10 + Math.random() * 20,
            config: { friction: 50, tension: 200 },
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
        config: { friction: 50, tension: 200 },
        onRest: () => {
          console.log('Animation completed');
          setIsAnimating(false);
          
          // Update the Matter.js bodies
          if (engineRef.current && cards[nextCardIndex]) {
            const currentCard = cards[nextCardIndex];
            console.log('Setting up new entries for card:', currentCard);
            
            // Create new bodies for each entry
            if (currentCard && currentCard.entries) {
              const newBodies = currentCard.entries.map((entry, i) => {
                const width = 280 + Math.random() * 40;
                const height = 160 + Math.random() * 40;
                const body = Bodies.rectangle(
                  100,
                  100 + (i * (height + 20)),
                  width,
                  height,
                  {
                    frictionAir: 0,
                    friction: 0,
                    restitution: 0,
                    inertia: Infinity,
                    density: 0,
                    chamfer: { radius: 12 },
                    render: { fillStyle: 'transparent', lineWidth: 0 },
                    isStatic: true
                  }
                ) as MatterBody;
                (body as any).entry = { text: entry.entry_text };
                console.log('Created new entry after swipe:', entry.entry_text);
                return body;
              });
              
              rectanglesRef.current = newBodies;

              // Update the world with new bodies
              if (engineRef.current) {
                World.clear(engineRef.current.world, true);
                World.add(engineRef.current.world, newBodies);
              }
            }
          }

          // Check if we've gone through all cards
          if (gone.size === cards.length) {
            setAllCardsSwiped(true);
            // Clear rectangle states when all cards are swiped
            setRectangleStates([]);
            // Clear the Matter.js world
            if (engineRef.current) {
              World.clear(engineRef.current.world, true);
            }
          }
        }
      };
    });
  }, [isAnimating, cards, currentCardIndex, gone, api, getRelativePosition]);

  // Modify the keyboard event listener
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      console.log('Key pressed:', event.key);
      if (event.key === 'ArrowRight') {
        console.log('Right arrow pressed');
        event.preventDefault();
        
        const topCardIndex = cards.length - 1 - [...gone].length;
        console.log('topCardIndex:', topCardIndex);
        
        if (topCardIndex >= 0 && !isAnimating) {
          console.log('Attempting to swipe card');
          swipeCard(1);
        }
      }
    };

    // Add tabindex to make the component focusable
    if (sceneRef.current) {
      sceneRef.current.tabIndex = 0;
      sceneRef.current.focus();
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAnimating, cards.length, gone, swipeCard]);

  // Setup Matter.js physics
  useEffect(() => {
    if (!hasAccess || !cards.length || !sceneRef.current) return;

    let render: Matter.Render | null = null;
    let runner: Matter.Runner | null = null;

    const setupMatterJs = () => {
      const { Engine, Render, World, Bodies, Mouse, MouseConstraint, Runner } = Matter;

      // Create engine
      engineRef.current = Engine.create({
        enableSleeping: false,
        constraintIterations: 4
      });

      // Create renderer
      render = Render.create({
        element: sceneRef.current as HTMLElement,
        engine: engineRef.current,
        options: {
          width: window.innerWidth,
          height: window.innerHeight,
          wireframes: false,
          background: 'transparent'
        }
      });

      // Get the visible card
      const visibleCardIndex = cards.length - 1 - [...gone].length;
      const visibleCard = cards[visibleCardIndex];
      console.log('Initial setup - Visible card index:', visibleCardIndex);
      console.log('Initial setup - Visible card:', visibleCard);
      
      if (!visibleCard || !render.canvas) return;

      // Calculate card dimensions
      const cardWidth = visibleCard.is_horizontal ? 675 : 281.25;
      
      // Create new bodies for each entry
      rectanglesRef.current = visibleCard.entries.map((entry, i) => {
        const width = 280 + Math.random() * 40;
        const height = 160 + Math.random() * 40;
        const body = Bodies.rectangle(
          100,
          100 + (i * (height + 20)),
          width,
          height,
          {
            frictionAir: 0,
            friction: 0,
            restitution: 0,
            inertia: Infinity,
            density: 0,
            chamfer: { radius: 12 },
            render: { fillStyle: 'transparent', lineWidth: 0 },
            isStatic: true
          }
        ) as MatterBody;
        (body as any).entry = { text: entry.entry_text };
        console.log('Initial setup - Created entry:', entry.entry_text);
        return body;
      });

      // Add all bodies to world
      World.add(engineRef.current.world, [
        ...rectanglesRef.current
      ]);

      // Start engine and renderer
      runner = Runner.create();
      Runner.run(runner, engineRef.current);
      Render.run(render);

      // Update states
      Matter.Events.on(engineRef.current, 'afterUpdate', () => {
        if (!rectanglesRef.current.length) return;
        
        setRectangleStates(
          rectanglesRef.current.map(rect => ({
            position: rect.position,
            dimensions: {
              width: rect.bounds.max.x - rect.bounds.min.x - 20,
              height: rect.bounds.max.y - rect.bounds.min.y - 20
            },
            entry: (rect as any).entry || { text: '' }
          }))
        );
      });
    };

    setupMatterJs();

    // Cleanup function
    return () => {
      if (runner) {
        Matter.Runner.stop(runner);
      }
      if (render) {
        Matter.Render.stop(render);
        render.canvas?.remove();
      }
      if (engineRef.current) {
        Matter.World.clear(engineRef.current.world, true);
        Matter.Engine.clear(engineRef.current);
      }
    };
  }, [cards, currentCardIndex, hasAccess, gone]);

  const resetCycleTimer = () => {
    if (cycleTimerRef.current) {
      clearInterval(cycleTimerRef.current);
    }
    cycleTimerRef.current = setInterval(() => {
      setCycleCount(c => c + 1);
    }, 15000);
  };

  useEffect(() => {
    resetCycleTimer();
    return () => {
      if (cycleTimerRef.current) {
        clearInterval(cycleTimerRef.current);
      }
    };
  }, []);

  // Move these to the component body instead of the useEffect dependencies
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300); // Failsafe to prevent stuck state
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  const handleStartOver = () => {
    setAllCardsSwiped(false);
    setCurrentCardIndex(0);
    gone.clear();
    
    // Animate cards into a deck position with a smoother animation
    api.start(i => {
      // Calculate relative position in the deck - cards[0] is the bottom card
      const relPos = i;
      return {
        x: 0,
        y: i * -8,
        scale: relPos === cards.length - 1 ? 1 : relPos === cards.length - 2 ? 0.5 : Math.max(0.2, 0.5 - ((cards.length - 1 - relPos) - 1) * 0.05),
        rot: -10 + Math.random() * 20,
        delay: i * 100, // Slower stacking animation for better visual effect
        config: { 
          tension: 400, // Increased tension for snappier animation
          friction: 40, // Adjusted friction for smoother movement
          mass: 1 // Added mass for better physics feel
        }
      };
    });
  };

  // Prevent default drag behavior
  const preventDrag = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };

  if (!hasAccess) {
    return <IntroPage onAccessGranted={() => setHasAccess(true)} />;
  }

  if (cards.length === 0) return null;

  return (
    <div className="fixed inset-0 w-full h-full">
      <div ref={sceneRef} className="w-full h-full absolute inset-0 z-10" />
      
      <div className="w-full h-full absolute inset-0 z-20">
        {props.map(({ x, y, rot, scale }, i) => {
          // Calculate z-index based on position in the deck (higher for cards on top)
          const relPos = getRelativePosition(i);
          const zIndex = 1000 - (relPos >= 0 ? relPos : 1000);

          return (
            <animated.div 
              key={i} 
              style={{ 
                x, 
                y,
                position: 'absolute',
                width: '100%',
                height: '100%',
                willChange: 'transform',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'visible', 
                opacity: allCardsSwiped ? 0 : 1,
                transition: 'opacity 0.5s ease-out',
                pointerEvents: allCardsSwiped ? 'none' : 'auto',
                zIndex
              }}
            >
              <div style={{ position: 'relative' }}>
                {i === cards.length - 1 - [...gone].length && (
                  <CardText text={cards[i].text} linkie={cards[i].linkie} />
                )}
                <animated.div
                  {...bind(i)}
                  style={{
                    transform: interpolate([rot, scale], trans),
                    backgroundColor: 'white',
                    width: cards[i].is_horizontal ? '675px' : '281.25px',
                    height: '506.25px',
                    borderRadius: '10px',
                    boxShadow: '0 12.5px 100px -10px rgba(50, 50, 73, 0.4), 0 10px 10px -10px rgba(50, 50, 73, 0.3)',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                  onDragStart={preventDrag}
                >
                  {cards[i].card_url.match(/\.(mov|mp4)$/i) ? (
                    <div 
                      style={{ position: 'relative', width: '100%', height: '100%' }}
                      onClick={() => {
                        const videoRef = videoRefs.current[cards[i].card_id];
                        if (videoRef) {
                          if (videoRef.paused) {
                            videoRef.play();
                          } else {
                            videoRef.pause();
                          }
                        }
                      }}
                      onDragStart={preventDrag}
                    >
                      <video
                        ref={el => videoRefs.current[cards[i].card_id] = el}
                        src={`${API_BASE_URL}${cards[i].card_url}`}
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
                      src={`${API_BASE_URL}${cards[i].card_url}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      alt={cards[i].card_name}
                      draggable="false"
                      onDragStart={preventDrag}
                    />
                  )}
                </animated.div>
              </div>
            </animated.div>
          );
        })}
      </div>

      {/* Add CommentInput below the cards */}
      <div className="absolute bottom-24 left-0 right-0 z-20">
        {cards.length > 0 && !allCardsSwiped && cards[cards.length - 1 - [...gone].length] && (
          <CommentInput 
            cardId={cards[cards.length - 1 - [...gone].length].card_id} 
            isSubmitting={isAnimating}
            onSubmitSuccess={() => {
              console.log('Comment submitted successfully');
            }}
          />
        )}
      </div>

      {/* Update Start Over button styling and position */}
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
            onClick={handleStartOver}
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

      {/* Only render Entry components if not all cards are swiped */}
      {!allCardsSwiped && (
        <div className="absolute inset-0 z-30 pointer-events-none">
          {rectangleStates.map((rect, index) => (
            <Entry
              key={`entry-${index}-${cycleCount}-${currentCardIndex}`}
              text={rect.entry.text}
              position={rect.position}
              dimensions={rect.dimensions}
              index={index}
              cycleCount={cycleCount}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StoryView;