import React from 'react';
import { motion } from 'framer-motion';

interface CardTextProps {
  text: string;
  linkie: string;
  isHorizontal: boolean;
}

const CardText: React.FC<CardTextProps> = ({ text, linkie, isHorizontal }) => {
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
            fontSize: isHorizontal ? '1.875rem' : '1.55rem'
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

export default CardText; 