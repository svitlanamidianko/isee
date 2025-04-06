// Backend API configuration
const isStaging = process.env.REACT_APP_USE_STAGING === 'true';
console.log('Environment variable REACT_APP_USE_STAGING:', process.env.REACT_APP_USE_STAGING);
console.log('isStaging:', isStaging);

export const API_BASE_URL = isStaging 
  ? 'https://isee-api-staging-twilight-grass-3635.fly.dev'
  : 'http://localhost:7777';
console.log('API_BASE_URL:', API_BASE_URL);

// API endpoints
export const API_ENDPOINTS = {
  cards: `${API_BASE_URL}/api/cards`,
  createUserEntry: `${API_BASE_URL}/api/createuserentry`,
  cardImage: (imagePath) => `${API_BASE_URL}/api/cards/${encodeURI(imagePath.split('/').pop() || '')}`,
  storyView: `${API_BASE_URL}/api/story-view`,
  createEntry: `${API_BASE_URL}/api/createentry`
}; 