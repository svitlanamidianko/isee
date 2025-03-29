// Backend API configuration
export const API_BASE_URL = 'http://localhost:7777'; // Change this to your local backend URL


// API endpoints
export const API_ENDPOINTS = {
  cards: `${API_BASE_URL}/api/cards`,
  createUserEntry: `${API_BASE_URL}/api/createuserentry`,
  cardImage: (imagePath) => `${API_BASE_URL}/api/cards/${encodeURI(imagePath.split('/').pop() || '')}`
}; 