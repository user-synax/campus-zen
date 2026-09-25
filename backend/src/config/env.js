import dotenv from "dotenv";
dotenv.config();

function requireEnv(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: Number(process.env.PORT || 4000),
  MONGO_URI: requireEnv("MONGO_URI", "mongodb://localhost:27017/campuszen"),
  JWT_ACCESS_SECRET: requireEnv("JWT_ACCESS_SECRET", "dev_access_secret_please_change_32chars!!"),
  JWT_REFRESH_SECRET: requireEnv("JWT_REFRESH_SECRET", "dev_refresh_secret_please_change_32chars!!"),
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || "15m",
  JWT_REFRESH_REMEMBER_EXPIRES: process.env.JWT_REFRESH_REMEMBER_EXPIRES || "7d",
  JWT_REFRESH_DEFAULT_EXPIRES: process.env.JWT_REFRESH_DEFAULT_EXPIRES || "1d",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
};

export const isProd = env.NODE_ENV === "production";
