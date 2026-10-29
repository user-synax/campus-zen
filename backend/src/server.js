import app from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { sweepExpiredRestrictions } from "./utils/accountState.js";
import { userService } from "./services/userService.js";

let server;
let restrictionSweep;
let purgeSweep;

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

  // Temporary restrictions lift themselves. Lazy checks at request time are
  // the hard guarantee; this sweep keeps dashboards and stats truthful.
  sweepExpiredRestrictions().catch(() => {});
  restrictionSweep = setInterval(() => {
    sweepExpiredRestrictions().catch(() => {});
  }, 5 * 60 * 1000);
  restrictionSweep.unref?.();

  // Deletion promises must actually execute. Run once at boot, then every six
  // hours; the query is indexed on scheduledDeletionAt.
  const runPurgeSweep = () => {
    userService
      .purgeExpiredAccounts()
      .then((r) => {
        if (r?.purged) console.log(`[purge] removed ${r.purged} expired account(s)`);
      })
      .catch((err) => console.error("[purge] sweep failed:", err.message));
  };
  runPurgeSweep();
  purgeSweep = setInterval(runPurgeSweep, 6 * 60 * 60 * 1000);
  purgeSweep.unref?.();

  // graceful shutdown
  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received, shutting down...`);
    if (restrictionSweep) clearInterval(restrictionSweep);
    if (purgeSweep) clearInterval(purgeSweep);
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
