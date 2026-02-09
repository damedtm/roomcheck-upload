// api.js

const API_BASE = "https://lsnro81xgl.execute-api.us-east-2.amazonaws.com/prod";

// Helper to parse API Gateway proxy responses
function parseApiResponse(data) {
  try {
    return JSON.parse(data.body);
  } catch {
    return {};
  }
}

// ----------------------
// GET UPLOADS
// ----------------------
export async function getUploads(token) {
  const resp = await fetch(`${API_BASE}/admin/get-uploads`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await resp.json();
  const parsed = parseApiResponse(data);

  return parsed.items || [];
}

// ----------------------
// CREATE USER
// ----------------------
export async function createUser(formData) {
  const resp = await fetch(`${API_BASE}/admin/create-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData)
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create user");
  }

  return true;
}
