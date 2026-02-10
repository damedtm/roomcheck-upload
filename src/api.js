// api.js

const API_BASE = "https://lsnro81xgl.execute-api.us-east-2.amazonaws.com/prod";

// Helper function to parse errors
function getErrorMessage(error, defaultMessage) {
  if (!error) return defaultMessage;
  
  // Network errors
  if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
    return "Network error. Please check your internet connection and try again.";
  }
  
  // Timeout errors
  if (error.message?.includes('timeout')) {
    return "Request timed out. Please try again.";
  }
  
  // API error with message
  if (error.message) {
    return error.message;
  }
  
  return defaultMessage;
}

export async function getUploads(idToken) {
  try {
    const res = await fetch(`${API_BASE}/admin/get-uploads`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`
      }
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error("Your session has expired. Please log in again.");
    }

    if (!res.ok) {
      throw new Error(`Failed to load uploads. Server returned ${res.status}.`);
    }

    const data = await res.json();
    return data.items || [];
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch uploads. Please try again."));
  }
}

export async function createUser(formData) {
  try {
    const res = await fetch(`${API_BASE}/create-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    if (res.status === 400) {
      const errData = await res.json();
      throw new Error(errData.message || "Invalid user data. Please check all fields.");
    }

    if (res.status === 409) {
      throw new Error("A user with this email already exists.");
    }

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || "Failed to create user. Please try again.");
    }

    return res.json();
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to create user. Please try again."));
  }
}

export async function deleteUpload(userId, timestamp, imageKey, idToken) {
  try {
    const res = await fetch(`${API_BASE}/admin/delete-upload`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify({ 
        userId, 
        timestamp, 
        imageKey 
      })
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error("Your session has expired. Please log in again.");
    }

    if (res.status === 400) {
      const errData = await res.json();
      throw new Error(errData.message || "Invalid delete request. Missing required data.");
    }

    if (res.status === 404) {
      throw new Error("Upload not found. It may have already been deleted.");
    }

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || "Failed to delete upload. Please try again.");
    }
    
    return res.json();
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to delete upload. Please try again."));
  }
}

export async function uploadRoom(formData, idToken) {
  try {
    const res = await fetch(`${API_BASE}/upload-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${idToken}`
      },
      body: JSON.stringify(formData)
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error("Your session has expired. Please log in again.");
    }

    if (res.status === 400) {
      const errData = await res.json();
      throw new Error(errData.message || "Invalid upload data. Please check all required fields.");
    }

    if (res.status === 413) {
      throw new Error("Image file is too large. Please use a smaller image.");
    }

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || "Failed to upload inspection. Please try again.");
    }

    return res.json();
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to upload inspection. Please try again."));
  }
}