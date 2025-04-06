import { useState, useCallback, useEffect, useRef } from 'react';

interface Entry {
  entry_text: string;
}

interface Card {
  entries: Entry[];
  is_horizontal: boolean;
}

interface EntryState {
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  text: string;
  opacity: number;
  scale: number;
}

export const useEntries = (card: Card | null) => {
  const [entryStates, setEntryStates] = useState<EntryState[]>([]);
  const [shouldShowEntries, setShouldShowEntries] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Add debug logging
  useEffect(() => {
    console.log('useEntries received card:', card);
    if (card) {
      console.log('Card entries:', card.entries);
    }
  }, [card]);

  // Calculate dimensions based on text length
  const calculateDimensions = useCallback((text: string) => {
    const constantWidth = 160;
    const fontSize = 18;
    const lineHeight = fontSize * 1.4;
    const avgCharsPerLine = constantWidth / (fontSize * 0.5);
    
    const words = text.split(' ');
    let lines = 1;
    let currentLineLength = 0;
    
    words.forEach(word => {
      if (currentLineLength + word.length + 1 <= avgCharsPerLine) {
        currentLineLength += word.length + 1;
      } else {
        lines++;
        currentLineLength = word.length;
      }
    });
    
    const textHeight = Math.ceil(lines * lineHeight);
    const paddingVertical = 36;
    const minHeight = 60;
    const variation = (Math.random() * 10) + 10;
    
    return {
      width: constantWidth,
      height: Math.floor(Math.max(minHeight, textHeight + paddingVertical + variation))
    };
  }, []);

  // Calculate entry positions
  const calculateEntryPositions = useCallback((
    entries: Entry[],
    cardDimensions: { width: number; height: number }
  ): EntryState[] => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const cardLeft = centerX - cardDimensions.width / 2;
    const cardRight = centerX + cardDimensions.width / 2;
    const cardTop = centerY - cardDimensions.height / 2;
    
    const buffer = 40;
    const positions: EntryState[] = [];
    
    entries.forEach((entry, index) => {
      const dimensions = calculateDimensions(entry.entry_text);
      const isLeftSide = index % 2 === 0;
      
      const verticalRange = window.innerHeight - dimensions.height - 200;
      const y = cardTop + (verticalRange * Math.random()) + (Math.random() - 0.5) * 100;
      
      const horizontalVariation = Math.random() * 100;
      const x = isLeftSide
        ? cardLeft - buffer - dimensions.width / 2 - horizontalVariation
        : cardRight + buffer + dimensions.width / 2 + horizontalVariation;
      
      // Check for overlaps with existing positions
      let attempts = 0;
      let finalY = y;
      while (attempts < 10 && positions.some(pos => {
        const dy = Math.abs(pos.position.y - finalY);
        return dy < dimensions.height;
      })) {
        finalY = cardTop + (verticalRange * Math.random());
        attempts++;
      }
      
      positions.push({
        position: { x, y: finalY },
        dimensions,
        text: entry.entry_text,
        opacity: 0,
        scale: 0.6
      });
    });
    
    return positions;
  }, [calculateDimensions]);

  // Setup entries whenever the card changes
  useEffect(() => {
    // Clear any existing timeout when card changes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Reset show state when card changes
    setShouldShowEntries(false);

    if (!card || !card.entries) {
      setEntryStates([]);
      return;
    }

    const cardDimensions = {
      width: card.is_horizontal ? 775 : 281.25,
      height: 506.25
    };

    // Calculate all positions first
    const positions = calculateEntryPositions(card.entries, cardDimensions);
    setEntryStates(positions);

    // Set a timeout to show entries after 3 seconds
    timeoutRef.current = setTimeout(() => {
      setShouldShowEntries(true);
      
      // Animate entries in with random order and longer delays
      const randomOrder = [...Array(positions.length).keys()].sort(() => Math.random() - 0.5);
      
      randomOrder.forEach((index, i) => {
        setTimeout(() => {
          setEntryStates(prev => {
            const newStates = [...prev];
            if (newStates[index]) {
              newStates[index] = {
                ...newStates[index],
                opacity: 1,
                scale: 1
              };
            }
            return newStates;
          });
        }, i * 800 + Math.random() * 400); // Increased delay between entries (800ms base + random 0-400ms)
      });
    }, 3000); // 3 second initial delay

    // Cleanup function to clear timeout if component unmounts or card changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [card, calculateEntryPositions]);

  // Only return entry states if we should show them
  return shouldShowEntries ? entryStates : [];
}; 