import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { env } from "./config/env.js";

let server;

async function start() {
  try {
    await connectDB();
  } catch (err) {
    console.error("[server] DB failed, exiting");
    process.exit(1);
  }

  server = app.listen(env.PORT, () => {
    console.log(`[server] CampusZen API listening on http://localhost:${env.PORT}  env=${env.NODE_ENV}  frontend=${env.FRONTEND_URL}`);
  });

  // graceful shutdown
  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received, shutting down...`);
    if (server) {
      server.close(async () => {
        try {
          await disconnectDB();
        } catch {}
        console.log("[server] closed");
        process.exit(0);
      });
      // force after 10s
      setTimeout(() => process.exit(1), 10000).unref();
    } else process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("unhandledRejection", (err) => {
    console.error("[unhandledRejection]", err);
    shutdown("unhandledRejection");
  });
  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException]", err);
    shutdown("uncaughtException");
  });
}

start();
