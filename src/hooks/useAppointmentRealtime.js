import { useEffect } from "react";

export function useAppointmentRealtime(refresh) {
  useEffect(() => {
    const onAppointment = () => refresh();
    const onConnected = () => refresh();
    window.addEventListener("appointer:socket-appointment", onAppointment);
    window.addEventListener("appointer:socket-connected", onConnected);
    return () => {
      window.removeEventListener("appointer:socket-appointment", onAppointment);
      window.removeEventListener("appointer:socket-connected", onConnected);
    };
  }, [refresh]);
}
