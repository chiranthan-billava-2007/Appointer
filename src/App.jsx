
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import PlaceholderPage from "./pages/PlaceholderPage";
import FindDoctors from "./pages/FindDoctors";
import DoctorProfile from "./pages/DoctorProfile";
import Login from "./pages/Login";
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
      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/doctors"
          element={<FindDoctors />}
        />

        <Route
          path="/doctors/:id"
          element={<DoctorProfile />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/patient/dashboard"
          element={<PatientDashboard />}
        />

        <Route
          path="/patient/appointments"
          element={<MyAppointments />}
        />

        <Route
          path="/doctor/dashboard"
          element={<DoctorDashboard />}
        />

        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />

        <Route
          path="/ai-doctor-finder"
          element={<AIDoctorFinder />}
        />

        <Route
          path="/ai-assistant"
          element={<AIAssistant />}
        />

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
    </BrowserRouter>
  );
}

export default App;
