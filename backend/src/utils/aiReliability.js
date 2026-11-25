const TRANSIENT_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);

export const isTransientAiError = (error) => {
  const status = Number(error?.status || error?.statusCode || error?.code);
  if (TRANSIENT_CODES.has(status)) return true;
  const message = String(error?.message || error || "").toLowerCase();
  return /timeout|timed out|temporar|overloaded|rate limit|econnreset|eai_again|socket hang up|network/.test(message);
};

export const classifyAiError = (error) => {
  const status = Number(error?.status || error?.statusCode || error?.code);
  if (status === 429) return "rate_limit";
  if (status === 401 || status === 403) return "invalid_credentials";
  if (status === 400) return "invalid_request";
  if (status === 408 || status === 504 || error?.code === "AI_TIMEOUT") return "timeout";
  return isTransientAiError(error) ? "transient_upstream" : "upstream_error";
};

export async function runGeminiWithRetry(operation, { timeoutMs = 8000, maxAttempts = 2, retryDelayMs = 100 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt += 1) {
    let timer;
    try {
      const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error("Gemini request timed out");
          error.code = "AI_TIMEOUT";
          reject(error);
        }, timeoutMs);
      });
      return await Promise.race([Promise.resolve().then(operation), timeout]);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isTransientAiError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  throw lastError;
}

export const safeString = (value, maxLength = 500) => (typeof value === "string" ? value.trim().slice(0, maxLength) : "");
