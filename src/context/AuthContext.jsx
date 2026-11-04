import { useState, useEffect, useRef } from "react";
import { AuthContext } from "./AuthContextCore";
import { api } from "../services/api";

const getInitialToken = () => {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getInitialToken()));

  // Monotonic request counter to prevent stale asynchronous responses from overwriting newer user sessions
  const activeRequestIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const token = getInitialToken();

    if (token) {
      const requestId = ++activeRequestIdRef.current;

      api.getMe()
        .then((userData) => {
          // Discard if a newer login/register request was dispatched in the meantime
          if (isMounted && activeRequestIdRef.current === requestId) {
            setUser(userData);
          }
        })
        .catch(() => {
          if (isMounted && activeRequestIdRef.current === requestId) {
            localStorage.removeItem("token");
            setUser(null);
          }
        })
        .finally(() => {
          if (isMounted && activeRequestIdRef.current === requestId) {
            setLoading(false);
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials, portalRole) => {
    // Invalidate any ongoing in-flight background requests
    const requestId = ++activeRequestIdRef.current;

    const response = await api.login(credentials, portalRole);
    if (response.token && activeRequestIdRef.current === requestId) {
      localStorage.setItem("token", response.token);
      setUser({
        _id: response._id,
        name: response.name,
        email: response.email,
        role: response.role,
        doctorProfile: response.doctorProfile,
      });
      setLoading(false);
    }
    return response;
  };

  const register = async (patientData) => {
    const requestId = ++activeRequestIdRef.current;

    const response = await api.register(patientData);
    if (response.token && activeRequestIdRef.current === requestId) {
      localStorage.setItem("token", response.token);
      setUser({
        _id: response._id,
        name: response.name,
        email: response.email,
        role: response.role,
      });
      setLoading(false);
    }
    return response;
  };

  const logout = () => {
    // Invalidate in-flight requests and clear session
    ++activeRequestIdRef.current;
    localStorage.removeItem("token");
    setUser(null);
    setLoading(false);
  };

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: Boolean(user),
    doctorProfile: user?.doctorProfile || null,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
