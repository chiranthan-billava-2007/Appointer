import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import RoleProtectedRoute from "./components/RoleProtectedRoute";

import Home from "./pages/Home";
import PlaceholderPage from "./pages/PlaceholderPage";
import FindDoctors from "./pages/FindDoctors";
import DoctorProfile from "./pages/DoctorProfile";
import Login from "./pages/Login";
import DoctorLogin from "./pages/DoctorLogin";
import AdminLogin from "./pages/AdminLogin";
import Register from "./pages/Register";
import PatientDashboard from "./pages/PatientDashboard";
import MyAppointments from "./pages/MyAppointments";
import DoctorDashboard from "./pages/DoctorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AIDoctorFinder from "./pages/AIDoctorFinder";
import AIAssistant from "./pages/AIAssistant";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/doctors" element={<FindDoctors />} />
          <Route path="/doctors/:id" element={<DoctorProfile />} />
          <Route path="/ai-doctor-finder" element={<AIDoctorFinder />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />

          {/* Three Role-Specific Login Portals & Patient Registration */}
          <Route path="/login" element={<Login />} />
          <Route path="/doctor/login" element={<DoctorLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/register" element={<Register />} />

          {/* Role-Protected Patient Dashboard Routes */}
          <Route
            path="/patient/dashboard"
            element={
              <RoleProtectedRoute allowedRoles={["patient"]}>
                <PatientDashboard />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <RoleProtectedRoute allowedRoles={["patient"]}>
                <MyAppointments />
              </RoleProtectedRoute>
            }
          />

          {/* Role-Protected Doctor Portal Dashboard */}
          <Route
            path="/doctor/dashboard"
            element={
              <RoleProtectedRoute allowedRoles={["doctor"]}>
                <DoctorDashboard />
              </RoleProtectedRoute>
            }
          />

          {/* Role-Protected Admin Portal Dashboard */}
          <Route
            path="/admin/dashboard"
            element={
              <RoleProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </RoleProtectedRoute>
            }
          />

          {/* 404 Catch-All */}
          <Route
            path="*"
            element={
              <PlaceholderPage
                title="404 - Page Not Found"
                description="The page you requested doesn't exist."
              />
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
