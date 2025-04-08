// Backend API configuration
const ENV = import.meta.env.MODE || 'development';
console.log('Current environment:', ENV);

// Use staging based on environment variable
const isStaging = import.meta.env.VITE_USE_STAGING === 'true';
console.log('isStaging:', isStaging);

export const API_BASE_URL = isStaging 
  ? 'https://isee-api-staging-twilight-grass-3635.fly.dev'
  : 'http://localhost:5000';
console.log('Using API_BASE_URL:', API_BASE_URL);

// API endpoints
export const API_ENDPOINTS = {
  cards: `${API_BASE_URL}/api/cards`,
  createUserEntry: `${API_BASE_URL}/api/createuserentry`,
  cardImage: (imagePath) => `${API_BASE_URL}/api/cards/${encodeURI(imagePath.split('/').pop() || '')}`,
  storyView: `${API_BASE_URL}/api/story-view`,
  createEntry: `${API_BASE_URL}/api/createentry`
}; 