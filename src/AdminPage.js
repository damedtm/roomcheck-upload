// AdminPage.jsx

import { useState, useEffect } from "react";
import { useAuth } from "react-oidc-context";

import AddUserForm from "./AddUserForm";
import ManageUsersTable from "./ManageUsersTable";
import ViewUploads from "./ViewUploads";
import { getUploads, createUser } from "./api";

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
  const [search, setSearch] = useState("");
  const [selectedDorm, setSelectedDorm] = useState("All");
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;
  const [dormsOpen, setDormsOpen] = useState(true);

  // USERS STATE
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState(null);

  // FETCH UPLOADS
  useEffect(() => {
    async function load() {
      try {
        const items = await getUploads(auth.user.id_token);
        setUploads(items);
      } catch (err) {
        console.error("Error loading uploads:", err);
      } finally {
        setLoading(false);
      }
    }

    if (auth.isAuthenticated) load();
  }, [auth.isAuthenticated, auth.user]);

  if (!auth.isAuthenticated) return <p>Loading...</p>;

  const handleCreateUser = async (formData) => {
    setCreatingUser(true);
    setCreateError(null);

    try {
      await createUser(formData);
      setSelectedSection("users");
      setUserAction("view");
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f7f7f7" }}>
      {/* SIDEBAR */}
      <div
        style={{
          width: "280px",
          background: "white",
          borderRight: "1px solid #ddd",
          padding: "20px",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          overflowY: "auto"
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>Admin Menu</h2>

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
      <div style={{ marginLeft: "300px", padding: "40px", width: "100%" }}>
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

        {loading && selectedSection === "reports" ? (
          <p>Loading reports...</p>
        ) : selectedSection === "reports" ? (
          <ViewUploads
            uploads={uploads}
            search={search}
            setSearch={setSearch}
            selectedDorm={selectedDorm}
            setSelectedDorm={setSelectedDorm}
            page={page}
            setPage={setPage}
            PER_PAGE={PER_PAGE}
            DORMS={DORMS}
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
