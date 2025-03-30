import React, { useEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import MatterAttractors from 'matter-attractors';
import { useSprings, animated, to as interpolate } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { motion, AnimatePresence } from 'framer-motion';
import './CollectiveView.css';
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
  const [isVisible, setIsVisible] = useState(true);

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

  useEffect(() => {
    const baseDelay = 8000;
    const indexDelay = index * 1000;
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, baseDelay + indexDelay);

    return () => clearTimeout(timer);
  }, [index, cycleCount]);

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          ref={entryRef}
          className="absolute flex items-start p-6 backdrop-blur-xs rounded-xl"
          initial={{ scale: 0, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -20 }}
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
      )}
    </AnimatePresence>
  );
};

const CollectiveView: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [gone] = useState(() => new Set());
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Matter.js refs and state
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const [rectangleStates, setRectangleStates] = useState<RectangleState[]>([]);
  const rectanglesRef = useRef<MatterBody[]>([]);

  useEffect(() => {
    const fetchCollectiveData = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.collectiveView);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('API Response:', data);
        const sortedCards = data.cards.sort((a, b) => parseInt(b.order) - parseInt(a.order));
        console.log('Sorted Cards:', sortedCards);
        setCards(sortedCards);
      } catch (error) {
        console.error('Error fetching cards:', error);
      }
    };

    fetchCollectiveData();
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
      setCurrentCardIndex(prev => (prev + 1) % cards.length);
      
      // Update Matter.js bodies with new entries
      if (rectanglesRef.current) {
        const newEntries = cards[(currentCardIndex + 1) % cards.length].entries.map(entry => ({ entry_text: entry.entry_text }));
        rectanglesRef.current.forEach((rect, i) => {
          if (newEntries[i]) {
            (rect as any).entry = { text: newEntries[i].entry_text };
          }
        });
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

      // Physics parameters
      const params = {
        friction: {
          air: 0.131,
          surface: 0.373,
          restitution: 0.57,
          density: 0.02456
        },
        mouse: {
          stiffness: 0.01,
          damping: 0
        }
      };

      // Create rectangles for entries from the next card
      const nextCardIndex = (currentCardIndex + 1) % cards.length;
      const entries = cards[nextCardIndex].entries.map(entry => ({ entry_text: entry.entry_text }));
      
      rectanglesRef.current = entries.map((entry, i) => {
        const width = 280 + Math.random() * 40;
        const height = 160 + Math.random() * 40;
        const body = Bodies.rectangle(
          window.innerWidth * Math.random(),
          window.innerHeight * Math.random(),
          width,
          height,
          {
            frictionAir: params.friction.air,
            friction: params.friction.surface,
            restitution: params.friction.restitution,
            inertia: Infinity,
            density: params.friction.density,
            chamfer: { radius: 12 },
            render: { fillStyle: 'transparent', lineWidth: 0 }
          }
        ) as MatterBody;
        (body as any).entry = { text: entry.entry_text };
        return body;
      });

      // Mouse control
      const mouse = Mouse.create(render.canvas);
      const mouseConstraint = MouseConstraint.create(engineRef.current, {
        mouse,
        constraint: {
          stiffness: params.mouse.stiffness,
          damping: params.mouse.damping,
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

  if (cards.length === 0) return null;

  return (
    <div className="fixed inset-0 w-full h-full">
      <div ref={sceneRef} className="w-full h-full absolute inset-0 z-10" />
      
      <div className="w-full h-full absolute inset-0 z-20">
        {props.map(({ x, y, rot, scale }, i) => {
          console.log(`Card ${i}:`, {
            isHorizontal: cards[i].is_horizontal,
            width: cards[i].is_horizontal ? '1200px' : '600px',
            url: cards[i].card_url
          });
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
              <animated.div
                {...bind(i)}
                style={{
                  transform: interpolate([rot, scale], trans),
                  backgroundColor: 'white',
                  width: cards[i].is_horizontal ? '1200px' : '600px',
                  height: '900px',
                  borderRadius: '10px',
                  boxShadow: '0 12.5px 100px -10px rgba(50, 50, 73, 0.4), 0 10px 10px -10px rgba(50, 50, 73, 0.3)',
                  overflow: 'hidden'
                }}
              >
                {cards[i].card_url.match(/\.(mov|mp4)$/i) ? (
                  <video
                    src={`${API_BASE_URL}${cards[i].card_url}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
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

export default CollectiveView; 