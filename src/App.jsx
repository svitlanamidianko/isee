import React from 'react';
import backgroundImage from './assets/japanese gradients/O.png';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import StoryView from './components/StoryView.tsx';

function App() {
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