import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import Matter from 'matter-js';
import MatterAttractors from 'matter-attractors';
// @ts-ignore
import MatterWrap from 'matter-wrap';
import { useSprings, animated, to as interpolate } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { motion, AnimatePresence } from 'framer-motion';
import './StoryView.css';
import debounce from 'lodash/debounce';
import { API_ENDPOINTS, API_BASE_URL } from '../config';
import { logApiCall } from '../utils/apiLogger';
import CommentInput from './CommentInput';
import IntroPage from './IntroPage';
import { useCardAnimation } from '../hooks/useCardAnimation';

// Initialize Matter.js plugins
Matter.use(MatterAttractors);
Matter.use(MatterWrap);

// Set the gravity constant for the attractors
MatterAttractors.Attractors.gravityConstant = 0.001;

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
  opacity: number;
}

interface RectangleState {
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  entry: { text: string };
  opacity: number;
  initialDimensions?: { width: number; height: number };
  scale: number;  // Add scale for pop-in effect
}

interface MatterBody extends Matter.Body {
  entry?: { text: string };
  fadeIn?: boolean;
  initialDimensions?: { width: number; height: number };
}

const Entry: React.FC<EntryProps> = ({ text, position, dimensions, index, opacity }) => {
  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        scale: 0.6,
        y: -50 // Start slightly above final position
      }}
      animate={{ 
        opacity, 
        scale: 1,
        y: 0 // Drop to final position
      }}
      transition={{ 
        duration: 2,
        ease: [0.23, 1, 0.32, 1], // Custom easing for natural drop feel
        opacity: { duration: 1.5 },
        scale: { duration: 1.5 }
      }}
      className="absolute flex items-start p-3 backdrop-blur-xl rounded-lg"
      style={{
        left: position.x - dimensions.width / 2,
        top: position.y - dimensions.height / 2,
        width: dimensions.width,
        height: dimensions.height,
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
        {text}
      </div>
    </motion.div>
  );
};

