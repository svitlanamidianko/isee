import React, { useState, useCallback, useRef } from 'react';
import Deck from './components/Deck/Deck';
import backgroundImage from './assets/japanese gradients/O.png';
import axios from 'axios';
import './App.css';
import { ToastContainer, toast } from 'react-toastify';
import ShaderText from './components/ShaderText';
import InputControls from './components/InputControls';
import './components/InputControls.css';
import flyButton from './assets/fly on button.png';
import { Routes, Route, Link } from 'react-router-dom';
import StoryView from './components/StoryView.tsx';
import { API_ENDPOINTS } from './config';
import { logApiCall } from './utils/apiLogger';

function App() {
  const [userInput, setUserInput] = useState('');
  const [currentGameId] = useState('game123');
  const [currentCardId, setCurrentCardId] = useState('');
  const userId = 'user123';
  const notifyMsg = (errorMsg) => toast(`
    Here what you submitted: ${userInput}
    Error: ${errorMsg}
  `);
  const [inputSettings, setInputSettings] = useState({
    fontSize: 76,
    fontFamily: 'Papyrus',
    color: '#666666',
    fontWeight: 400
  });
  const deckRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCollectiveButton, setShowCollectiveButton] = useState(false);

  const handleCardChange = useCallback((cardId) => {
    setCurrentCardId(cardId);
    console.log('♦️ Current card ID:', cardId);
  }, []);

  const handleSettingsChange = (setting, value) => {
    setInputSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSubmission = useCallback(async () => {
    if (!userInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      console.log('Submitting entry:', userInput);
      
      const response = await axios.post(API_ENDPOINTS.createUserEntry, {
        entry: userInput,
        user_id: userId,
        game_id: currentGameId,
        card_id: currentCardId
      });
      
      logApiCall('POST', API_ENDPOINTS.createUserEntry, {
        entry: userInput,
        user_id: userId,
        game_id: currentGameId,
        card_id: currentCardId
      }, response.data);
      
      setUserInput("");
      
      const remainingCards = deckRef.current?.getCardCount() || 0;
      console.log('♦️ Remaining cards:', remainingCards);
      
      if (remainingCards === 1) {
        if (deckRef.current) {
          console.log('Triggering final swipe');
          deckRef.current.triggerSwipe();
        }
        setTimeout(() => {
          setShowCollectiveButton(true);
          console.log('Setting show collective button to true');
        }, 1000);
      } else {
        setTimeout(() => {
          if (deckRef.current) {
            console.log('Triggering swipe');
            deckRef.current.triggerSwipe();
          } else {
            console.error('deckRef.current is null');
          }
        }, 800);
      }
      
    } catch (err) {
      console.error('Submission error:', err);
      logApiCall('POST', API_ENDPOINTS.createUserEntry, {
        entry: userInput,
        user_id: userId,
        game_id: currentGameId,
        card_id: currentCardId
      }, null, err);
      
      const errorMessage = err.message === 'Network Error' 
        ? 'Unable to connect to the server. Please make sure the server is running.'
        : err.response?.data?.message || 'An unexpected error occurred';
      notifyMsg(errorMessage);
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1200);
    }
  }, [userInput, userId, currentGameId, currentCardId, notifyMsg, isSubmitting]);

  // Add handler for Enter key
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default enter behavior
      handleSubmission();
    }
  }, [handleSubmission]);

  const handleSwipeComplete = useCallback(() => {
    handleSubmission();
  }, [handleSubmission]);

  return (
    <div 
      className="app-container" 
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <Routes>
        <Route path="/" element={<StoryView />} />
      </Routes>
    </div>
  );
}

export default App;



// Whispering soft winds
// Petals fall on quiet streams
// Sunset blushes gold