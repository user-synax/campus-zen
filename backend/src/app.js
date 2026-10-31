import express from "express";
import helmet from "helmet";
import cors from "cors";
import hpp from "hpp";
import compression from "compression";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import { env, isProd } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import hashtagRoutes from "./routes/hashtagRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import pushRoutes from "./routes/pushRoutes.js";
import sseRoutes from "./routes/sseRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import collegeRoutes from "./routes/collegeRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import verificationRoutes from "./routes/verificationRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

// trust proxy for secure cookies behind nginx/vercel
app.set("trust proxy", 1);

// security
// JSON-only API: strict enforced CSP. This header only matters when a browser
// navigates directly to the API (fetch/XHR is governed by the frontend's CSP
// connect-src). 'none' everywhere + frame-ancestors 'none' blocks any
// document rendering / clickjacking if the API ever returns HTML.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'none'"],
      connectSrc: ["'none'"],
      fontSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      formAction: ["'none'"],
      baseUri: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  // Let browsers cache the preflight for a day instead of paying an extra
  // round trip before every API call.
  maxAge: 86400,
  optionsSuccessStatus: 204,
}));
app.use(hpp());
app.use(
  compression({
    // gzip buffers writes, which stalls a long-lived event stream until the
    // buffer fills. SSE frames are tiny and already framed — pass them through.
    filter: (req, res) => {
      if (String(res.getHeader("Content-Type") || "").startsWith("text/event-stream")) return false;
      return compression.filter(req, res);
    },
  }),
);

// body — articles are long-form: 50k chars of body can be ~200KB even
// before JSON escaping, so /api/posts/articles* gets a bigger ceiling.
// body-parser marks what it has parsed (`req._body`) and the strict
// 10kb default below skips those, so every other route stays tight.
app.use("/api/posts/articles", express.json({ limit: "1mb" }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(cookieParser());
app.use(mongoSanitize());

// health (fast, no DB hit)
app.get("/health", (req, res) => {
  res.json({ success: true, message: "ok", uptime: process.uptime(), env: env.NODE_ENV });
});
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "api ok" });
});

// routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/hashtags", hashtagRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/events", sseRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/colleges", collegeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/verifications", verificationRoutes);

// 404
app.use(notFound);
app.use(errorHandler);

export default app;
