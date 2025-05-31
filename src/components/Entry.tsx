console.log('Entry component file loaded');
import React from 'react';
import { motion } from 'framer-motion';

interface EntryProps {
  text: string;
  position: { x: number; y: number };
  dimensions: { width: number; height: number };
  opacity: number;
}

// Function to detect URLs in text
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
          className="text-blue-300 hover:text-blue-400 underline"
          onClick={(e) => e.stopPropagation()}
        >
          [link]
        </a>
      );
    }
    return part;
  });
};

const Entry: React.FC<EntryProps> = ({ text, position, dimensions, opacity }) => {
  console.log('Entry text:', text);
  return (
    <motion.div
      initial={{ 
        opacity: 0, 
        scale: 0.6,
        y: -50
      }}
      animate={{ 
        opacity, 
        scale: 1,
        y: 0
      }}
      transition={{ 
        duration: 1.2, // Slightly faster animation
        ease: [0.23, 1, 0.32, 1],
        opacity: { duration: 1 },
        scale: { duration: 1 }
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
        {detectAndReplaceUrl(text)}
      </div>
    </motion.div>
  );
};

export default React.memo(Entry); 