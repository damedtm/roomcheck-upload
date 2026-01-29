import React from "react";

export default function Sidebar({ activePage, setActivePage }) {
  const buttonStyle = (page) => ({
    padding: "12px",
    background: activePage === page ? "#1976d2" : "#333",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    textAlign: "left",
    width: "100%"
  });

  return (
    <div
      style={{
        width: "240px",
        background: "#1e1e1e",
        color: "white",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "20px"
      }}
    >
      <h2 style={{ margin: 0 }}>Admin Dashboard</h2>

      <button style={buttonStyle("addUser")} onClick={() => setActivePage("addUser")}>
        ➕ Create User
      </button>

      <button style={buttonStyle("manageUsers")} onClick={() => setActivePage("manageUsers")}>
        👥 Manage Users
      </button>

      <button style={buttonStyle("settings")} onClick={() => setActivePage("settings")}>
        ⚙️ Settings
      </button>
    </div>
  );
}
