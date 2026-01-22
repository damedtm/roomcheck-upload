// src/App.js
import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import RAPage from "./RAPage";
import AdminPage from "./AdminPage";

/* ===== Protected Route ===== */
function ProtectedRoute({ children, allowedGroups }) {
  const auth = useAuth();

  if (auth.isLoading) return <p>Loading...</p>;

  if (!auth.isAuthenticated || !auth.user) return <Navigate to="/" replace />;

  const groups = Array.isArray(auth.user.profile["cognito:groups"])
    ? auth.user.profile["cognito:groups"]
    : [];

  const isAllowed = allowedGroups.some((g) => groups.includes(g));

  return isAllowed ? children : <Navigate to="/" replace />;
}

/* ===== Landing / Login + Redirect ===== */
function Home() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.isAuthenticated || !auth.user) return;

    const groups = auth.user.profile["cognito:groups"] || [];

    if (groups.includes("Admins")) {
      navigate("/admin", { replace: true });
    } else if (groups.includes("RAs")) {
      navigate("/ra", { replace: true });
    } else {
      alert("Unauthorized user");
      auth.removeUser();
    }
  }, [auth.isAuthenticated, auth.user, navigate]);

  if (auth.isLoading) return <p>Loading...</p>;

  if (auth.error) return <p>Error: {auth.error.message}</p>;

  if (!auth.isAuthenticated) {
    return (
      <div>
        <h2>Room Check Login</h2>
        <button onClick={() => auth.signinRedirect()}>Sign in</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Signed in</h2>
      <p>Email: {auth.user.profile.email}</p>
      <p>
        Groups:{" "}
        {auth.user.profile["cognito:groups"]?.join(", ") || "None"}
      </p>
      <button onClick={() => auth.removeUser()}>Sign out</button>
    </div>
  );
}

/* ===== App Root ===== */
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/ra"
          element={
            <ProtectedRoute allowedGroups={["RAs"]}>
              <RAPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedGroups={["Admins"]}>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback for unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
