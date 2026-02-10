// AdminPage.jsx

import { useState, useEffect } from "react";
import { useAuth } from "react-oidc-context";

import AddUserForm from "./AddUserForm";
import ManageUsersTable from "./ManageUsersTable";
import ViewUploads from "./ViewUploads";
import { getUploads, createUser, deleteUpload } from "./api";

const DORMS = [
  "Alexander Hall",
  "Campbell South",
  "Campbell North",
  "Transitional Hall",
  "Dixon Hall",
  "Stewart Hall",
  "One University Place",
  "Walthall Lofts",
  "Courthouse Apartments"
];

export default function AdminPage() {
  const auth = useAuth();

  // SECTION STATE
  const [selectedSection, setSelectedSection] = useState("reports");
  const [userAction, setUserAction] = useState("view");

  // REPORTS STATE
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null); // NEW
  const [search, setSearch] = useState("");
  const [selectedDorm, setSelectedDorm] = useState("All");
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;
  const [dormsOpen, setDormsOpen] = useState(true);

  // USERS STATE
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState(null);

  // DELETE STATE
  const [deleting, setDeleting] = useState(false);

  // FETCH UPLOADS
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setLoadError(null);
        const items = await getUploads(auth.user.id_token);
        setUploads(items);
      } catch (err) {
        console.error("Error loading uploads:", err);
        setLoadError(err.message); // NEW - Show user-friendly error
      } finally {
        setLoading(false);
      }
    }

    if (auth.isAuthenticated) load();
  }, [auth.isAuthenticated, auth.user]);

  if (!auth.isAuthenticated) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        fontSize: "18px",
        color: "#666"
      }}>
        Loading authentication...
      </div>
    );
  }

  const handleCreateUser = async (formData) => {
    setCreatingUser(true);
    setCreateError(null);

    try {
      await createUser(formData);
      alert("✅ User created successfully!");
      setSelectedSection("users");
      setUserAction("view");
    } catch (err) {
      setCreateError(err.message);
      console.error("Create user error:", err);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUpload = async (upload) => {
    if (!window.confirm(`Are you sure you want to delete the upload for ${upload.dorm} Room ${upload.room}?`)) {
      return;
    }

    setDeleting(true);
    
    try {
      const userId = upload.uploadedByUserId;
      const timestamp = upload.uploadedAt;
      const imageKey = upload.imageKey;

      await deleteUpload(userId, timestamp, imageKey, auth.user.id_token);
      
      // Remove from local state
      setUploads((prev) => prev.filter((u) => u.uploadedAt !== timestamp));
      
      alert("✅ Upload deleted successfully!");
      
    } catch (err) {
      console.error("Delete failed:", err);
      alert(`❌ Delete Failed\n\n${err.message}`); // NEW - Better error message
    } finally {
      setDeleting(false);
    }
  };

  // Retry function for failed loads
  const handleRetry = () => {
    setLoadError(null);
    setLoading(true);
    getUploads(auth.user.id_token)
      .then(items => setUploads(items))
      .catch(err => setLoadError(err.message))
      .finally(() => setLoading(false));
  };

  // FILTER UPLOADS BY DORM
  const filteredUploads =
    selectedDorm === "All"
      ? uploads
      : uploads.filter((u) => u.dorm === selectedDorm);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f3f4f6" }}>
      
      {/* SIDEBAR */}
      <div
        style={{
          width: "280px",
          background: "white",
          borderRight: "1px solid #ddd",
          padding: "20px",
          overflowY: "auto",
          position: "fixed",
          top: 0,
          bottom: 0,
          left: 0
        }}
      >
        <h2 style={{ marginBottom: "20px", fontWeight: 700 }}>Admin Menu</h2>

        {/* DORM REPORTS */}
        <div
          onClick={() => {
            setSelectedSection("reports");
            setSelectedDorm("All");
            setPage(1);
          }}
          style={{
            padding: "10px 0",
            cursor: "pointer",
            fontWeight: selectedSection === "reports" ? "bold" : "normal"
          }}
        >
          Dorm Reports
        </div>

        {/* DORMS LIST */}
        <div
          onClick={() => setDormsOpen(!dormsOpen)}
          style={{
            padding: "10px 0",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "bold",
            marginTop: "10px"
          }}
        >
          Dorms
          <span>{dormsOpen ? "▼" : "▶"}</span>
        </div>

        {dormsOpen && (
          <div style={{ marginLeft: "10px" }}>
            {DORMS.map((dorm) => {
              const isActive =
                selectedSection === "reports" && selectedDorm === dorm;

              return (
                <div
                  key={dorm}
                  onClick={() => {
                    setSelectedSection("reports");
                    setSelectedDorm(dorm);
                    setPage(1);
                  }}
                  style={{
                    padding: "8px 10px",
                    cursor: "pointer",
                    borderRadius: "6px",
                    marginBottom: "4px",
                    background: isActive
                      ? "rgba(0, 102, 255, 0.12)"
                      : "transparent",
                    boxShadow: isActive
                      ? "0 0 8px rgba(0, 102, 255, 0.25)"
                      : "none",
                    fontWeight: isActive ? "bold" : "normal",
                    color: isActive ? "#003d99" : "#333"
                  }}
                >
                  {dorm}
                </div>
              );
            })}
          </div>
        )}

        {/* MANAGE USERS */}
        <div
          style={{
            padding: "10px 0",
            cursor: "pointer",
            fontWeight: "bold",
            marginTop: "20px"
          }}
        >
          Manage Users
        </div>

        <div style={{ marginLeft: "10px" }}>
          <div
            onClick={() => {
              setSelectedSection("users");
              setUserAction("add");
            }}
            style={{
              padding: "8px 10px",
              cursor: "pointer",
              borderRadius: "6px",
              marginBottom: "4px",
              background:
                selectedSection === "users" && userAction === "add"
                  ? "rgba(0, 102, 255, 0.12)"
                  : "transparent"
            }}
          >
            Add User
          </div>

          <div
            onClick={() => {
              setSelectedSection("users");
              setUserAction("view");
            }}
            style={{
              padding: "8px 10px",
              cursor: "pointer",
              borderRadius: "6px",
              marginBottom: "4px",
              background:
                selectedSection === "users" && userAction === "view"
                  ? "rgba(0, 102, 255, 0.12)"
                  : "transparent"
            }}
          >
            View Users
          </div>
        </div>

        {/* SIGN OUT */}
        <div style={{ marginTop: "30px" }}>
          <button
            onClick={() => auth.removeUser()}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #444",
              background: "white",
              cursor: "pointer"
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div
        style={{
          marginLeft: "300px",
          padding: "40px",
          width: "100%",
          overflowY: "auto"
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "10px" }}>
          Admin Dashboard
        </h1>

        <h2 style={{ textAlign: "center", color: "#555", marginBottom: "20px" }}>
          {selectedSection === "reports"
            ? "Dorm Reports"
            : userAction === "add"
            ? "Add New User"
            : "User Management"}
        </h2>

        {/* Logged in info */}
        <div
          style={{
            background: "white",
            padding: "16px 20px",
            borderRadius: "8px",
            marginBottom: "20px"
          }}
        >
          <p style={{ color: "#666" }}>
            Logged in as {auth.user.profile.email}
          </p>
        </div>

        {/* LOADING STATE */}
        {loading && selectedSection === "reports" ? (
          <div style={{
            background: "white",
            padding: "60px 20px",
            borderRadius: "8px",
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
            <p style={{ color: "#666", fontSize: "16px" }}>Loading reports...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : loadError && selectedSection === "reports" ? (
          /* ERROR STATE */
          <div style={{
            background: "#fee",
            border: "2px solid #fcc",
            padding: "30px",
            borderRadius: "8px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "48px", marginBottom: "10px" }}>❌</div>
            <h3 style={{ color: "#c00", marginBottom: "10px" }}>Failed to Load Reports</h3>
            <p style={{ color: "#666", marginBottom: "20px" }}>{loadError}</p>
            <button
              onClick={handleRetry}
              style={{
                padding: "10px 20px",
                background: "#3498db",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600"
              }}
            >
              🔄 Retry
            </button>
          </div>
        ) : selectedSection === "reports" ? (
          <ViewUploads
            uploads={filteredUploads}
            search={search}
            setSearch={setSearch}
            selectedDorm={selectedDorm}
            setSelectedDorm={setSelectedDorm}
            page={page}
            setPage={setPage}
            PER_PAGE={PER_PAGE}
            DORMS={DORMS}
            onDelete={handleDeleteUpload}
            deleting={deleting}
          />
        ) : userAction === "add" ? (
          <AddUserForm
            onCreateUser={handleCreateUser}
            creating={creatingUser}
            error={createError}
            dorms={DORMS}
          />
        ) : (
          <ManageUsersTable />
        )}
      </div>
    </div>
  );
}