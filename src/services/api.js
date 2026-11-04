const getApiBaseUrl = () => {
  const rawUrl = import.meta.env.VITE_API_URL;
  if (!rawUrl) return "http://localhost:5000/api";
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
};

const API_BASE = getApiBaseUrl();

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  // Auth
  register: async (userData) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");
    return data;
  },

  login: async (credentials, portalRole) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...credentials, portalRole }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    return data;
  },

  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to authenticate session");
    return data;
  },

  // Doctors
  getDoctors: async (search = "", specialty = "") => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (specialty && specialty !== "All specialties") params.append("specialty", specialty);

    const res = await fetch(`${API_BASE}/doctors?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to fetch doctors");
    return data;
  },

  getDoctorById: async (id) => {
    const res = await fetch(`${API_BASE}/doctors/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Doctor not found");
    return data;
  },

  onboardDoctor: async (doctorData) => {
    const res = await fetch(`${API_BASE}/doctors`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(doctorData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Doctor onboarding failed");
    return data;
  },

  // Appointments
  getAppointments: async () => {
    const res = await fetch(`${API_BASE}/appointments`, {
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load appointments");
    return data;
  },

  bookAppointment: async (appointmentData) => {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(appointmentData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to book appointment");
    return data;
  },

  updateAppointmentStatus: async (id, status) => {
    const res = await fetch(`${API_BASE}/appointments/${id}/status`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Status update failed");
    return data;
  },

  cancelAppointment: async (id) => {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to cancel appointment");
    return data;
  },
};
