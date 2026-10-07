import { userService } from "../services/userService.js";
import { postService } from "../services/postService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const userController = {
  listUsers: asyncHandler(async (req, res) => {
    const { q, college, course, academicYear, page, limit } = req.query;
    const viewerId = req.user?._id || null;
    const result = await userService.listUsers({ q, college, course, academicYear, page, limit, viewerId });
    const isGuest = !req.user;
    res.json({ success: true, data: { ...result, isGuest } });
  }),

  getByUsername: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const user = await userService.getByUsername(req.params.username, viewerId);
    res.json({ success: true, data: { user } });
  }),

  getUserPosts: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const { page, limit, kind } = req.query;
    const user = await userService.getByUsername(req.params.username, viewerId);
    if (user.privateHidden) {
      const { AppError } = await import("../utils/AppError.js");
      throw new AppError("This account is private. Follow to see their posts.", 403, "PRIVATE_ACCOUNT");
    }
    const cleanKind = kind === "article" || kind === "post" ? kind : undefined;
    const result = await postService.list({ author: user._id, kind: cleanKind, page, limit, viewerId });
    res.json({ success: true, data: result });
  }),

  getUserReplies: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const { page, limit } = req.query;
    const user = await userService.getByUsername(req.params.username, viewerId);
    if (user.privateHidden) {
      const { AppError } = await import("../utils/AppError.js");
      throw new AppError("This account is private.", 403, "PRIVATE_ACCOUNT");
    }
    const result = await postService.listRepliesByUser(user._id, { page, limit });
    res.json({ success: true, data: result });
  }),

  getUserLikes: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const { page, limit } = req.query;
    const user = await userService.getByUsername(req.params.username, viewerId);
    if (user.privateHidden) {
      const { AppError } = await import("../utils/AppError.js");
      throw new AppError("This account is private.", 403, "PRIVATE_ACCOUNT");
    }
    const result = await postService.list({ likedBy: user._id, page, limit, viewerId });
    res.json({ success: true, data: result });
  }),

  getUserReposts: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const { page, limit } = req.query;
    const user = await userService.getByUsername(req.params.username, viewerId);
    if (user.privateHidden) {
      const { AppError } = await import("../utils/AppError.js");
      throw new AppError("This account is private.", 403, "PRIVATE_ACCOUNT");
    }
    const result = await postService.list({ repostedBy: user._id, page, limit, viewerId });
    res.json({ success: true, data: result });
  }),

  getUserMedia: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const { page, limit } = req.query;
    const user = await userService.getByUsername(req.params.username, viewerId);
    if (user.privateHidden) {
      const { AppError } = await import("../utils/AppError.js");
      throw new AppError("This account is private.", 403, "PRIVATE_ACCOUNT");
    }
    const result = await postService.mediaByAuthor(user._id, { page, limit }, viewerId);
    res.json({ success: true, data: result });
  }),

  updatePrivacy: asyncHandler(async (req, res) => {
    const user = await userService.updatePrivacy(req.user._id, req.body);
    res.json({ success: true, message: "Privacy settings updated", data: { user } });
  }),

  exportMe: asyncHandler(async (req, res) => {
    const data = await userService.exportData(req.user._id);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="campuszen-export-${Date.now()}.json"`);
    res.json({ success: true, data });
  }),

  deactivateMe: asyncHandler(async (req, res) => {
    const user = await userService.deactivate(req.user._id);
    res.json({ success: true, message: "Account deactivated. You have 30 days to restore before permanent deletion.", data: { user } });
  }),

  reactivateMe: asyncHandler(async (req, res) => {
    const user = await userService.reactivate(req.user._id);
    res.json({ success: true, message: "Account restored", data: { user } });
  }),

  deleteMe: asyncHandler(async (req, res) => {
    // Graceful delete: deactivate first; purge only on explicit confirm.
    const { confirm } = req.body || {};
    if (confirm === "PERMANENTLY_DELETE") {
      const result = await userService.purge(req.user._id);
      res.json({ success: true, message: "Account permanently deleted", data: result });
      return;
    }
    const user = await userService.deactivate(req.user._id);
    res.json({ success: true, message: "Account scheduled for deletion in 30 days. Reactivate to cancel.", data: { user, scheduledDeletionAt: user.scheduledDeletionAt } });
  }),

  myBookmarks: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await postService.bookmarks(req.user._id, { page, limit });
    res.json({ success: true, data: result });
  }),

  suggestions: asyncHandler(async (req, res) => {
    const result = await userService.suggestions(req.user._id, { limit: req.query.limit });
    res.json({ success: true, data: result });
  }),

  updateMe: asyncHandler(async (req, res) => {
    const user = await userService.updateMe(req.user._id, req.body);
    res.json({ success: true, message: "Profile updated", data: { user } });
  }),

  updateAvatar: asyncHandler(async (req, res) => {
    if (!req.file) throw new (await import("../utils/AppError.js")).AppError("No avatar file provided", 400, "NO_FILE");
    const user = await userService.updateAvatar(req.user._id, req.file);
    res.json({ success: true, message: "Avatar updated", data: { user } });
  }),

  updateCover: asyncHandler(async (req, res) => {
    if (!req.file) throw new (await import("../utils/AppError.js")).AppError("No cover file provided", 400, "NO_FILE");
    const user = await userService.updateCover(req.user._id, req.file);
    res.json({ success: true, message: "Cover updated", data: { user } });
  }),

  pinPost: asyncHandler(async (req, res) => {
    const user = await userService.setPinnedPost(req.user._id, req.body.postId);
    res.json({ success: true, message: "Post pinned", data: { user } });
  }),

  unpinPost: asyncHandler(async (req, res) => {
    const user = await userService.setPinnedPost(req.user._id, null);
    res.json({ success: true, message: "Post unpinned", data: { user } });
  }),
};
