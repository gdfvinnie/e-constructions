import { createServer } from "node:http";
import { readFile, stat, mkdir, appendFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { randomUUID, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT) || 4173;
const host = process.env.HOST || "127.0.0.1";

const dataDir = join(root, "data");
const quotesFile = join(dataDir, "quote-requests.jsonl");

const MAX_BODY_BYTES = 32 * 1024;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

/* ---------------------------------------------------------------- helpers */

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(body);
}

function clientKey(request) {
  const forwarded = request.headers["x-forwarded-for"];
  return (
    (typeof forwarded === "string" && forwarded.split(",")[0].trim()) ||
    request.socket.remoteAddress ||
    "unknown"
  );
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Payload too large"), { status: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch {
        reject(Object.assign(new Error("Body must be valid JSON."), { status: 400 }));
      }
    });

    request.on("error", reject);
  });
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function clean(value, max = 4000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validateQuote(raw) {
  const data = {
    fullName: clean(raw.fullName, 120),
    email: clean(raw.email, 180),
    phone: clean(raw.phone, 40),
    projectType: clean(raw.projectType, 80),
    projectLocation: clean(raw.projectLocation, 160),
    budget: clean(raw.budget, 60),
    description: clean(raw.description, 4000),
  };

  const errors = {};

  if (data.fullName.length < 2) errors.fullName = "Enter your full name.";
  if (!emailPattern.test(data.email)) errors.email = "Enter a valid email address.";
  if (data.phone && data.phone.replace(/[^\d]/g, "").length < 7) {
    errors.phone = "Enter at least 7 digits, or leave this field blank.";
  }
  if (!data.projectType) errors.projectType = "Choose a project type.";
  if (data.projectLocation.length < 2) errors.projectLocation = "Add a project location.";
  if (data.description.length < 20) {
    errors.description = "Describe the project in at least 20 characters.";
  }

  return { data, errors };
}

const rateHits = new Map();

function isRateLimited(key) {
  const now = Date.now();
  const hits = (rateHits.get(key) || []).filter((time) => now - time < RATE_WINDOW_MS);
  hits.push(now);
  rateHits.set(key, hits);

  if (rateHits.size > 500) {
    for (const [entryKey, entryHits] of rateHits) {
      if (!entryHits.some((time) => now - time < RATE_WINDOW_MS)) rateHits.delete(entryKey);
    }
  }

  return hits.length > RATE_MAX;
}

/* ------------------------------------------------------------- quote route */

async function handleQuoteRequest(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { ok: false, message: "Use POST for this endpoint." });
    return;
  }

  const rateKey = clientKey(request);
  if (isRateLimited(rateKey)) {
    sendJson(response, 429, {
      ok: false,
      message: "Too many requests from this connection. Please try again shortly.",
    });
    return;
  }

  let raw;
  try {
    raw = await readJsonBody(request);
  } catch (error) {
    sendJson(response, error.status || 400, { ok: false, message: error.message });
    return;
  }

  // Silently accept obvious bots without storing anything.
  if (clean(raw.website, 200)) {
    sendJson(response, 201, { ok: true, reference: "received" });
    return;
  }

  const { data, errors } = validateQuote(raw);
  if (Object.keys(errors).length > 0) {
    sendJson(response, 422, {
      ok: false,
      message: "Some details need correcting.",
      errors,
    });
    return;
  }

  const record = {
    reference: `NF-${Date.now().toString(36).toUpperCase()}-${randomBytes(2)
      .toString("hex")
      .toUpperCase()}`,
    receivedAt: new Date().toISOString(),
    ...data,
    sourcePage: clean(raw.page, 300),
    submittedAt: clean(raw.submittedAt, 40),
    userAgent: clean(request.headers["user-agent"], 300),
  };

  try {
    await mkdir(dataDir, { recursive: true });
    await appendFile(quotesFile, `${JSON.stringify(record)}\n`, "utf8");
  } catch (error) {
    console.error("Could not store quote request:", error);
    sendJson(response, 500, {
      ok: false,
      message: "The request could not be stored. Please try again or call the office.",
    });
    return;
  }

  sendJson(response, 201, { ok: true, reference: record.reference });
}

/* ------------------------------------------------------------------ server */

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, `http://${request.headers.host || "localhost"}`).pathname
    );

    if (pathname === "/api/quote" || pathname === "/api/quote/") {
      await handleQuoteRequest(request, response);
      return;
    }

    const relative = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
    let filePath = join(root, relative);

    if (!filePath.startsWith(root)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    if (filePath.startsWith(dataDir)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    let info = await stat(filePath).catch(() => null);
    if (info?.isDirectory()) {
      filePath = join(filePath, "index.html");
      info = await stat(filePath).catch(() => null);
    }

    if (!info?.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": types[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Server error");
    console.error(error);
  }
});

server.listen(port, host, () => {
  console.log(`Northform preview: http://${host}:${port}/`);
  console.log(`Quote requests are stored in ${quotesFile}`);
});
