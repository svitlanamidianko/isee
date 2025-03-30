import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import MatterAttractors from 'matter-attractors';
import { useSprings, animated, to as interpolate } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { motion, AnimatePresence } from 'framer-motion';
import './StoryView.css';
import debounce from 'lodash/debounce';
import { API_ENDPOINTS, API_BASE_URL } from '../config';
import { logApiCall } from '../utils/apiLogger';

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
  const entryRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(24);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const fitText = () => {
      if (!textRef.current) return;
      
      const container = textRef.current;
      const maxWidth = dimensions.width - 40;
      const maxHeight = dimensions.height - 40;
      
      let size = 32;
      container.style.fontSize = `${size}px`;
      
      while (size > 12) {
        if (container.scrollHeight <= maxHeight && container.scrollWidth <= maxWidth) {
          break;
        }
        size = Math.floor(size * 0.9);
        container.style.fontSize = `${size}px`;
      }
      
      const lineHeight = Math.max(1.1, Math.min(1.4, 1.25 + (24 - size) * 0.01));
      const letterSpacing = Math.max(-0.02, Math.min(0.05, (24 - size) * 0.002));
      
      setFontSize(size);
      container.style.lineHeight = lineHeight.toString();
      container.style.letterSpacing = `${letterSpacing}em`;
    };

    fitText();
  }, [dimensions, text]);

  return (
    <motion.div
      ref={entryRef}
      className="absolute flex items-start p-6 backdrop-blur-xs rounded-xl"
      initial={{ scale: 0, opacity: 0, y: 50 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.2,
        type: "spring",
        stiffness: 10,
        damping: 6
      }}
      style={{
        left: position.x - dimensions.width / 2,
        top: position.y - dimensions.height / 2,
        width: dimensions.width,
        height: dimensions.height,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        cursor: 'move',
        fontFamily: 'Papyrus',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div 
        ref={textRef}
        className="flex-1 overflow-hidden text-left pb-8 pr-4 select-none"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, fontSize }}
        transition={{ duration: 1.5, delay: index * 0.3 }}
        style={{
          fontWeight: 400,
          color: '#666666',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        {text}
      </motion.div>
    </motion.div>
  );
};

// Add new CardText component
const CardText: React.FC<{ text: string; linkie: string }> = ({ text, linkie }) => {
  if (!text && !linkie) return null;

  return (
    <motion.div 
      className="absolute left-0 right-0 bottom-full mb-6 text-center"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {text && (
        <div 
          className="text-white text-xl mb-3 font-medium"
          style={{ 
            fontFamily: 'Papyrus',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            maxWidth: '80%',
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
          className="text-blue-300 text-sm hover:text-blue-200 transition-colors"
          style={{ 
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            display: 'inline-block'
          }}
        >
          {linkie}
        </a>
      )}
    </motion.div>
  );
};

const StoryView: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [gone] = useState(() => new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        const sortedCards = data.cards.sort((a, b) => parseInt(b.order) - parseInt(a.order));
        console.log('Sorted Cards:', sortedCards);
        setCards(sortedCards);
      } catch (error) {
        console.error('Error fetching cards:', error);
      }
    };

    fetchStoryData();
  }, []);

  // Create springs AFTER we have cards
  const [props, api] = useSprings(cards.length, i => ({
    ...to(i),
    from: from(i),
  }));

  const bind = useDrag(({ args: [index], active, movement: [mx], direction: [xDir], velocity: [vx, vy] }) => {
    if (isAnimating) return;
    
    const trigger = Math.abs(mx) > 100 || Math.sqrt(vx * vx + vy * vy) > 0.2;
    const dir = xDir < 0 ? -1 : 1;
    
    if (!active && trigger) {
      setIsAnimating(true);
      gone.add(index);
      
      // Update current card index
      const nextCardIndex = (currentCardIndex + 1) % cards.length;
      setCurrentCardIndex(nextCardIndex);
      
      // Update Matter.js bodies with new entries
      if (rectanglesRef.current) {
        const visibleCardIndex = cards.length - 1 - [...gone].length;
        const visibleCard = cards[visibleCardIndex];
        console.log('Visible card:', visibleCard); // Debug log
        console.log('Visible card entries:', visibleCard.entries); // Debug log
        
        // Create new bodies for each entry
        rectanglesRef.current = visibleCard.entries.map((entry, i) => {
          const width = 280 + Math.random() * 40;
          const height = 160 + Math.random() * 40;
          const body = Bodies.rectangle(
            window.innerWidth / 2 + (visibleCard.is_horizontal ? 675 : 281.25) / 2 + 50,
            window.innerHeight / 2 - (visibleCard.entries.length * height) / 2 + i * height,
            width,
            height,
            {
              frictionAir: 0,
              friction: 0,
              restitution: 0,
              inertia: Infinity,
              density: 0,
              chamfer: { radius: 12 },
              render: { fillStyle: 'transparent', lineWidth: 0 }
            }
          ) as MatterBody;
          (body as any).entry = { text: entry.entry_text };
          console.log('Created body with entry:', entry.entry_text); // Debug log
          return body;
        });

        // Update the world with new bodies
        if (engineRef.current) {
          World.clear(engineRef.current.world, true);
          World.add(engineRef.current.world, [
            ...rectanglesRef.current,
            MouseConstraint.create(engineRef.current, {
              mouse: Mouse.create(engineRef.current.render.canvas),
              constraint: {
                stiffness: 0.01,
                damping: 0,
                render: { visible: false }
              }
            })
          ]);
        }
      }
      
      api.start(i => {
        if (index !== i) return;
        const isGone = gone.has(index);
        const x = isGone ? (200 + window.innerWidth) * dir : active ? mx : 0;
        const rot = mx / 100 + (isGone ? dir * 10 * Math.sqrt(vx * vx + vy * vy) : 0);
        const scale = active ? 1.1 : 1;
        
        return {
          x,
          rot,
          scale,
          delay: undefined,
          config: { friction: 50, tension: active ? 800 : isGone ? 200 : 500 },
          onRest: () => {
            setIsAnimating(false);
          }
        };
      });
    } else {
      // Handle active dragging
      api.start(i => {
        if (index !== i) return;
        const x = active ? mx : 0;
        const rot = active ? mx / 100 : 0;
        const scale = active ? 1.1 : 1;
        
        return {
          x,
          rot,
          scale,
          delay: undefined,
          config: { friction: 50, tension: active ? 800 : 500 },
        };
      });
    }

    if (!active && gone.size === cards.length) {
      setTimeout(() => {
        gone.clear();
        api.start(i => to(i));
      }, 600);
    }
  });

  // Setup Matter.js physics
  useEffect(() => {
    if (!cards.length || !sceneRef.current) return;

    const setupMatterJs = () => {
      const { Engine, Render, World, Bodies, Body, Mouse, MouseConstraint, Composite, Runner } = Matter;

      // Create engine
      engineRef.current = Engine.create({
        enableSleeping: false,
        constraintIterations: 4
      });

      // Create renderer
      const render = Render.create({
        element: sceneRef.current as HTMLElement,
        engine: engineRef.current,
        options: {
          width: window.innerWidth,
          height: window.innerHeight,
          wireframes: false,
          background: 'transparent'
        }
      });

      // Get the current card and its entries
      const visibleCardIndex = cards.length - 1 - [...gone].length;
      const visibleCard = cards[visibleCardIndex];
      console.log('Setting up Matter.js with visible card:', visibleCard); // Debug log
      console.log('Visible card entries:', visibleCard.entries); // Debug log
      
      // Calculate card dimensions
      const cardWidth = visibleCard.is_horizontal ? 675 : 281.25;
      const cardHeight = 506.25;
      
      // Position entries to the right of the card
      rectanglesRef.current = visibleCard.entries.map((entry, i) => {
        const width = 280 + Math.random() * 40;
        const height = 160 + Math.random() * 40;
        const body = Bodies.rectangle(
          window.innerWidth / 2 + cardWidth / 2 + 50, // Position to the right of the card
          window.innerHeight / 2 - (visibleCard.entries.length * height) / 2 + i * height, // Stack vertically
          width,
          height,
          {
            frictionAir: 0,
            friction: 0,
            restitution: 0,
            inertia: Infinity,
            density: 0,
            chamfer: { radius: 12 },
            render: { fillStyle: 'transparent', lineWidth: 0 }
          }
        ) as MatterBody;
        (body as any).entry = { text: entry.entry_text };
        console.log('Created body with entry:', entry.entry_text); // Debug log
        return body;
      });

      // Mouse control
      const mouse = Mouse.create(render.canvas);
      const mouseConstraint = MouseConstraint.create(engineRef.current, {
        mouse,
        constraint: {
          stiffness: 0.01,
          damping: 0,
          render: { visible: false }
        }
      });

      // Add all bodies to world
      World.add(engineRef.current.world, [
        ...rectanglesRef.current,
        mouseConstraint
      ]);

      // Start engine and renderer
      const runner = Runner.create();
      Runner.run(runner, engineRef.current);
      Render.run(render);

      // Update states
      Matter.Events.on(engineRef.current, 'afterUpdate', () => {
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

      // Cleanup
      return () => {
        Runner.stop(runner);
        Render.stop(render);
        if (engineRef.current) {
          World.clear(engineRef.current.world, true);
          Engine.clear(engineRef.current);
        }
        render.canvas.remove();
      };
    };

    setupMatterJs();
  }, [cards, currentCardIndex]);

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

  // Modify the swipeCard function to update entries correctly
  const swipeCard = (direction: number) => {
    if (isAnimating || cards.length === 0) return;
    
    // Add cooldown check (150ms between swipes)
    const now = Date.now();
    if (now - lastSwipeTime.current < 150) return;
    lastSwipeTime.current = now;
    
    const topCardIndex = cards.length - 1 - [...gone].length;
    setIsAnimating(true);
    gone.add(topCardIndex);
    
    // Update current card index
    const nextCardIndex = (currentCardIndex + 1) % cards.length;
    setCurrentCardIndex(nextCardIndex);
    
    // Update Matter.js bodies with new entries from the current card
    if (rectanglesRef.current) {
      const currentCard = cards[nextCardIndex];
      console.log('Current card:', currentCard); // Debug log
      // Reverse entries when updating them
      const entries = [...currentCard.entries].reverse();
      console.log('Reversed entries for display:', entries); // Debug log
      rectanglesRef.current.forEach((rect, i) => {
        if (entries[i]) {
          (rect as any).entry = { text: entries[i].entry_text };
        }
      });
    }
    
    api.start(i => {
      if (topCardIndex !== i) return;
      const x = (200 + window.innerWidth) * direction;
      const rot = direction * 10;
      
      return {
        x,
        rot,
        scale: 1,
        delay: undefined,
        config: { friction: 50, tension: 200 },
        onRest: () => {
          setIsAnimating(false);
          if (gone.size === cards.length) {
            gone.clear();
            api.start(i => to(i));
          }
        }
      };
    });
  };

  // Modify the keyboard event listener
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' && !isAnimating) {
        event.preventDefault(); // Prevent any default behavior
        swipeCard(1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAnimating, cards.length, currentCardIndex]); // Add necessary dependencies

  // Move these to the component body instead of the useEffect dependencies
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300); // Failsafe to prevent stuck state
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  if (cards.length === 0) return null;

  return (
    <div className="fixed inset-0 w-full h-full">
      <div ref={sceneRef} className="w-full h-full absolute inset-0 z-10" />
      
      <div className="w-full h-full absolute inset-0 z-20">
        {props.map(({ x, y, rot, scale }, i) => {
         
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
                overflow: 'visible'
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
                >
                  {cards[i].card_url.match(/\.(mov|mp4)$/i) ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      <video
                        src={`${API_BASE_URL}${cards[i].card_url}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        autoPlay
                        loop
                        muted={isVideoMuted}
                        playsInline
                        onClick={(e) => {
                          const video = e.currentTarget;
                          video.muted = !video.muted;
                          setIsVideoMuted(!isVideoMuted);
                        }}
                      />
                      <div 
                        style={{
                          position: 'absolute',
                          bottom: '20px',
                          right: '20px',
                          background: 'rgba(0, 0, 0, 0.5)',
                          padding: '8px 12px',
                          borderRadius: '20px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontFamily: 'Papyrus'
                        }}
                        onClick={(e) => {
                          const video = e.currentTarget.previousSibling as HTMLVideoElement;
                          video.muted = !video.muted;
                          setIsVideoMuted(!isVideoMuted);
                        }}
                      >
                        Click to {isVideoMuted ? 'unmute' : 'mute'}
                      </div>
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
                    />
                  )}
                </animated.div>
              </div>
            </animated.div>
          );
        })}
      </div>

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
    </div>
  );
};

const to = (i: number) => ({
  x: 0,
  y: i * -8,
  scale: 1,
  rot: -10 + Math.random() * 20,
  delay: i * 100,
});

const from = (_i: number) => ({ x: 0, rot: 0, scale: 1.5, y: -1000 });

const trans = (r: number, s: number) =>
  `perspective(1000px) rotateX(5deg) rotateY(${r / 20}deg) rotateZ(${r}deg) scale(${s})`;

export default StoryView; 