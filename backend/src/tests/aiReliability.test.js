import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyAiError, isTransientAiError, runGeminiWithRetry, safeString } from "../utils/aiReliability.js";

describe("AI reliability helpers", () => {
  it("retries transient failures once and does not retry permanent failures", async () => {
    let attempts = 0;
    const result = await runGeminiWithRetry(async () => {
      attempts += 1;
      if (attempts === 1) { const error = new Error("upstream overloaded"); error.status = 503; throw error; }
      return "ok";
    }, { timeoutMs: 100, retryDelayMs: 1 });
    assert.equal(result, "ok");
    assert.equal(attempts, 2);

    attempts = 0;
    await assert.rejects(() => runGeminiWithRetry(async () => {
      attempts += 1;
      const error = new Error("invalid request"); error.status = 400; throw error;
    }, { timeoutMs: 100, retryDelayMs: 1 }));
    assert.equal(attempts, 1);
  });

  it("bounds timeout failures and classifies transient errors", async () => {
    const started = Date.now();
    await assert.rejects(() => runGeminiWithRetry(() => new Promise(() => {}), { timeoutMs: 15, maxAttempts: 2, retryDelayMs: 1 }), (error) => error.code === "AI_TIMEOUT");
    assert.ok(Date.now() - started < 150);
    assert.equal(isTransientAiError({ status: 429 }), true);
    assert.equal(classifyAiError({ code: "AI_TIMEOUT" }), "timeout");
    assert.equal(classifyAiError({ status: 401 }), "invalid_credentials");
  });

  it("limits untrusted model strings", () => {
    assert.equal(safeString("  abc  "), "abc");
    assert.equal(safeString("x".repeat(20), 8).length, 8);
    assert.equal(safeString(null), "");
  });
});
