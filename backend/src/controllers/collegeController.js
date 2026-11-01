import { collegeService } from "../services/collegeService.js";
import { collegeAdminService } from "../services/collegeAdminService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const collegeController = {
  search: asyncHandler(async (req, res) => {
    const { q, page, limit } = req.query;
    const result = await collegeService.search({ q, page, limit });
    res.json({ success: true, data: result });
  }),

  getBySlug: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const college = await collegeService.getBySlug(req.params.slug, viewerId);
    res.json({ success: true, data: { college } });
  }),

  listMembers: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const { page, limit } = req.query;
    const result = await collegeService.listMembers(req.params.slug, { page, limit, viewerId });
    res.json({ success: true, data: result });
  }),

  listPosts: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const { page, limit } = req.query;
    const result = await collegeService.listPosts(req.params.slug, { page, limit, viewerId });
    res.json({ success: true, data: result });
  }),

  // ── College moderation (owner + delegated college admins) ───────────────
  // The viewer's effective role + switches on this college — the page uses
  // it to decide which tools to render.
  myCaps: asyncHandler(async (req, res) => {
    const data = await collegeAdminService.myCaps(req.params.slug, req.user || null);
    res.json({ success: true, data });
  }),

  // Live "active now" strip — snapshot of who's connected. REST gives the
  // initial paint; SSE `presence` events keep it live afterwards.
  activeNow: asyncHandler(async (req, res) => {
    const { presenceSnapshot } = await import("../services/presenceService.js");
    const data = await presenceSnapshot(req.params.slug);
    res.json({ success: true, data });
  }),

  // Owner-only management below the cloud of /admin: assignment, per-admin
  // switch flips, demotion, the banned list.
  listAdmins: asyncHandler(async (req, res) => {
    const data = await collegeAdminService.listAdmins(req.params.slug);
    res.json({ success: true, data });
  }),

  addAdmin: asyncHandler(async (req, res) => {
    const { username } = req.body;
    const data = await collegeAdminService.addAdmin(req.params.slug, username, req.user._id);
    res.json({ success: true, message: "College admin added", data });
  }),

  updateAdminCaps: asyncHandler(async (req, res) => {
    const { kick, ban, moderatePosts } = req.body;
    const data = await collegeAdminService.updateCaps(req.params.slug, req.params.userId, {
      kick,
      ban,
      moderatePosts,
    });
    res.json({ success: true, message: "Permissions updated", data });
  }),

  removeAdmin: asyncHandler(async (req, res) => {
    await collegeAdminService.removeAdmin(req.params.slug, req.params.userId);
    res.json({ success: true, message: "College admin removed" });
  }),

  kickMember: asyncHandler(async (req, res) => {
    await collegeAdminService.kickMember(req.params.slug, req.params.userId, req.user);
    res.json({ success: true, message: "Member removed from the college" });
  }),

  banMember: asyncHandler(async (req, res) => {
    await collegeAdminService.banMember(req.params.slug, req.params.userId, req.user);
    res.json({ success: true, message: "Member banned from the college" });
  }),

  unbanMember: asyncHandler(async (req, res) => {
    await collegeAdminService.unbanMember(req.params.slug, req.params.userId);
    res.json({ success: true, message: "Ban lifted — they can claim the college again" });
  }),

  moderatePost: asyncHandler(async (req, res) => {
    await collegeAdminService.moderatePost(req.params.slug, req.params.postId, req.user);
    res.json({ success: true, message: "Post removed" });
  }),
};
