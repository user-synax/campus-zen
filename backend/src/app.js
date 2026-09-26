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
import reportRoutes from "./routes/reportRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();

// trust proxy for secure cookies behind nginx/vercel
app.set("trust proxy", 1);

// security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(hpp());
app.use(compression());

// body
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
app.use("/api/reports", reportRoutes);

// 404
app.use(notFound);
app.use(errorHandler);

export default app;
