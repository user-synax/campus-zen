import crypto from "crypto";
import { Session } from "../models/Session.js";
import { AppError } from "../utils/AppError.js";
import { signRefreshToken, hashToken } from "../utils/jwt.js";

const REMEMBER_MS = 7 * 24 * 60 * 60 * 1000; // 7d
const DEFAULT_MS = 24 * 60 * 60 * 1000; // 1d
const MAX_SESSIONS = 10;
// A rotated token stays acceptable for this long so a double refresh (two tabs,
// flaky connection) is treated as a retry instead of token theft.
const REUSE_GRACE_MS = 30 * 1000;

const ttlFor = (remember) => (remember ? REMEMBER_MS : DEFAULT_MS);
const expiresIn = (remember) => new Date(Date.now() + ttlFor(remember));

// A refresh token must change on EVERY rotation. JWT `iat` is second-granular,
// so two rotations in the same second would otherwise sign byte-identical
// tokens and the "new" token would equal the one it replaced.
const signDeviceRefresh = (userId, sessionId, remember) =>
  signRefreshToken(
    { id: userId, sid: String(sessionId), jti: crypto.randomUUID() },
    remember
  );

/**
 * Per-device sessions. A refresh token is a JWT carrying `sid` (this document)
 * plus the user id; the document holds the sha256 of the token currently in
 * circulation, so rotation, revocation and theft detection are all local to one
 * device. `User.refreshTokenHash` is only read for tokens issued before this
 * existed (see rotate()).
 */
export const sessionService = {
  /** New login or email verification: always a fresh session, other devices stay signed in. */
  async create(user, { remember = true, device = {}, ip = null } = {}) {
    const session = await Session.create({
      user: user._id,
      // Replaced immediately below; the unique index needs a value at insert time.
      tokenHash: `pending:${crypto.randomUUID()}`,
      device,
      ip,
      remember,
      expiresAt: expiresIn(remember),
    });

    const refreshToken = signDeviceRefresh(user._id, session._id, remember);
    session.tokenHash = hashToken(refreshToken);
    await session.save();

    await this.prune(user._id);
    return { session, refreshToken };
  },

  /** Keep the newest MAX_SESSIONS devices; drop the ones that idled longest. */
  async prune(userId) {
    const stale = await Session.find({ user: userId })
      .sort({ lastUsedAt: -1 })
      .skip(MAX_SESSIONS)
      .select("_id")
      .lean();
    if (stale.length) await Session.deleteMany({ _id: { $in: stale.map((s) => s._id) } });
  },

  /**
   * Validate a presented refresh token and rotate it.
   * Returns the session plus a new refresh token; throws AppError on any problem.
   */
  async rotate(user, rawToken, decoded, { device = {}, ip = null } = {}) {
    const incomingHash = hashToken(rawToken);
    const sid = decoded?.sid ? String(decoded.sid) : null;

    if (!sid) {
      // Token issued before per-device sessions: validated against the single
      // hash still stored on the user, then migrated to a session in place so
      // the device stays signed in (no forced re-login on deploy). The session
      // is created before the old hash is cleared, so a failure here is harmless.
      if (!user.refreshTokenHash || incomingHash !== user.refreshTokenHash) {
        throw new AppError("Session revoked. Log in again.", 401, "SESSION_REVOKED");
      }
      const { session, refreshToken } = await this.create(user, {
        remember: true,
        device,
        ip,
      });
      user.refreshTokenHash = null;
      await user.save();
      return { session, refreshToken, migrated: true };
    }

    const session = await Session.findOne({ _id: sid, user: user._id });
    if (!session) throw new AppError("Session not found. Log in again.", 401, "SESSION_NOT_FOUND");

    if (session.expiresAt <= new Date()) {
      await Session.deleteOne({ _id: session._id });
      throw new AppError("Session expired. Log in again.", 401, "SESSION_EXPIRED");
    }

    const matchesCurrent = session.tokenHash === incomingHash;
    const withinGrace =
      Boolean(session.prevTokenHash) &&
      session.prevTokenHash === incomingHash &&
      Boolean(session.rotatedAt) &&
      Date.now() - session.rotatedAt.getTime() <= REUSE_GRACE_MS;

    if (!matchesCurrent && !withinGrace) {
      // Looks like a replayed token: drop the device rather than mint new ones.
      await Session.deleteOne({ _id: session._id });
      throw new AppError("Session revoked. Log in again.", 401, "SESSION_REVOKED");
    }

    const refreshToken = signDeviceRefresh(user._id, session._id, session.remember);
    session.prevTokenHash = session.tokenHash;
    session.tokenHash = hashToken(refreshToken);
    session.rotatedAt = new Date();
    session.lastUsedAt = new Date();
    session.expiresAt = expiresIn(session.remember);
    await session.save();

    return { session, refreshToken };
  },

  /** Revoke one device. Returns false when it isn't the caller's. */
  async revokeById(userId, sessionId) {
    const res = await Session.deleteOne({ _id: sessionId, user: userId });
    return res.deletedCount > 0;
  },

  /**
   * Revoke every session for a user, optionally sparing the caller's current
   * one. Passing no `exceptSessionId` signs the user out everywhere.
   */
  async revokeAll(userId, { exceptSessionId = null } = {}) {
    const filter = { user: userId };
    if (exceptSessionId) filter._id = { $ne: exceptSessionId };
    const res = await Session.deleteMany(filter);
    return res.deletedCount || 0;
  },

  /** Devices list for the settings screen. IPs are the user's own. */
  async list(userId, currentSessionId = null) {
    const rows = await Session.find({ user: userId }).sort({ lastUsedAt: -1 }).lean();
    return rows.map((s) => ({
      id: String(s._id),
      label: s.device?.label || "Unknown device",
      platform: s.device?.platform || "",
      userAgent: s.device?.userAgent || "",
      ip: s.ip || null,
      remember: Boolean(s.remember),
      current: currentSessionId ? String(s._id) === String(currentSessionId) : false,
      createdAt: s.createdAt,
      lastUsedAt: s.lastUsedAt,
      expiresAt: s.expiresAt,
    }));
  },
};
