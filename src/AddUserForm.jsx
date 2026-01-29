import { useState } from "react";

export default function AddUserForm({ onCreateUser, creating, error, dorms }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ra");
  const [dorm, setDorm] = useState("");
  const [toast, setToast] = useState(null);

  const handleSubmit = async () => {
    try {
      await onCreateUser({
        firstName,
        lastName,
        email,
        role,
        dorm
      });

      setToast({ type: "success", message: "User created successfully" });

      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("ra");
      setDorm("");
    } catch (err) {
      setToast({ type: "error", message: err.message });
    }
  };

  return (
    <div style={{ background: "white", padding: 20, borderRadius: 8 }}>
      <h2>Create New User</h2>

      {toast && (
        <div
          style={{
            padding: 10,
            marginBottom: 10,
            borderRadius: 6,
            background: toast.type === "error" ? "#ffe5e5" : "#e5ffe8"
          }}
        >
          {toast.message}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: 10,
            marginBottom: 10,
            borderRadius: 6,
            background: "#ffe5e5",
            color: "#a00"
          }}
        >
          {error}
        </div>
      )}

      <input
        placeholder="First Name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <input
        placeholder="Last Name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />

      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      >
        <option value="ra">RA</option>
        <option value="admin">Admin</option>
      </select>

      {role === "ra" && (
        <select
          value={dorm}
          onChange={(e) => setDorm(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        >
          <option value="">Select Dorm</option>
          {dorms.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      )}

      <button
        onClick={handleSubmit}
        disabled={creating}
        style={{
          width: "100%",
          padding: 12,
          background: creating ? "#9bbce0" : "#1976d2",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: creating ? "default" : "pointer"
        }}
      >
        {creating ? "Creating..." : "Create User"}
      </button>
    </div>
  );
}
