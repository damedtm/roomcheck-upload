// AddUserForm.jsx
import { useState } from "react";

export default function AddUserForm({ onCreateUser, creating, error, dorms }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("RA");
  const [dorm, setDorm] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateUser({
      firstName,
      lastName,
      email,
      role,
      dorm: role === "RA" ? dorm : "",
    });
  };

  return (
    <div style={{ marginTop: "10px" }}>
      <div
        style={{
          background: "white",
          borderRadius: "10px",
          padding: "24px 28px",
          maxWidth: "700px",
          margin: "0 auto",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        <h2>Add New User</h2>

        {error && (
          <div
            style={{
              background: "#ffebee",
              color: "#c62828",
              padding: "10px",
              borderRadius: "6px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
            <input
              type="text"
              placeholder="First Name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            />

            <input
              type="text"
              placeholder="Last Name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            />
          </div>

          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #ccc",
              marginBottom: "16px",
            }}
          />

          <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            >
              <option value="RA">RA</option>
              <option value="Admin">Admin</option>
            </select>

            {role === "RA" && (
              <select
                value={dorm}
                required
                onChange={(e) => setDorm(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                }}
              >
                <option value="">Select Dorm...</option>
                {dorms.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="submit"
            disabled={creating}
            style={{
              padding: "10px 18px",
              borderRadius: "6px",
              border: "none",
              background: creating ? "#90caf9" : "#1976d2",
              color: "white",
              cursor: creating ? "default" : "pointer",
              fontWeight: 500,
            }}
          >
            {creating ? "Creating..." : "Create User"}
          </button>
        </form>
      </div>
    </div>
  );
}
