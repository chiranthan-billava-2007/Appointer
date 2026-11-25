const roundMs = (value) => Number(value.toFixed(3));

export const timerStart = () => process.hrtime.bigint();

export const timerElapsedMs = (start) => roundMs(Number(process.hrtime.bigint() - start) / 1e6);

export const setAuthServerTiming = (res, timings = {}) => {
  const entries = Object.entries(timings)
    .filter(([, value]) => Number.isFinite(value))
    .map(([name, value]) => `auth-${name};dur=${roundMs(value)}`);
  if (entries.length > 0 && typeof res.setHeader === "function" && !res.headersSent) {
    res.setHeader("Server-Timing", entries.join(", "));
  }
};

export const logAuthTiming = (event, fields = {}) => {
  if (process.env.AUTH_PERF_LOGS !== "true") return;
  console.info(JSON.stringify({ event: `auth.performance.${event}`, ...fields }));
};
