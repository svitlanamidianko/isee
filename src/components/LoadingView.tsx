import React from 'react';

const LoadingView: React.FC = () => {
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center text-white" 
      style={{ 
        fontFamily: 'Papyrus',
        fontSize: '1.5rem',
        textAlign: 'center',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
      }}
    >
      baking svitlana-ing home-cooked app. wait a sec
    </div>
  );
};

export default LoadingView; 