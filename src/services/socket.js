import { io } from "socket.io-client";

let socket;
let activeToken;

const socketUrl = () => {
  const configured = import.meta.env.VITE_SOCKET_URL;
  if (configured) return configured.replace(/\/+$/, "");
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) return apiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") return window.location.origin;
  return "http://localhost:5000";
};

const publish = (eventName, detail) => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("appointer:socket-appointment", { detail: { eventName, appointment: detail } }));
};

export const connectSocket = (token) => {
  if (!token) return null;
  if (socket?.connected && activeToken === token) return socket;
  if (socket) socket.disconnect();
  activeToken = token;
  socket = io(socketUrl(), { auth: { token }, autoConnect: true, reconnection: true, reconnectionAttempts: Infinity });
  ["appointment:created", "appointment:updated", "appointment:cancelled", "appointment:rescheduled", "appointment:completed"].forEach((eventName) => socket.on(eventName, (payload) => publish(eventName, payload)));
  socket.on("connect", () => window.dispatchEvent(new Event("appointer:socket-connected")));
  socket.on("auth:expired", () => window.dispatchEvent(new Event("appointer:auth-expired")));
  socket.on("connect_error", (error) => {
    if (/authentication|token|unauthorized/i.test(error.message || "")) window.dispatchEvent(new Event("appointer:auth-expired"));
  });
  return socket;
};

export const disconnectSocket = () => {
  if (socket) socket.disconnect();
  socket = null;
  activeToken = null;
};

export const getSocket = () => socket;