// Add new CardText component
const CardText: React.FC<{ text: string; linkie: string; isHorizontal: boolean }> = ({ text, linkie, isHorizontal }) => {
  if (!text && !linkie) return null;

  return (
    <motion.div 
      className="absolute text-center z-1000"
      style={{ 
        position: 'absolute',
        width: '100%',
        left: 0,
        right: 0,
        bottom: 'calc(100% + 2rem)',
        zIndex: 100,
        margin: '0 auto'
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {text && (
        <div 
          className="text-white leading-relaxed mb-3 font-medium z-50"
          style={{ 
            fontFamily: 'Papyrus',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
            margin: '0 auto',
            fontSize: isHorizontal ? '1.875rem' : '1.55rem' // Adjust size based on orientation
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
          className="text-sm transition-colors z-50"
          style={{ 
            color: '#3A225E',
            display: 'inline-block'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#4A326E'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#3A225E'}
        >
          {linkie}
        </a>
      )}
    </motion.div>
  );
};

// Helper functions
const from = (i: number) => { 
  console.log('Setting initial position for card', i);
  return { 
    x: window.innerWidth * 1.5, // Start off-screen to the right
    rot: 0, 
    scale: 1.5, 
    y: -1000 
  };
};

const trans = (r: number, s: number) =>
  `perspective(1000px) rotateX(5deg) rotateY(${r / 10}deg) rotateZ(${r}deg) scale(${s})`;

// First, let's modify the createToFunction to ensure truly random angles
const createToFunction = (cards: Card[]) => {
  // Track the last few angles to prevent repetition
  let lastAngles: number[] = [];
  
  return (i: number) => {
    if (!cards.length) return { x: 0, y: 0, scale: 1, rot: 0, delay: 0 };
    
    const topPos = cards.length - 1;
    const scale = i === topPos ? 1 : i === topPos - 1 ? 0.5 : Math.max(0.2, 0.5 - (topPos - i - 1) * 0.05);
    
    // Function to check if an angle is too similar to recent angles
    const isTooSimilar = (angle: number) => {
      return lastAngles.some(lastAngle => Math.abs(lastAngle - angle) < 2);
    };
    
    // Generate a unique angle that's different from recent ones
    const maxTilt = 6;
    let rot;
    do {
      rot = (Math.random() * 2 - 1) * maxTilt;
    } while (isTooSimilar(rot));
    
    // Update the history of angles, keeping only the last 3
    lastAngles.push(rot);
    if (lastAngles.length > 3) {
      lastAngles.shift();
    }
    
    return {
      x: 0,
      y: 0, // Remove vertical offset
      scale,
      rot,
      delay: i * 100,
    };
  };
};

const StoryView: React.FC = () => {
  const [hasAccess, setHasAccess] = useState(true);

  const [cards, setCards] = useState<Card[]>([]);
  const [gone] = useState(() => new Set());
  const [swipeOrder, setSwipeOrder] = useState<number[]>([]); // Track order of swiped cards
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isVideoMuted, setIsVideoMuted] = useState(true);
  const [allCardsSwiped, setAllCardsSwiped] = useState(false);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // Matter.js refs and state
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const attractorRef = useRef<Matter.Body | null>(null);
  const [rectangleStates, setRectangleStates] = useState<RectangleState[]>([]);
  const rectanglesRef = useRef<MatterBody[]>([]);

  // Add this ref to track the last swipe time
  const lastSwipeTime = useRef(0);

  // Add a ref to store the initial positions
  const initialPositionsRef = useRef<RectangleState[]>([]);

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
    config: { 
      tension: 400,
      friction: 40,
      mass: 1
    }
  }));

  // Use our new animation hook
  const animateCards = useCardAnimation({ api, cards });

  // Function to calculate dimensions based on text length
  const calculateDimensions = useCallback((text: string) => {
    // Set fixed width for all cards
    const constantWidth = 160;
    
    // Typography constants
    const fontSize = 18;
    const lineHeight = fontSize * 1.4; // Standard line height ratio
    const avgCharsPerLine = constantWidth / (fontSize * 0.5); // Approximate chars that fit per line
    
    // Estimate the number of lines (accounting for word wrapping)
    // Split text into words and reconstruct line by line
    const words = text.split(' ');
    let lines = 1;
    let currentLineLength = 0;
    
    words.forEach(word => {
      // Add word length plus one space
      if (currentLineLength + word.length + 1 <= avgCharsPerLine) {
        currentLineLength += word.length + 1;
      } else {
        // Start new line
        lines++;
        currentLineLength = word.length;
      }
    });
    
    // Calculate height based on lines needed
    const textHeight = Math.ceil(lines * lineHeight);
    
    // Add padding for container (top+bottom padding from CSS)
    const paddingVertical = 36; // 12px top + 12px bottom
    const minHeight = 60; // Minimum height to look good
    
    // Calculate final height with some variation for natural feel
    const variation = (Math.random() * 10) + 10; // +/- 5px variation
    const calculatedHeight = Math.max(minHeight, textHeight + paddingVertical + variation);
    
    return {
      width: constantWidth,
      height: Math.floor(calculatedHeight)
    };
  }, []);

  const setupEntries = useCallback(() => {
    if (!cards.length) return;
    
    // Get the current visible card
    const topCardIndex = cards.length - 1 - [...gone].length;
    const currentCard = cards[topCardIndex];
    if (!currentCard || !currentCard.entries || currentCard.entries.length === 0) return;
    
    // Calculate positions around the card deck
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Card dimensions
    const cardWidth = currentCard.is_horizontal ? 775 : 281.25;
    const cardHeight = 506.25;
    
    // Calculate safe zones for droplet placement
    const cardLeft = centerX - cardWidth / 2;
    const cardRight = centerX + cardWidth / 2;
    const cardTop = centerY - cardHeight / 2;
    const cardBottom = centerY + cardHeight / 2;
    
    // Buffer space between card and droplets
    const buffer = 40;
    // Minimum space between droplets
    const minSpaceBetweenDroplets = 20;
    
    // Helper function to check if a position overlaps with existing droplets
    const doesOverlap = (newPos: { x: number, y: number }, newDim: { width: number, height: number }, existingDroplets: RectangleState[]) => {
      const newLeft = newPos.x - newDim.width / 2;
      const newRight = newPos.x + newDim.width / 2;
      const newTop = newPos.y - newDim.height / 2;
      const newBottom = newPos.y + newDim.height / 2;
      
      return existingDroplets.some(droplet => {
        const dropletLeft = droplet.position.x - droplet.dimensions.width / 2;
        const dropletRight = droplet.position.x + droplet.dimensions.width / 2;
        const dropletTop = droplet.position.y - droplet.dimensions.height / 2;
        const dropletBottom = droplet.position.y + droplet.dimensions.height / 2;
        
        // Add buffer space around each droplet
        return !(
          newRight + minSpaceBetweenDroplets < dropletLeft - minSpaceBetweenDroplets ||
          newLeft - minSpaceBetweenDroplets > dropletRight + minSpaceBetweenDroplets ||
          newBottom + minSpaceBetweenDroplets < dropletTop - minSpaceBetweenDroplets ||
          newTop - minSpaceBetweenDroplets > dropletBottom + minSpaceBetweenDroplets
        );
      });
    };

    // Helper function to find a valid position for a droplet
    const findValidPosition = (isLeftSide: boolean, dimensions: { width: number, height: number }, existingDroplets: RectangleState[], attempt = 0): { x: number, y: number } | null => {
      if (attempt > 50) return null; // Prevent infinite loops
      
      // Calculate vertical position with some randomness
      const verticalRange = window.innerHeight - dimensions.height - 200;
      const y = cardTop + (verticalRange * Math.random()) + (Math.random() - 0.5) * 100;
      
      // Calculate horizontal position
      let x;
      const horizontalVariation = Math.random() * 100;
      if (isLeftSide) {
        x = cardLeft - buffer - dimensions.width / 2 - horizontalVariation;
      } else {
        x = cardRight + buffer + dimensions.width / 2 + horizontalVariation;
      }
      
      const newPos = { x, y };
      
      if (!doesOverlap(newPos, dimensions, existingDroplets)) {
        return newPos;
      }
      
      // If position is invalid, try again
      return findValidPosition(isLeftSide, dimensions, existingDroplets, attempt + 1);
    };
    
    // Only calculate positions if they haven't been calculated for this card
    if (!initialPositionsRef.current.length) {
      const entries: RectangleState[] = [];
      
      // Try to place each entry
      currentCard.entries.forEach((entry, i) => {
        const dimensions = calculateDimensions(entry.entry_text);
        const isLeftSide = i % 2 === 0;
        
        const position = findValidPosition(isLeftSide, dimensions, entries);
        
        if (position) {
          entries.push({
            position,
            dimensions,
            entry: { text: entry.entry_text },
            opacity: 0,
            scale: 0.6,
            initialDimensions: dimensions
          });
        }
      });
      
      // Store the initial positions
      initialPositionsRef.current = entries;
      // Set initial state with all opacities at 0
      setRectangleStates(entries);

      // Create a random order for the rain effect
      const randomOrder = [...Array(entries.length).keys()]
        .sort(() => Math.random() - 0.5);

      // Gradually fade in entries in random order with increasing delays
      randomOrder.forEach((originalIndex, i) => {
        setTimeout(() => {
          setRectangleStates(prev => {
            const newStates = [...prev];
            if (newStates[originalIndex]) {
              newStates[originalIndex] = {
                ...initialPositionsRef.current[originalIndex],
                opacity: 1,
                scale: 1
              };
            }
            return newStates;
          });
        }, i * 800 + Math.random() * 400); // Stagger with some randomness
      });
    }
  }, [cards, gone, calculateDimensions]);

  // Add effect to animate cards when they're first loaded
  useEffect(() => {
    if (cards.length > 0) {
      console.log('Cards loaded, starting animation sequence. Cards count:', cards.length);
      
      // First set all cards to their initial off-screen position
      api.start(i => {
        console.log(`Setting initial position for card ${i} to off-screen`);
        return {
          ...from(i),
          immediate: true
        };
      });
      
      // Then animate them in
      setTimeout(() => {
        console.log('Starting card animation after initial position set');
        animateCards();
        setTimeout(() => {
          console.log('Setting up entries after card animation');
          setupEntries();
        }, 500);
      }, 100);
    }
  }, [cards.length, animateCards, setupEntries, api]);

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
    
    // Update attractor position if it exists
    if (active && attractorRef.current) {
      Matter.Body.setPosition(attractorRef.current, {
        x: window.innerWidth / 2 + mx,
        y: window.innerHeight / 2
      });
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

  // Replace physics initialization with our new setup
  useEffect(() => {
    if (cards.length > 0 && !isAnimating) {
      setupEntries();
    }
  }, [cards, isAnimating, setupEntries]);

  // Clean up old physics refs
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current = null;
      }
      if (renderRef.current) {
        renderRef.current = null;
      }
      if (runnerRef.current) {
        runnerRef.current = null;
      }
    };
  }, []);

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
    
    // Clear existing entries immediately
    setRectangleStates([]);
    // Clear stored positions
    initialPositionsRef.current = [];
    
    setIsAnimating(true);
    gone.add(topCardIndex);
    setSwipeOrder(prev => [...prev, topCardIndex]); // Add to swipe order
    
    // Update current card index
    const nextCardIndex = topCardIndex - 1;
    console.log('Next card index will be:', nextCardIndex);
    setCurrentCardIndex(nextCardIndex);
    
    // First trigger the card animation
    const lastAngles: number[] = [];
    api.start(i => {
      if (topCardIndex !== i) {
        const relPos = getRelativePosition(i);
        if (relPos >= 0) {
          const maxTilt = 6;
          let rot: number;
          do {
            rot = (Math.random() * 2 - 1) * maxTilt;
          } while (lastAngles.some(lastAngle => Math.abs(lastAngle - rot) < 2));
          
          lastAngles.push(rot);
          if (lastAngles.length > 3) lastAngles.shift();
          
          return {
            x: 0,
            y: 0, // Remove vertical offset
            scale: relPos === 0 ? 1 : relPos === 1 ? 0.5 : Math.max(0.2, 0.5 - (relPos - 1) * 0.05),
            rot,
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
          
          // Check if we've gone through all cards
          if (gone.size === cards.length) {
            setAllCardsSwiped(true);
          } else {
            // Set up new physics for next card after a small delay
            // Only do this once animation is complete
            setTimeout(() => {
              setupEntries();
            }, 300);
          }
        }
      };
    });
  }, [isAnimating, cards, currentCardIndex, gone, api, getRelativePosition, setupEntries, swipeOrder]);

  // Add goBack function
  const goBack = useCallback(() => {
    if (isAnimating || gone.size === 0) return;
    
    const now = Date.now();
    if (now - lastSwipeTime.current < 150) return;
    lastSwipeTime.current = now;
    
    setIsAnimating(true);
    
    // Get the most recently swiped card index
    const lastSwipedIndex = swipeOrder[swipeOrder.length - 1];
    gone.delete(lastSwipedIndex);
    setSwipeOrder(prev => prev.slice(0, -1)); // Remove from swipe order
    
    // Update current card index
    setCurrentCardIndex(lastSwipedIndex);
    
    // Clear existing entries and positions immediately
    setRectangleStates([]);
    initialPositionsRef.current = [];
    
    // Animate the card back into view
    api.start(i => {
      if (i === lastSwipedIndex) {
        return {
          x: 0,
          y: 0,
          rot: 0,
          scale: 1,
          config: { friction: 50, tension: 200 },
          onRest: () => {
            setIsAnimating(false);
            // Set up entries for the card we're going back to
            setupEntries();
          }
        };
      }
      return;
    });
  }, [isAnimating, gone, api, setupEntries, swipeOrder]);

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
      } else if (event.key === 'ArrowLeft') {
        console.log('Left arrow pressed');
        event.preventDefault();
        goBack();
      }
    };

    // Add tabindex to make the component focusable
    if (sceneRef.current) {
      sceneRef.current.tabIndex = 0;
      sceneRef.current.focus();
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isAnimating, cards.length, gone, swipeCard, goBack]);

  // Handle window resize
  useEffect(() => {
    const handleResize = debounce(() => {
      if (engineRef.current && attractorRef.current) {
        // Update the wrap bounds
        rectanglesRef.current.forEach(body => {
          if (body.plugin && body.plugin.wrap) {
            body.plugin.wrap.max = { 
              x: window.innerWidth, 
              y: window.innerHeight 
            };
          }
        });
        
        // Update attractor position
        Matter.Body.setPosition(attractorRef.current, {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2
        });
      }
    }, 250);
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Failsafe to prevent stuck state
  useEffect(() => {
    if (isAnimating) {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  const handleStartOver = () => {
    console.log('Starting over, resetting state');
    setAllCardsSwiped(false);
    setCurrentCardIndex(0);
    gone.clear();
    setSwipeOrder([]); // Clear swipe order
    
    // First set all cards to their initial off-screen position
    api.start(i => {
      console.log('Setting initial position for card', i);
      return {
        ...from(i),
        immediate: true
      };
    });
    
    // Then animate them in
    setTimeout(() => {
      console.log('Starting card animation');
      animateCards();
      setTimeout(() => {
        console.log('Setting up entries');
        setupEntries();
      }, 500);
    }, 100);
  };

  // Prevent default drag behavior
  const preventDrag = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };

  // Clear positions on component unmount
  useEffect(() => {
    return () => {
      initialPositionsRef.current = [];
    };
  }, []);

  if (!hasAccess) {
    return <IntroPage onAccessGranted={() => setHasAccess(true)} />;
  }

  if (cards.length === 0) return null;

  return (
    <div className="fixed inset-0 w-full h-full">
      <div 
        ref={sceneRef} 
        className="w-full h-full absolute inset-0 z-10 pointer-events-auto" 
      />
      
      {/* Add back arrow button */}
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
      
      <div className="w-full h-full absolute inset-0 z-20">
        {props.map(({ x, y, rot, scale }, i) => {
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
                marginTop: '40px',
                overflow: 'visible', 
                opacity: allCardsSwiped ? 0 : 1,
                transition: 'opacity 0.5s ease-out',
                pointerEvents: allCardsSwiped ? 'none' : 'auto',
                zIndex
              }}
            >
              <div style={{ position: 'relative' }}>
                {i === cards.length - 1 - [...gone].length && (
                  <CardText text={cards[i].text} linkie={cards[i].linkie} isHorizontal={cards[i].is_horizontal} />
                )}
                <animated.div
                  {...bind(i)}
                  style={{
                    transform: interpolate([rot, scale], trans),
                    backgroundColor: 'white',
                    width: cards[i].is_horizontal ? '775px' : '281.25px',
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
      <div className="absolute bottom-16 left-0 right-0 z-20">
        {cards.length > 0 && !allCardsSwiped && cards[cards.length - 1 - [...gone].length] && (
          <CommentInput 
            cardId={cards[cards.length - 1 - [...gone].length].card_id} 
            isSubmitting={isAnimating}
            onSubmitSuccess={() => {
              console.log('Comment submitted successfully');
            }}
            onSubmittingChange={(submitting) => {
              if (submitting) {
                swipeCard(1);
              }
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
              key={`entry-${index}-${currentCardIndex}`}
              text={rect.entry.text}
              position={rect.position}
              dimensions={rect.dimensions}
              index={index}
              opacity={rect.opacity}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StoryView;