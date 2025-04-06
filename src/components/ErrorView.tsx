import React from 'react';

interface ErrorViewProps {
  error: string;
  onRetry?: () => void;
}

const ErrorView: React.FC<ErrorViewProps> = ({ error, onRetry }) => {
  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center gap-6"
      style={{ 
        fontFamily: 'Papyrus',
        color: '#FF6B6B',  // A softer red that matches our aesthetic
      }}
    >
      <div 
        className="text-center px-8 py-6 rounded-xl bg-white/10 backdrop-blur-md"
        style={{
          textShadow: '0 2px 4px rgba(0,0,0,0.2)',
          border: '2px solid rgba(255,107,107,0.3)'  // Matching the error color
        }}
      >
        <p className="text-2xl mb-2">oops! something went wrong</p>
        <p className="text-lg opacity-80">{error}</p>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-6 py-3 rounded-lg bg-white/20 hover:bg-white/30 
                     transition-all duration-300 text-white backdrop-blur-sm"
          style={{
            fontFamily: 'Papyrus',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)',
            border: '2px solid rgba(255,255,255,0.2)'
          }}
        >
          try again
        </button>
      )}
    </div>
  );
};

export default ErrorView; 