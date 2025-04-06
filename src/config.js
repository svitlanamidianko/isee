// Backend API configuration
const isStaging = process.env.REACT_APP_USE_STAGING === 'true';

export const API_BASE_URL = isStaging 
  ? 'https://isee-api-staging-twilight-grass-3635.fly.dev'
  : 'http://localhost:7777';

// API endpoints
export const API_ENDPOINTS = {
  cards: `${API_BASE_URL}/api/cards`,
  createUserEntry: `${API_BASE_URL}/api/createuserentry`,
  cardImage: (imagePath) => `${API_BASE_URL}/api/cards/${encodeURI(imagePath.split('/').pop() || '')}`,
  storyView: `${API_BASE_URL}/api/story-view`,
  createEntry: `${API_BASE_URL}/api/createentry`
}; 