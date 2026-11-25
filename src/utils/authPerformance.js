const enabled = () => import.meta.env.DEV || import.meta.env.VITE_AUTH_PERF_LOGS === "true";

export const authTimingStart = () => (typeof performance === "undefined" ? 0 : performance.now());

export const logAuthTiming = (event, start, fields = {}) => {
  if (!enabled() || typeof performance === "undefined") return;
  const totalMs = Number((performance.now() - start).toFixed(3));
  console.info(JSON.stringify({ event: `auth.performance.${event}`, totalMs, ...fields }));
};
