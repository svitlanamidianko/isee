// API call logging utility
export const logApiCall = (method, url, data = null, response = null, error = null) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    method,
    url,
    data,
    response,
    error: error ? {
      message: error.message,
      status: error.status,
      stack: error.stack
    } : null
  };

  // Log with different colors for success/error
  if (error) {
    console.error('🔴 API Call Failed:', logEntry);
  } else {
    console.log('🟢 API Call Success:', logEntry);
  }

  return logEntry;
}; 