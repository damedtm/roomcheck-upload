// AdminPage.jsx - FIXED VERSION

import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext"; // FIXED: Changed from react-oidc-context

import AddUserForm from "./AddUserForm";
import ManageUsersTable from "./ManageUsersTable";
import ViewUploads from "./ViewUploads";
import { getUploads, createUser, deleteUpload } from "../../utils/api";

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

// Simple SVG Icons
const BarChartIcon = ({ size = 24, color = "#333" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="20" x2="12" y2="10"></line>
    <line x1="18" y1="20" x2="18" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="16"></line>
  </svg>
);

const UsersIcon = ({ size = 24, color = "#333" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const LogOutIcon = ({ size = 24, color = "#333" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const MenuIcon = ({ size = 24, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
);

const ChevronLeftIcon = ({ size = 20, color = "#333" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"></polyline>
  </svg>
);

const ChevronRightIcon = ({ size = 20, color = "#333" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const DownloadIcon = ({ size = 18, color = "#fff" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

export default function AdminPage() {
  const { isAuthenticated, user, loading, logout } = useAuth(); // FIXED: Use AuthContext

  // SECTION STATE
  const [selectedSection, setSelectedSection] = useState("reports");
  const [userAction, setUserAction] = useState("view");

  // SIDEBAR STATE
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // For mobile overlay

  // REPORTS STATE
  const [uploads, setUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [loadError, setLoadError] = useState(null);
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
        setLoadingUploads(true);
        setLoadError(null);
        const items = await getUploads(user.id_token); // FIXED: Use user.id_token from AuthContext
        setUploads(items);
      } catch (err) {
        console.error("Error loading uploads:", err);
        setLoadError(err.message);
      } finally {
        setLoadingUploads(false);
      }
    }

    if (isAuthenticated && user) { // FIXED: Check isAuthenticated and user
      load();
    }
  }, [isAuthenticated, user]); // FIXED: Updated dependencies

  // FIXED: Better loading state
  if (loading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        flexDirection: "column",
        gap: "20px"
      }}>
        <div style={{
          width: "50px",
          height: "50px",
          border: "4px solid #f3f3f3",
          borderTop: "4px solid #3498db",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
        <div style={{ fontSize: "18px", color: "#666" }}>
          Loading authentication...
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // FIXED: Redirect to login if not authenticated
  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
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

      await deleteUpload(userId, timestamp, imageKey, user.id_token); // FIXED: Use user.id_token
      
      setUploads((prev) => prev.filter((u) => u.uploadedAt !== timestamp));
      
      alert("✅ Upload deleted successfully!");
      
    } catch (err) {
      console.error("Delete failed:", err);
      alert(`❌ Delete Failed\n\n${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleRetry = () => {
    setLoadError(null);
    setLoadingUploads(true);
    getUploads(user.id_token) // FIXED: Use user.id_token
      .then(items => setUploads(items))
      .catch(err => setLoadError(err.message))
      .finally(() => setLoadingUploads(false));
  };

  // Handle menu item click - close mobile sidebar
  const handleMenuClick = (section, dorm = null, action = null) => {
    setSelectedSection(section);
    if (dorm !== null) setSelectedDorm(dorm);
    if (action !== null) setUserAction(action);
    setPage(1);
    setSidebarOpen(false); // Close mobile sidebar
  };

  const filteredUploads =
    selectedDorm === "All"
      ? uploads
      : uploads.filter((u) => u.dorm === selectedDorm);

  // CSV EXPORT FUNCTION
  const handleExportCSV = () => {
    // Get the filtered data
    const dataToExport = filteredUploads;
    
    if (dataToExport.length === 0) {
      alert("No data to export");
      return;
    }

    // Define CSV headers
    const headers = [
      "Dorm",
      "Room",
      "Inspection Status",
      "Maintenance Issues",
      "Uploaded By",
      "Uploaded At",
      "Notes"
    ];

    // Convert data to CSV rows
    const csvRows = [
      headers.join(","), // Header row
      ...dataToExport.map(upload => {
        // Format the date
        const date = new Date(upload.uploadedAt);
        const formattedDate = date.toLocaleString();
        
        // Format maintenance issues
        const issues = upload.maintenanceIssues && upload.maintenanceIssues.length > 0
          ? upload.maintenanceIssues.join("; ")
          : "None";
        
        // Escape any commas or quotes in the data
        const escapeCsvValue = (value) => {
          if (value === null || value === undefined) return "";
          const stringValue = String(value);
          // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
          if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        };

        return [
          escapeCsvValue(upload.dorm),
          escapeCsvValue(upload.room),
          escapeCsvValue(upload.inspectionStatus || "Not Set"),
          escapeCsvValue(issues),
          escapeCsvValue(upload.uploadedByEmail || upload.uploadedByUserId),
          escapeCsvValue(formattedDate),
          escapeCsvValue(upload.notes || "")
        ].join(",");
      })
    ];

    // Create CSV string
    const csvString = csvRows.join("\n");

    // Create blob and download
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    // Generate filename with current date and selected dorm
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const dormStr = selectedDorm === "All" ? "All-Dorms" : selectedDorm.replace(/\s+/g, "-");
    const filename = `DormReports_${dormStr}_${dateStr}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Determine sidebar width
  const sidebarWidth = sidebarCollapsed ? "60px" : "280px";

  // FIXED: Get user email from AuthContext
  const userEmail = user?.attributes?.email || user?.username || "";

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f3f4f6", position: "relative" }}>
      
      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            zIndex: 998,
            display: "none"
          }}
          className="mobile-overlay"
        />
      )}

      {/* SIDEBAR */}
      <div
        style={{
          width: sidebarWidth,
          background: "white",
          borderRight: "1px solid #ddd",
          padding: sidebarCollapsed ? "10px" : "20px",
          overflowY: "auto",
          overflowX: "hidden",
          position: "fixed",
          top: 0,
          bottom: 0,
          left: sidebarOpen ? 0 : "-280px",
          transition: "all 0.3s ease",
          zIndex: 999
        }}
        className="admin-sidebar"
      >
        {/* Collapse/Expand Toggle - Desktop Only */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            width: "100%",
            padding: "8px",
            marginBottom: "10px",
            background: "#f0f0f0",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
          }}
          className="desktop-only"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>

        {!sidebarCollapsed && (
          <>
            <h2 style={{ marginBottom: "20px", fontWeight: 700, fontSize: "20px" }}>Admin Menu</h2>

            {/* DORM REPORTS */}
            <div
              onClick={() => handleMenuClick("reports", "All")}
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
                      onClick={() => handleMenuClick("reports", dorm)}
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
                        color: isActive ? "#003d99" : "#333",
                        fontSize: "14px"
                      }}
                    >
                      {dorm}
                    </div>
                  );
                })}
              </div>
            )}

            {/* USER MANAGEMENT */}
            <div style={{ marginTop: "20px" }}>
              <div
                style={{
                  fontWeight: "bold",
                  padding: "10px 0",
                  cursor: "pointer"
                }}
                onClick={() => handleMenuClick("users", null, "view")}
              >
                User Management
              </div>

              {/* Add User */}
              <div
                onClick={() => handleMenuClick("users", null, "add")}
                style={{
                  padding: "8px 10px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  marginBottom: "4px",
                  marginLeft: "10px",
                  background:
                    selectedSection === "users" && userAction === "add"
                      ? "rgba(0, 102, 255, 0.12)"
                      : "transparent",
                  boxShadow:
                    selectedSection === "users" && userAction === "add"
                      ? "0 0 8px rgba(0, 102, 255, 0.25)"
                      : "none",
                  fontWeight:
                    selectedSection === "users" && userAction === "add" ? "bold" : "normal",
                  color:
                    selectedSection === "users" && userAction === "add" ? "#003d99" : "#333",
                  fontSize: "14px"
                }}
              >
                Add User
              </div>

              {/* View Users */}
              <div
                onClick={() => handleMenuClick("users", null, "view")}
                style={{
                  padding: "8px 10px",
                  cursor: "pointer",
                  borderRadius: "6px",
                  marginBottom: "4px",
                  marginLeft: "10px",
                  background:
                    selectedSection === "users" && userAction === "view"
                      ? "rgba(0, 102, 255, 0.12)"
                      : "transparent",
                  boxShadow:
                    selectedSection === "users" && userAction === "view"
                      ? "0 0 8px rgba(0, 102, 255, 0.25)"
                      : "none",
                  fontWeight:
                    selectedSection === "users" && userAction === "view" ? "bold" : "normal",
                  color:
                    selectedSection === "users" && userAction === "view" ? "#003d99" : "#333",
                  fontSize: "14px"
                }}
              >
                View Users
              </div>
            </div>

            {/* SIGN OUT - FIXED: Use logout from AuthContext */}
            <div style={{ marginTop: "30px" }}>
              <button
                onClick={logout}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #444",
                  background: "white",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                Sign out
              </button>
            </div>
          </>
        )}

        {/* Collapsed View - Icon Only */}
        {sidebarCollapsed && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
            <div
              onClick={() => handleMenuClick("reports", "All")}
              style={{
                cursor: "pointer",
                padding: "8px",
                borderRadius: "4px",
                background: selectedSection === "reports" ? "rgba(0, 102, 255, 0.12)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Dorm Reports"
            >
              <BarChartIcon size={24} color={selectedSection === "reports" ? "#0066ff" : "#333"} />
            </div>
            <div
              onClick={() => handleMenuClick("users", null, "view")}
              style={{
                cursor: "pointer",
                padding: "8px",
                borderRadius: "4px",
                background: selectedSection === "users" ? "rgba(0, 102, 255, 0.12)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Manage Users"
            >
              <UsersIcon size={24} color={selectedSection === "users" ? "#0066ff" : "#333"} />
            </div>
            <div
              onClick={logout}
              style={{
                cursor: "pointer",
                padding: "8px",
                marginTop: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Sign out"
            >
              <LogOutIcon size={24} color="#333" />
            </div>
          </div>
        )}
      </div>

      {/* MOBILE HEADER - Hamburger Menu */}
      <div
        style={{
          display: "none",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          background: "white",
          borderBottom: "1px solid #ddd",
          padding: "12px 16px",
          zIndex: 997,
          alignItems: "center",
          justifyContent: "space-between"
        }}
        className="mobile-header"
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            padding: "8px 12px",
            background: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <MenuIcon size={24} />
        </button>
        <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Admin Dashboard</h2>
        <div style={{ width: "44px" }}></div> {/* Spacer for centering */}
      </div>

      {/* MAIN CONTENT */}
      <div
        style={{
          marginLeft: sidebarWidth,
          padding: "40px",
          width: "100%",
          overflowY: "auto",
          transition: "margin-left 0.3s ease",
          boxSizing: "border-box"
        }}
        className="admin-content"
      >
        <h1 style={{ textAlign: "center", marginBottom: "10px", fontSize: "clamp(24px, 4vw, 32px)" }}>
          Admin Dashboard
        </h1>

        <h2 style={{ textAlign: "center", color: "#555", marginBottom: "20px", fontSize: "clamp(18px, 3vw, 24px)" }}>
          {selectedSection === "reports"
            ? "Dorm Reports"
            : userAction === "add"
            ? "Add New User"
            : "User Management"}
        </h2>

        {/* Logged in info - FIXED: Use userEmail from AuthContext */}
        <div
          style={{
            background: "white",
            padding: "16px 20px",
            borderRadius: "8px",
            marginBottom: "20px"
          }}
        >
          <p style={{ color: "#666", margin: 0, fontSize: "14px", wordBreak: "break-word" }}>
            Logged in as {userEmail}
          </p>
        </div>

        {/* CSV EXPORT BUTTON - Only show on reports section */}
        {selectedSection === "reports" && !loadingUploads && !loadError && (
          <div style={{ marginBottom: "20px", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleExportCSV}
              disabled={filteredUploads.length === 0}
              style={{
                padding: "10px 20px",
                background: filteredUploads.length === 0 ? "#ccc" : "#10a37f",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: filteredUploads.length === 0 ? "not-allowed" : "pointer",
                fontSize: "14px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "background 0.2s"
              }}
              onMouseEnter={(e) => {
                if (filteredUploads.length > 0) {
                  e.currentTarget.style.background = "#0d8c6d";
                }
              }}
              onMouseLeave={(e) => {
                if (filteredUploads.length > 0) {
                  e.currentTarget.style.background = "#10a37f";
                }
              }}
            >
              <DownloadIcon size={18} />
              Export to CSV ({filteredUploads.length} {filteredUploads.length === 1 ? 'record' : 'records'})
            </button>
          </div>
        )}

        {/* LOADING STATE */}
        {loadingUploads && selectedSection === "reports" ? (
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

      {/* RESPONSIVE STYLES */}
      <style>{`
        /* Desktop styles */
        @media (min-width: 769px) {
          .mobile-header {
            display: none !important;
          }
          .mobile-overlay {
            display: none !important;
          }
          .admin-sidebar {
            left: 0 !important;
          }
        }

        /* Mobile/Tablet styles */
        @media (max-width: 768px) {
          .mobile-header {
            display: flex !important;
          }
          
          .desktop-only {
            display: none !important;
          }
          
          .admin-sidebar {
            width: 280px !important;
            z-index: 999;
          }
          
          .admin-content {
            margin-left: 0 !important;
            padding: 70px 16px 16px 16px !important;
          }
          
          .mobile-overlay {
            display: block !important;
          }
        }

        /* Small mobile adjustments */
        @media (max-width: 480px) {
          .admin-content {
            padding: 70px 12px 12px 12px !important;
          }
        }
      `}</style>
    </div>
  );
}
