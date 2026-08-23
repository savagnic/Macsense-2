import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import path from "node:path";
import { existsSync } from "node:fs";
import { config } from "./config";
import { requireClientToken } from "./middleware/auth";
import { ariChatRouter } from "./routes/ariChat";

const app = express();
const webRoot = path.resolve(process.cwd(), process.env.MACSENSE_WEB_ROOT || "../web");
const webIndex = path.join(webRoot, "index.html");

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: config.corsOrigins.length > 0 ? config.corsOrigins : false }));
app.use(express.json({ limit: "256kb" }));

const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/v1", limiter);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", service: "macsense-studio" });
});
app.get("/readyz", (_req, res) => {
  res.status(existsSync(webIndex) ? 200 : 503).json({
    status: existsSync(webIndex) ? "ready" : "not_ready",
    web: existsSync(webIndex),
    ari: Boolean(config.geminiApiKey)
  });
});

app.use("/v1/ari/chat", requireClientToken, ariChatRouter);

if (existsSync(webIndex)) {
  app.use(express.static(webRoot, {
    index: false,
    etag: true,
    maxAge: process.env.NODE_ENV === "production" ? "1h" : 0,
    setHeaders(res, filePath) {
      if (filePath.endsWith("sw.js") || filePath.endsWith("index.html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    }
  }));

  app.get(/^\/(?!v1(?:\/|$)|health$|readyz$).*/, (_req, res) => {
    res.sendFile(webIndex);
  });
} else {
  app.get("/", (_req, res) => {
    res.status(503).json({ error: "Web studio artifact is missing", code: "web_not_ready" });
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: "Not found", code: "not_found" });
});

app.listen(config.port, () => {
  console.log(`macsense-studio listening on port ${config.port}; web=${existsSync(webIndex) ? webRoot : "missing"}`);
});
