import DOMPurify from 'dompurify';
import config from '../config/config';

const API_BASE_URL = config.api.baseUrl;
const MAX_RETRIES = config.api.retries;
const TIMEOUT = config.api.timeout;

// Utility function for exponential backoff
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Sanitize input to prevent XSS
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return DOMPurify.sanitize(input);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  return input;
};

// Enhanced fetch with timeout
const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    throw error;
  }
};

// Enhanced API call with retry logic
const apiCall = async (url, options = {}, retries = MAX_RETRIES) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      
      // If successful, return response
      if (response.ok) {
        return response;
      }

      // If 4xx error (client error), don't retry
      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.status} ${response.statusText}`);
      }

      // If 5xx error (server error) and not last retry, retry with backoff
      if (i < retries - 1) {
        const backoffTime = Math.min(1000 * Math.pow(2, i), 10000); // Max 10 seconds
        console.log(`Retry attempt ${i + 1} after ${backoffTime}ms`);
        await sleep(backoffTime);
        continue;
      }

      // Last retry failed
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    } catch (error) {
      // If network error and not last retry, retry with backoff
      if (i < retries - 1 && (error.message.includes('timeout') || error.message.includes('fetch'))) {
        const backoffTime = Math.min(1000 * Math.pow(2, i), 10000);
        console.log(`Retry attempt ${i + 1} after ${backoffTime}ms due to: ${error.message}`);
        await sleep(backoffTime);
        continue;
      }

      // Log error to backend if enabled
      if (config.errorLogging.enabled && config.errorLogging.logToBackend) {
        logError(error, { url, options }).catch(console.error);
      }

      throw error;
    }
  }
};

// Log errors to backend
export const logError = async (error, context = {}) => {
  if (!config.errorLogging.enabled) return;

  try {
    const errorData = {
      message: error.message || 'Unknown error',
      stack: error.stack || '',
      context: sanitizeInput(context),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Log to console in development
    if (config.errorLogging.logToConsole) {
      console.error('Error logged:', errorData);
    }

    // Log to backend
    if (config.errorLogging.logToBackend) {
      await fetchWithTimeout(`${API_BASE_URL}${config.api.endpoints.logError}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      });
    }
  } catch (err) {
    console.error('Failed to log error:', err);
  }
};

// Upload room inspection
export const uploadRoom = async (formData, idToken) => {
  try {
    const response = await apiCall(`${API_BASE_URL}${config.api.endpoints.uploadRoom}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`
      },
      body: formData
    });

    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(error.message || 'Failed to upload room inspection');
  }
};

// Get uploads (admin)
export const getUploads = async (idToken) => {
  try {
    const response = await apiCall(`${API_BASE_URL}${config.api.endpoints.getUploads}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return data.uploads || [];
  } catch (error) {
    console.error('Get uploads error:', error);
    throw new Error(error.message || 'Failed to fetch uploads');
  }
};

// Delete single upload
export const deleteUpload = async (uploadId, idToken) => {
  try {
    const sanitizedId = sanitizeInput(uploadId);
    
    const response = await apiCall(`${API_BASE_URL}${config.api.endpoints.deleteUpload}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uploadId: sanitizedId })
    });

    return await response.json();
  } catch (error) {
    console.error('Delete upload error:', error);
    throw new Error(error.message || 'Failed to delete upload');
  }
};

// Bulk delete uploads
export const bulkDeleteUploads = async (uploadIds, idToken, onProgress) => {
  const results = {
    successful: [],
    failed: []
  };

  for (let i = 0; i < uploadIds.length; i++) {
    try {
      await deleteUpload(uploadIds[i], idToken);
      results.successful.push(uploadIds[i]);
      
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: uploadIds.length,
          successful: results.successful.length,
          failed: results.failed.length
        });
      }
    } catch (error) {
      results.failed.push({
        id: uploadIds[i],
        error: error.message
      });
      
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: uploadIds.length,
          successful: results.successful.length,
          failed: results.failed.length
        });
      }
    }
  }

  return results;
};

// Create user (admin)
export const createUser = async (userData, idToken) => {
  try {
    const sanitizedData = sanitizeInput(userData);
    
    const response = await apiCall(`${API_BASE_URL}${config.api.endpoints.createUser}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sanitizedData)
    });

    return await response.json();
  } catch (error) {
    console.error('Create user error:', error);
    throw new Error(error.message || 'Failed to create user');
  }
};

// Get all users (admin)
export const getUsers = async (idToken) => {
  try {
    const response = await apiCall(`${API_BASE_URL}${config.api.endpoints.getUsers}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Get users error:', error);
    throw new Error(error.message || 'Failed to fetch users');
  }
};

// Delete user (admin) - BACKEND IMPLEMENTATION
export const deleteUser = async (username, idToken) => {
  try {
    const sanitizedUsername = sanitizeInput(username);
    
    const response = await apiCall(`${API_BASE_URL}${config.api.endpoints.deleteUser}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: sanitizedUsername })
    });

    return await response.json();
  } catch (error) {
    console.error('Delete user error:', error);
    throw new Error(error.message || 'Failed to delete user');
  }
};

// Health check
export const healthCheck = async () => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}${config.api.endpoints.health}`, {
      method: 'GET'
    });

    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

export default {
  uploadRoom,
  getUploads,
  deleteUpload,
  bulkDeleteUploads,
  createUser,
  getUsers,
  deleteUser,
  healthCheck,
  logError
};