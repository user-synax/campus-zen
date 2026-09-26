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
    const { page, limit } = req.query;
    const user = await userService.getByUsername(req.params.username, viewerId);
    const result = await postService.list({ author: user._id, page, limit, viewerId });
    res.json({ success: true, data: result });
  }),

  getUserReplies: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const { page, limit } = req.query;
    const user = await userService.getByUsername(req.params.username, viewerId);
    const result = await postService.listRepliesByUser(user._id, { page, limit });
    res.json({ success: true, data: result });
  }),

  getUserLikes: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const { page, limit } = req.query;
    const user = await userService.getByUsername(req.params.username, viewerId);
    const result = await postService.list({ likedBy: user._id, page, limit, viewerId });
    res.json({ success: true, data: result });
  }),

  getUserReposts: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const { page, limit } = req.query;
    const user = await userService.getByUsername(req.params.username);
    const result = await postService.list({ repostedBy: user._id, page, limit, viewerId });
    res.json({ success: true, data: result });
  }),

  getUserMedia: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const { page, limit } = req.query;
    const user = await userService.getByUsername(req.params.username, viewerId);
    const result = await postService.mediaByAuthor(user._id, { page, limit });
    res.json({ success: true, data: result });
  }),

  myBookmarks: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await postService.bookmarks(req.user._id, { page, limit });
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
