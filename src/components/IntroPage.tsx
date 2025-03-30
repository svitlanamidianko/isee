import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface IntroPageProps {
  onAccessGranted: () => void;
}

const IntroPage: React.FC<IntroPageProps> = ({ onAccessGranted }) => {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accessCode === 'LEFTELBOW') {
      onAccessGranted();
    } else {
      setError('Incorrect access code');
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white/10 backdrop-blur-md p-8 rounded-xl shadow-lg max-w-md w-full mx-4"
      >
        <h1 className="text-3xl font-papyrus text-white mb-6 text-center">
          Welcome to the Story
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter access code"
              className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-white/50 font-papyrus"
            />
          </div>
          {error && (
            <p className="text-red-300 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-white/20 hover:bg-white/30 text-white font-papyrus py-2 rounded-lg transition-colors"
          >
            Enter
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default IntroPage; 