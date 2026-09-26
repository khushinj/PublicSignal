import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const token = sessionStorage.getItem("admin_token");

    if (!token) {
      setStatus("unauthorized");
      return;
    }

    fetch("/api/admin/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Invalid session");
        }

        return response.json();
      })
      .then(() => setStatus("authorized"))
      .catch(() => {
        sessionStorage.removeItem("admin_token");
        setStatus("unauthorized");
      });
  }, []);

  if (status === "checking") {
    return <p>Verifying admin access...</p>;
  }

  if (status === "unauthorized") {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}