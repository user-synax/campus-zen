import mongoose from "mongoose";
import { env, isProd } from "./env.js";

let memServer = null;

export async function connectDB() {
  mongoose.set("strictQuery", true);
  const useMemoryDirectly = env.MONGO_URI === "memory" || (!isProd && env.MONGO_URI.includes("localhost:27017"));
  let primaryOk = false;
  if (useMemoryDirectly) {
    console.log(`[db] using mongodb-memory-server (env MONGO_URI=${env.MONGO_URI})`);
  } else {
    try {
      await mongoose.connect(env.MONGO_URI, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        autoIndex: false,
        autoCreate: false,
      });
      // verify auth by attempting a real read — find requires auth on --auth host
      try {
        await mongoose.connection.db.collection("__auth_check__").findOne({}, { maxTimeMS: 2000 });
        primaryOk = true;
        console.log(`[db] connected ${env.MONGO_URI.replace(/\/\/.*@/, "//***@")}`);
      } catch (pingErr) {
        const isAuthError = pingErr.code === 13 || /authentication/i.test(pingErr.message);
        if (isAuthError && env.NODE_ENV !== "production") {
          console.warn(`[db] primary auth check failed (${pingErr.message}), falling back to memory server...`);
          await mongoose.disconnect().catch(() => {});
        } else throw pingErr;
      }
    } catch (err) {
      console.error("[db] primary connection error:", err.message);
      const isAuthError = err.code === 13 || /authentication/i.test(err.message) || /ECONNREFUSED/i.test(err.message);
      const allowFallback = env.NODE_ENV !== "production" && isAuthError;
      if (!allowFallback && !primaryOk) throw err;
    }
  }

  // fallback to in-memory if primary not ok
  if (!primaryOk) {
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      memServer = await MongoMemoryServer.create({
        instance: { dbName: "campuszen" },
      });
      const uri = memServer.getUri();
      console.log(`[db] memory server uri ${uri}`);
      await mongoose.connect(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        autoCreate: true,
        autoIndex: true,
      });
      console.log("[db] connected via memory server");
      primaryOk = true;
    } catch (memErr) {
      console.error("[db] memory fallback failed:", memErr.message);
      throw memErr;
    }
  } else {
    // primary ok — enable autoIndex/create now and sync indexes manually
    try {
      await mongoose.connection.syncIndexes().catch(() => {});
    } catch {}
  }

  mongoose.connection.on("error", (e) => console.error("[db] error", e.message));
  mongoose.connection.on("disconnected", () => console.warn("[db] disconnected"));
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memServer) {
    try {
      await memServer.stop();
      console.log("[db] memory server stopped");
      memServer = null;
    } catch {}
  }
}

export function getMemServer() {
  return memServer;
}
