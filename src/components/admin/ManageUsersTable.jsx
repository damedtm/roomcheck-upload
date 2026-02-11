// ManageUsersTable.jsx - FIXED VERSION
// Uses backend API instead of direct DynamoDB access

import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext"; // FIXED: Changed from react-oidc-context
import { getUsers, deleteUser } from "../../utils/api";

export default function ManageUsersTable() {
  const { isAuthenticated, user, loading: authLoading } = useAuth(); // FIXED: Use AuthContext

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("admins");
  const [deleting, setDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 5;

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        setError(null);
        
        const fetchedUsers = await getUsers(user.id_token); // FIXED: Use user.id_token
        setUsers(fetchedUsers);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated && user) { // FIXED: Check both
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]); // FIXED: Updated dependencies

  function paginate(list) {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return list.slice(start, start + USERS_PER_PAGE);
  }

  async function handleDelete(username, email) {
    const confirmed = window.confirm(
      `Are you sure you want to delete user ${email}?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    
    try {
      await deleteUser(username, user.id_token); // FIXED: Use user.id_token
      
      // Remove from local state
      setUsers(prev => prev.filter(u => u.username !== username));
      
      alert("✓ User deleted successfully");
    } catch (err) {
      console.error("Delete error:", err);
      alert(`✗ Failed to delete user\n\n${err.message}`);
    } finally {
      setDeleting(false);
    }
  }

  function handleEdit(user) {
    alert("Edit user feature coming soon");
  }

  if (authLoading || loading) {
    return (
      <div style={{ 
        background: "white", 
        padding: 60, 
        borderRadius: 8,
        textAlign: "center"
      }}>
        <div style={{
          width: "50px",
          height: "50px",
          border: "4px solid #f3f3f3",
          borderTop: "4px solid #3498db",
          borderRadius: "50%",
          margin: "0 auto 20px auto",
          animation: "spin 1s linear infinite"
        }}></div>
        <p style={{ color: "#666" }}>Loading users...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: "#fee",
        border: "2px solid #fcc",
        padding: 30,
        borderRadius: 8,
        textAlign: "center"
      }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>✗</div>
        <h3 style={{ color: "#c00", marginBottom: 10 }}>Failed to Load Users</h3>
        <p style={{ color: "#666", marginBottom: 20 }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 20px",
            background: "#3498db",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const admins = users.filter((u) => u.role?.toLowerCase().includes("admin"));
  const ras = users.filter((u) => u.role?.toLowerCase().includes("ra"));

  const buttonStyle = {
    padding: "6px 12px",
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#f7f7f7",
    cursor: "pointer",
    fontSize: "14px"
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    background: "#ffdddd",
    border: "1px solid #ffaaaa",
    color: "#b30000"
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: "#007bff",
    color: "white",
    border: "1px solid #006ae0"
  };

  const tableRowStyle = {
    background: "white",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  };

  const tableCellStyle = {
    padding: "12px 16px"
  };

  const list = view === "admins" ? admins : ras;

  return (
    <div style={{ background: "white", padding: 20, borderRadius: 8 }}>
      <h2 style={{ marginBottom: 20 }}>Manage Users</h2>

      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => {
            setView("admins");
            setCurrentPage(1);
          }}
          style={view === "admins" ? primaryButtonStyle : buttonStyle}
        >
          View Admins ({admins.length})
        </button>

        <button
          onClick={() => {
            setView("ras");
            setCurrentPage(1);
          }}
          style={{ 
            marginLeft: 10, 
            ...(view === "ras" ? primaryButtonStyle : buttonStyle) 
          }}
        >
          View RAs ({ras.length})
        </button>
      </div>

      <h3 style={{ marginBottom: 15 }}>
        {view === "admins" ? "Administrators" : "Resident Assistants"}
      </h3>

      {list.length === 0 ? (
        <p style={{ color: "#666", padding: 20 }}>
          No {view === "admins" ? "administrators" : "RAs"} found.
        </p>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "separate",
                borderSpacing: "0 8px",
                minWidth: "600px"
              }}
            >
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th style={tableCellStyle}>Email</th>
                  {view === "ras" && <th style={tableCellStyle}>Dorm</th>}
                  <th style={tableCellStyle}>Role</th>
                  <th style={tableCellStyle}>Status</th>
                  <th style={tableCellStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginate(list).map((u, index) => (
                  <tr key={u.username || index} style={tableRowStyle}>
                    <td style={tableCellStyle}>{u.email || u.username}</td>
                    {view === "ras" && (
                      <td style={tableCellStyle}>{u.dorm || "-"}</td>
                    )}
                    <td style={tableCellStyle}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        background: u.role?.toLowerCase().includes("admin") ? "#e3f2fd" : "#fff3e0",
                        fontSize: 12,
                        fontWeight: 500
                      }}>
                        {u.role || "Unknown"}
                      </span>
                    </td>
                    <td style={tableCellStyle}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: 4,
                        background: u.enabled ? "#e8f5e9" : "#ffebee",
                        color: u.enabled ? "#2e7d32" : "#c62828",
                        fontSize: 12,
                        fontWeight: 500
                      }}>
                        {u.enabled ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td style={tableCellStyle}>
                      <div style={{ 
                        display: "flex", 
                        gap: 10,
                        flexWrap: "wrap"
                      }}>
                        <button
                          onClick={() => handleEdit(u)}
                          style={buttonStyle}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(u.username, u.email)}
                          disabled={deleting}
                          style={{
                            ...dangerButtonStyle,
                            opacity: deleting ? 0.6 : 1,
                            cursor: deleting ? "not-allowed" : "pointer"
                          }}
                        >
                          {deleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {list.length > USERS_PER_PAGE && (
            <div style={{ 
              marginTop: 20, 
              display: "flex", 
              justifyContent: "center",
              alignItems: "center",
              gap: 10
            }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                style={{
                  ...buttonStyle,
                  opacity: currentPage === 1 ? 0.5 : 1,
                  cursor: currentPage === 1 ? "not-allowed" : "pointer"
                }}
              >
                Previous
              </button>

              <span style={{ fontSize: 14, color: "#666" }}>
                Page {currentPage} of {Math.ceil(list.length / USERS_PER_PAGE)}
              </span>

              <button
                disabled={currentPage * USERS_PER_PAGE >= list.length}
                onClick={() => setCurrentPage(currentPage + 1)}
                style={{
                  ...buttonStyle,
                  opacity: currentPage * USERS_PER_PAGE >= list.length ? 0.5 : 1,
                  cursor: currentPage * USERS_PER_PAGE >= list.length ? "not-allowed" : "pointer"
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
