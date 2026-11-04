import { describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cors from "cors";
import helmet from "helmet";

describe("CORS and Security Headers Configuration Tests", () => {
  const createTestApp = (customClientUrl = "") => {
    const app = express();

    // Helmet default headers (including Cross-Origin-Resource-Policy: same-origin)
    app.use(helmet());

    const defaultAllowed = [
      "http://localhost:5173",
      "https://appointer.vercel.app",
    ];
    const envAllowed = (customClientUrl || process.env.CLIENT_URL || "")
      .split(",")
      .map((origin) => origin.trim().replace(/\/+$/, ""))
      .filter(Boolean);

    const allowedOrigins = Array.from(new Set([...defaultAllowed, ...envAllowed]));

    app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin) {
            return callback(null, true);
          }
          const normalized = origin.trim().replace(/\/+$/, "");
          if (allowedOrigins.includes(normalized)) {
            return callback(null, true);
          }
          callback(null, false);
        },
        credentials: true,
      })
    );

    app.post("/api/doctors/ai-find", (req, res) => {
      res.json({ success: true });
    });

    return app;
  };

  it("should return Access-Control-Allow-Origin for production Appointer origin (https://appointer.vercel.app)", async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const { port } = server.address();

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/doctors/ai-find`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://appointer.vercel.app",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type",
        },
      });

      assert.equal(res.status, 204);
      assert.equal(res.headers.get("access-control-allow-origin"), "https://appointer.vercel.app");
      assert.equal(res.headers.get("access-control-allow-credentials"), "true");
      assert.ok(res.headers.get("access-control-allow-methods").includes("POST"));
    } finally {
      server.close();
    }
  });

  it("should reject unapproved Vercel preview origins (*.vercel.app)", async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const { port } = server.address();

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/doctors/ai-find`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://appointer-preview-xyz.vercel.app",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type",
        },
      });

      assert.equal(res.headers.get("access-control-allow-origin"), null);
    } finally {
      server.close();
    }
  });

  it("should reject arbitrary unauthorized origins", async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const { port } = server.address();

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/doctors/ai-find`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://malicious-site.com",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type",
        },
      });

      assert.equal(res.headers.get("access-control-allow-origin"), null);
    } finally {
      server.close();
    }
  });

  it("should allow origins explicitly configured via CLIENT_URL environment variable", async () => {
    const app = createTestApp("https://staging.appointer.example.com");
    const server = app.listen(0);
    const { port } = server.address();

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/doctors/ai-find`, {
        method: "OPTIONS",
        headers: {
          Origin: "https://staging.appointer.example.com",
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type",
        },
      });

      assert.equal(res.status, 204);
      assert.equal(res.headers.get("access-control-allow-origin"), "https://staging.appointer.example.com");
    } finally {
      server.close();
    }
  });

  it("should retain Helmet's default same-origin Cross-Origin-Resource-Policy", async () => {
    const app = createTestApp();
    const server = app.listen(0);
    const { port } = server.address();

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/doctors/ai-find`, {
        method: "POST",
        headers: {
          Origin: "https://appointer.vercel.app",
          "Content-Type": "application/json",
        },
      });

      assert.equal(res.headers.get("cross-origin-resource-policy"), "same-origin");
      assert.equal(res.headers.get("access-control-allow-origin"), "https://appointer.vercel.app");
    } finally {
      server.close();
    }
  });
});
