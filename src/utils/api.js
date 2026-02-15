import DOMPurify from 'dompurify';
import config from '../config/config';

const API_BASE_URL = config.api.baseUrl;
const MAX_RETRIES = config.api.retries || 3;
const TIMEOUT = config.api.timeout || 30000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return DOMPurify.sanitize(input);
  }
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
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

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
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

const apiCall = async (url, options = {}, retries = MAX_RETRIES) => {
  let lastError;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);

      if (response.ok) {
        return response;
      }

      if (response.status >= 400 && response.status < 500) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error: ${response.status} ${response.statusText}`);
      }

      if (i < retries - 1) {
        const backoffTime = Math.min(1000 * Math.pow(2, i), 10000);
        console.log(`Retry attempt ${i + 1} after ${backoffTime}ms`);
        await sleep(backoffTime);
        continue;
      }

      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error;

      if (error.message.includes('Error: 4')) {
        throw error;
      }

      if (i < retries - 1 && (error.message.includes('timeout') || error.message.includes('fetch') || error.message.includes('NetworkError'))) {
        const backoffTime = Math.min(1000 * Math.pow(2, i), 10000);
        console.log(`Retry attempt ${i + 1} after ${backoffTime}ms due to: ${error.message}`);
        await sleep(backoffTime);
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('Request failed after retries');
};

export const logError = async (error, context = {}) => {
  if (!config.errorLogging?.enabled) return;
  try {
    const errorData = {
      message: error.message || 'Unknown error',
      stack: error.stack || '',
      context: context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };
    if (config.errorLogging.logToConsole) {
      console.error('Error logged:', errorData);
    }
  } catch (err) {
    console.error('Failed to log error:', err);
  }
};

// Upload room
export const uploadRoom = async (formData, idToken) => {
  if (!formData) throw new Error('formData is required');
  if (!idToken) throw new Error('idToken is required');

  const requestBody = {
    dorm: String(formData.dorm || ''),
    room: String(formData.room || ''),
    notes: String(formData.notes || ''),
    imageBase64: String(formData.imageBase64 || ''),
    uploadedByUserId: String(formData.uploadedByUserId || ''),
    uploadedByName: String(formData.uploadedByName || ''),
    residentName: String(formData.residentName || ''),
    residentJNumber: String(formData.residentJNumber || ''),
    residentEmail: String(formData.residentEmail || ''),
    inspectionStatus: String(formData.inspectionStatus || ''),
    maintenanceIssues: Array.isArray(formData.maintenanceIssues) ? formData.maintenanceIssues : [],
    failureReasons: Array.isArray(formData.failureReasons) ? formData.failureReasons : []
  };

  const endpoint = `${API_BASE_URL}${config.api.endpoints.uploadRoom}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
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
    if (Array.isArray(data)) return data;
    return data.items || data.uploads || [];
  } catch (error) {
    console.error('Get uploads error:', error);
    throw new Error(error.message || 'Failed to fetch uploads');
  }
};

// Delete single upload
export const deleteUpload = async (upload, idToken) => {
  try {
    const response = await apiCall(`${API_BASE_URL}${config.api.endpoints.deleteUpload}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: upload.uploadedByUserId,
        timestamp: upload.uploadedAt,
        imageKey: upload.imageKey
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Delete upload error:', error);
    throw new Error(error.message || 'Failed to delete upload');
  }
};

// Bulk delete uploads
export const bulkDeleteUploads = async (uploads, idToken, onProgress) => {
  const results = { successful: [], failed: [] };

  for (let i = 0; i < uploads.length; i++) {
    try {
      await deleteUpload(uploads[i], idToken);
      results.successful.push(uploads[i]);
    } catch (error) {
      results.failed.push({ upload: uploads[i], error: error.message });
    }
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: uploads.length,
        successful: results.successful.length,
        failed: results.failed.length
      });
    }
  }
  return results;
};

// Create user (admin)
export const createUser = async (userData, idToken) => {
  try {
    const response = await apiCall(`${API_BASE_URL}${config.api.endpoints.createUser}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
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
    console.log('🔍 Fetching users...');

    const response = await apiCall(`${API_BASE_URL}${config.api.endpoints.getUsers}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('✅ API response:', data);

    if (Array.isArray(data)) {
      return data;
    } else if (data.users && Array.isArray(data.users)) {
      return data.users;
    } else {
      console.warn('⚠️ Unexpected response format:', data);
      return [];
    }
  } catch (error) {
    console.error('❌ Get users error:', error);
    throw new Error(error.message || 'Failed to fetch users');
  }
};

// Delete user (admin)
// FIXED: now sends both userId AND email, which the Lambda requires
export const deleteUser = async (userId, email, idToken) => {
  try {
    console.log('🗑️ Deleting user:', { userId, email });

    const response = await apiCall(`${API_BASE_URL}${config.api.endpoints.deleteUser}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, email })  // FIXED: Lambda requires both fields
    });
    return await response.json();
  } catch (error) {
    console.error('Delete user error:', error);
    throw new Error(error.message || 'Failed to delete user');
  }
};

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
  uploadRoom, getUploads, deleteUpload, bulkDeleteUploads,
  createUser, getUsers, deleteUser, healthCheck, logError
};