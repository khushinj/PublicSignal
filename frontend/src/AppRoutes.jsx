import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import App from "./App";
import Dashboard from "./Dashboard";
import AdminLogin from "./AdminLogin";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public citizen complaint form */}
        <Route path="/" element={<App />} />

        {/* Public admin login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected admin pages */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/admin/dashboard"
            element={<Dashboard />}
          />
        </Route>

        {/* Unknown routes */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}