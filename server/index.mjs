import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCoachContext } from "../src/coach.ts";
import { coachResponse } from "./coaching.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const dev = process.argv.includes("--dev");
const port = Number(process.env.PORT || 5174);
const host = process.env.HOST || "127.0.0.1";
const rates = new Map();
let inFlight = 0;
let vite;
const json = (res, status, value) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(value));
};
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".json": "application/json",
};

async function route(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  const pathname = new URL(req.url, "http://localhost").pathname;
  if (pathname === "/api/status" && req.method === "GET")
    return json(res, 200, {
      coach: process.env.OPENROUTER_API_KEY ? "live" : "field-guide",
    });
  if (pathname === "/api/coach") {
    if (req.method !== "POST")
      return json(res, 405, { error: "Use POST for a coaching request." });
    const origin = req.headers.origin;
    if (origin) {
      let originHost;
      try {
        originHost = new URL(origin).host;
      } catch {
        return json(res, 403, { error: "Invalid origin." });
      }
      if (originHost !== req.headers.host)
        return json(res, 403, {
          error: "Use the game’s own coaching connection.",
        });
    }
    if (!req.headers["content-type"]?.startsWith("application/json"))
      return json(res, 415, { error: "Use application/json." });
    const now = Date.now(),
      address = req.socket.remoteAddress || "local";
    for (const [key, entry] of rates)
      if (now - entry.time > 60000) rates.delete(key);
    const entry = rates.get(address) ?? { time: now, count: 0 };
    if (entry.count >= 12 || inFlight >= 3)
      return json(res, 429, {
        error: "Pip needs a moment. The field guide is still available.",
      });
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 12000)
        return json(res, 413, { error: "That question is too long." });
      chunks.push(chunk);
    }
    let parsed;
    try {
      parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return json(res, 400, { error: "Could not read that question." });
    }
    const context = parseCoachContext(parsed);
    if (!context)
      return json(res, 400, {
        error:
          "Include a valid experiment and a question under 500 characters.",
      });
    entry.count++;
    rates.set(address, entry);
    inFlight++;
    try {
      return json(res, 200, await coachResponse(context));
    } finally {
      inFlight--;
    }
  }
  if (pathname.startsWith("/api/"))
    return json(res, 404, { error: "Unknown endpoint." });
  if (vite) return vite.middlewares(req, res);
  if (!["GET", "HEAD"].includes(req.method))
    return json(res, 405, { error: "Method not allowed." });
  let requested;
  try {
    requested = decodeURIComponent(pathname);
  } catch {
    return json(res, 400, { error: "Invalid path." });
  }
  if (requested.split("/").some((segment) => segment.startsWith("."))) {
    return json(res, 404, { error: "File not found." });
  }
  let file = path.resolve(
    dist,
    `.${requested === "/" ? "/index.html" : requested}`,
  );
  if (!file.startsWith(dist + path.sep))
    return json(res, 403, { error: "Invalid path." });
  try {
    if (!(await stat(file)).isFile()) throw new Error("not a file");
  } catch {
    if (path.extname(requested))
      return json(res, 404, { error: "File not found." });
    file = path.join(dist, "index.html");
  }
  try {
    const content = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": file.includes(`${path.sep}assets${path.sep}`)
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : content);
  } catch {
    json(res, 503, {
      error:
        "Build the game with npm run build before starting the production server.",
    });
  }
}
const server = http.createServer((req, res) => {
  route(req, res).catch(() => {
    if (!res.headersSent)
      json(res, 500, { error: "The request could not be completed." });
    else res.end();
  });
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
if (dev) {
  const { createServer } = await import("vite");
  vite = await createServer({
    root,
    server: { middlewareMode: true, hmr: { server } },
    appType: "spa",
  });
}
server.listen(port, host, () => {
  console.log(`SIGNAL is ready at http://${host}:${port}`);
  console.log(
    `Pip: ${process.env.OPENROUTER_API_KEY ? "live coaching configured" : "authored field guide"}`,
  );
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    void vite?.close();
    server.close(() => process.exit(0));
  });
