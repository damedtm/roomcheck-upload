// AdminPage.jsx
import { useState, useEffect, useMemo } from "react";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { useAuth } from "react-oidc-context";

import AddUserForm from "./AddUserForm";
import ManageUsersTable from "./ManageUsersTable";

const REGION = "us-east-2";
const BUCKET_NAME = "roomcheck-photos-damianohajunwa";
const TABLE_NAME = "RoomUploads";
const IDENTITY_POOL_ID = "us-east-2:0d00064d-9170-417c-862e-316009584b52";

const DORMS = [
  "Alexander Hall",
  "Campbell South",
  "Campbell North",
  "Transitional Hall",
  "Dixon Hall",
  "Stewart Hall",
  "One University Place",
  "Walthall Lofts",
  "Courthouse Apartments",
];

// TEMP: until you wire real user listing
const INITIAL_MOCK_USERS = [
  {
    id: "1",
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
    role: "RA",
    dorm: "Alexander Hall",
  },
  {
    id: "2",
    firstName: "Sarah",
    lastName: "Johnson",
    email: "sarah.johnson@example.com",
    role: "Admin",
    dorm: "",
  },
];

export default function AdminPage() {
  const auth = useAuth();

  // Reports state
  const [items, setItems] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [selectedDorm, setSelectedDorm] = useState("All");
  const [dormsOpen, setDormsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const ITEMS_PER_PAGE = 10;
  const [page, setPage] = useState(1);

  // Section state
  const [selectedSection, setSelectedSection] = useState("reports"); // "reports" | "users"
  const [userAction, setUserAction] = useState("view"); // "add" | "view"

  // Users state (for Manage Users)
  const [users, setUsers] = useState(INITIAL_MOCK_USERS);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState(null);

  const { iss } = auth.user?.profile || {};

  const credentials = useMemo(() => {
    if (!auth.user || !iss) return null;
    return fromCognitoIdentityPool({
      clientConfig: { region: REGION },
      identityPoolId: IDENTITY_POOL_ID,
      logins: {
        [`cognito-idp.${REGION}.amazonaws.com/${iss.split("/").pop()}`]:
          auth.user.id_token,
      },
    });
  }, [auth.user, iss]);

  const s3 = useMemo(
    () => (credentials ? new S3Client({ region: REGION, credentials }) : null),
    [credentials]
  );

  const dynamo = useMemo(
    () => (credentials ? new DynamoDBClient({ region: REGION, credentials }) : null),
    [credentials]
  );

  const authReady = auth.isAuthenticated && auth.user && s3 && dynamo;

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Fetch reports
  useEffect(() => {
    if (!authReady) return;

    const fetchItems = async () => {
      try {
        const data = await dynamo.send(new ScanCommand({ TableName: TABLE_NAME }));
        const validItems = (data.Items || []).filter(
          (item) => item.PK?.S && item.SK?.S
        );

        const itemsWithPreview = await Promise.all(
          validItems.map(async (item) => {
            let previewUrl = null;
            if (item.s3Key?.S) {
              try {
                previewUrl = await getSignedUrl(
                  s3,
                  new GetObjectCommand({ Bucket: BUCKET_NAME, Key: item.s3Key.S }),
                  { expiresIn: 3600 }
                );
              } catch (err) {
                console.error("Error generating preview URL:", err);
              }
            }
            return { ...item, previewUrl };
          })
        );

        setItems(itemsWithPreview);
      } catch (err) {
        console.error("Error fetching items:", err);
      } finally {
        setLoadingReports(false);
      }
    };

    fetchItems();
  }, [authReady, dynamo, s3]);

  if (!authReady) return <p>Loading...</p>;

  // REPORTS: search + filter + sort + paginate
  const searchLower = searchQuery.toLowerCase();

  const searchedItems = items.filter((item) => {
    const fields = [
      item.uploadedBy?.S,
      item.userEmail?.S,
      item.dorm?.S,
      item.roomNumber?.S,
      item.notes?.S,
    ];
    return fields.some((field) => field?.toLowerCase().includes(searchLower));
  });

  const dormFiltered =
    selectedDorm === "All"
      ? searchedItems
      : searchedItems.filter((item) => item.dorm?.S === selectedDorm);

  const sortedItems = [...dormFiltered].sort((a, b) => {
    const dateA = new Date(a.createdAt?.S);
    const dateB = new Date(b.createdAt?.S);

    switch (sortOption) {
      case "newest":
        return dateB - dateA;
      case "oldest":
        return dateA - dateB;
      case "roomAZ":
        return (a.roomNumber?.S || "").localeCompare(b.roomNumber?.S || "");
      case "roomZA":
        return (b.roomNumber?.S || "").localeCompare(a.roomNumber?.S || "");
      case "raAZ":
        return (a.uploadedBy?.S || "").localeCompare(b.uploadedBy?.S || "");
      case "raZA":
        return (b.uploadedBy?.S || "").localeCompare(a.uploadedBy?.S || "");
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);
  const paginatedItems = sortedItems.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // HANDLE USER CREATION (called by AddUserForm)
  const handleCreateUser = async (formData) => {
    setCreatingUser(true);
    setCreateError(null);

    try {
      const resp = await fetch("https://YOUR_CREATE_USER_API_URL/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody.message || "Failed to create user");
      }

      const data = await resp.json();

      const newUser = {
        id: data.user?.userId || data.user?.email || Date.now().toString(),
        firstName: data.user?.firstName || formData.firstName,
        lastName: data.user?.lastName || formData.lastName,
        email: data.user?.email || formData.email,
        role: data.user?.role?.includes("Admin") ? "Admin" : "RA",
        dorm: data.user?.dorm || formData.dorm || "",
      };

      setUsers((prev) => [...prev, newUser]);

      // Switch to View Users after success
      setSelectedSection("users");
      setUserAction("view");
    } catch (err) {
      console.error("Create user error:", err);
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
          overflowY: "auto",
        }}
      >
        <h2 style={{ marginBottom: "20px" }}>Admin Menu</h2>

        {/* Dashboard / Reports */}
        <div
          onClick={() => {
            setSelectedSection("reports");
            setSelectedDorm("All");
            setPage(1);
          }}
          style={{
            padding: "10px 0",
            cursor: "pointer",
            fontWeight: selectedSection === "reports" ? "bold" : "normal",
            transition: "0.15s",
          }}
        >
          Dashboard (Reports)
        </div>

        {/* Dorms Section */}
        <div
          onClick={() => setDormsOpen(!dormsOpen)}
          style={{
            padding: "10px 0",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            fontWeight: "bold",
            marginTop: "10px",
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
                    background: isActive ? "rgba(0, 102, 255, 0.12)" : "transparent",
                    boxShadow: isActive ? "0 0 8px rgba(0, 102, 255, 0.25)" : "none",
                    fontWeight: isActive ? "bold" : "normal",
                    color: isActive ? "#003d99" : "#333",
                    transition: "0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "#f0f0f0";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {dorm}
                </div>
              );
            })}
          </div>
        )}

        {/* Manage Users Section */}
        <div
          style={{
            padding: "10px 0",
            cursor: "pointer",
            fontWeight: "bold",
            marginTop: "20px",
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
                  : "transparent",
              boxShadow:
                selectedSection === "users" && userAction === "add"
                  ? "0 0 8px rgba(0, 102, 255, 0.25)"
                  : "none",
              fontWeight:
                selectedSection === "users" && userAction === "add"
                  ? "bold"
                  : "normal",
              color:
                selectedSection === "users" && userAction === "add"
                  ? "#003d99"
                  : "#333",
              transition: "0.15s ease",
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
                  : "transparent",
              boxShadow:
                selectedSection === "users" && userAction === "view"
                  ? "0 0 8px rgba(0, 102, 255, 0.25)"
                  : "none",
              fontWeight:
                selectedSection === "users" && userAction === "view"
                  ? "bold"
                  : "normal",
              color:
                selectedSection === "users" && userAction === "view"
                  ? "#003d99"
                  : "#333",
              transition: "0.15s ease",
            }}
          >
            View Users
          </div>
        </div>

        {/* Sign out */}
        <div style={{ marginTop: "30px" }}>
          <button
            onClick={() => auth.removeUser()}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #444",
              background: "white",
              cursor: "pointer",
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
            ? "Room‑Check Operations"
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
            marginBottom: "20px",
          }}
        >
          <p style={{ color: "#666" }}>
            Logged in as {auth.user.profile.email}
          </p>
        </div>

        {selectedSection === "reports" ? (
          <>
            {/* Search + Sort for Reports */}
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "8px",
                marginBottom: "20px",
                display: "flex",
                gap: "20px",
              }}
            >
              <input
                type="text"
                placeholder="Search by RA, dorm, room, notes..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                }}
              />

              <select
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  background: "white",
                }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="roomAZ">Room Number (A → Z)</option>
                <option value="roomZA">Room Number (Z → A)</option>
                <option value="raAZ">RA Name (A → Z)</option>
                <option value="raZA">RA Name (Z → A)</option>
              </select>
            </div>

            {/* Reports List */}
            <div
              style={{
                background: "white",
                padding: "20px",
                borderRadius: "8px",
              }}
            >
              <h2>
                {selectedDorm === "All"
                  ? "All Uploaded Reports"
                  : `${selectedDorm} Reports`}
              </h2>
              <hr style={{ margin: "20px 0" }} />

              {loadingReports ? (
                <p>Loading reports...</p>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    {paginatedItems.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          padding: "16px",
                          background: "#fafafa",
                        }}
                      >
                        <p>
                          <strong>RA:</strong>{" "}
                          {item.uploadedBy?.S || item.userEmail?.S}
                        </p>
                        <p>
                          <strong>Dorm:</strong> {item.dorm?.S}
                        </p>
                        <p>
                          <strong>Room:</strong> {item.roomNumber?.S}
                        </p>
                        <p>
                          <strong>Notes:</strong> {item.notes?.S}
                        </p>
                        <p>
                          <strong>Submitted:</strong>{" "}
                          {formatDate(item.createdAt?.S)}
                        </p>

                        {item.previewUrl && (
                          <a
                            href={item.previewUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={item.previewUrl}
                              alt="preview"
                              style={{
                                width: "150px",
                                height: "150px",
                                objectFit: "cover",
                                borderRadius: "6px",
                                marginTop: "10px",
                              }}
                            />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      marginTop: "20px",
                      gap: "10px",
                    }}
                  >
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        background: page === 1 ? "#eee" : "white",
                        cursor: page === 1 ? "default" : "pointer",
                      }}
                    >
                      Previous
                    </button>

                    <span style={{ padding: "8px 12px" }}>
                      Page {page} of {totalPages || 1}
                    </span>

                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        background: page === totalPages ? "#eee" : "white",
                        cursor: page === totalPages ? "default" : "pointer",
                      }}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : userAction === "add" ? (
          <AddUserForm
            onCreateUser={handleCreateUser}
            creating={creatingUser}
            error={createError}
            dorms={DORMS}
          />
        ) : (
          <ManageUsersTable users={users} />
        )}
      </div>
    </div>
  );
}
