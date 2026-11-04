import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export default function RoleProtectedRoute({ allowedRoles, children }) {
  const { user, role, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <p style={{ color: "var(--muted, #64748b)" }}>Verifying session...</p>
      </div>
    );
  }

  // If not authenticated, redirect to the matching portal login
  if (!isAuthenticated || !user) {
    let redirectPath = "/login";
    if (allowedRoles.includes("doctor")) redirectPath = "/doctor/login";
    if (allowedRoles.includes("admin")) redirectPath = "/admin/login";

    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // If authenticated but role is not allowed, redirect to user's assigned dashboard
  if (!allowedRoles.includes(role)) {
    if (role === "doctor") return <Navigate to="/doctor/dashboard" replace />;
    if (role === "admin") return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/patient/dashboard" replace />;
  }

  return children;
}
