import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGO_URI, {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    autoIndex: false,
    autoCreate: false,
  });
  console.log(`[db] connected ${env.MONGO_URI.replace(/\/\/.*@/, "//***@")}`);
  // create indexes explicitly (works for local + Atlas)
  try {
    await mongoose.connection.syncIndexes().catch(() => {});
  } catch {}

  mongoose.connection.on("error", (e) => console.error("[db] error", e.message));
  mongoose.connection.on("disconnected", () => console.warn("[db] disconnected"));
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
