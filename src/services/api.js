const getApiBaseUrl = () => {
  const rawUrl = import.meta.env.VITE_API_URL;
  if (rawUrl && typeof rawUrl === "string" && rawUrl.trim()) {
    const trimmed = rawUrl.trim().replace(/\/+$/, "");
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }

  // In production / deployed environments, default to relative /api
  // which is proxied by Vercel's edge rewrites (vercel.json) or Vite dev server proxy (vite.config.js).
  // This completely eliminates cross-origin preflight requests and CORS blocking.
  if (
    import.meta.env.PROD ||
    (typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1")
  ) {
    return "/api";
  }

  return "http://localhost:5000/api";
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

  aiDoctorFinder: async (query) => {
    const res = await fetch(`${API_BASE}/doctors/ai-find`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server returned status ${res.status}. Please try again later.`);
    }
    if (!res.ok) throw new Error(data?.message || "Failed to find matching doctors");
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
