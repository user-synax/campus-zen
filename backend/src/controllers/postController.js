import { postService } from "../services/postService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const postController = {
  list: asyncHandler(async (req, res) => {
    const { author, likedBy, repostedBy, page, limit } = req.query;
    const viewerId = req.user?._id || null;
    const result = await postService.list({ author, likedBy, repostedBy, page, limit, viewerId });
    res.json({ success: true, data: result });
  }),

  listRepliesByUser: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await postService.listRepliesByUser(req.params.id, { page, limit });
    res.json({ success: true, data: result });
  }),

  create: asyncHandler(async (req, res) => {
    const post = await postService.create(req.user._id, req.body.text, req.file);
    res.status(201).json({ success: true, data: { post } });
  }),

  getById: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const post = await postService.getById(req.params.id, viewerId);
    res.json({ success: true, data: { post } });
  }),

  update: asyncHandler(async (req, res) => {
    const post = await postService.update(req.params.id, req.user._id, req.body.text);
    res.json({ success: true, data: { post } });
  }),

  remove: asyncHandler(async (req, res) => {
    const result = await postService.remove(req.params.id, req.user._id);
    res.json({ success: true, ...result });
  }),

  feed: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await postService.feed(req.user._id, { page, limit });
    res.json({ success: true, data: result });
  }),

  publicFeed: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const viewerId = req.user?._id || null;
    const result = await postService.publicFeed({ page, limit }, viewerId);
    res.json({ success: true, data: result });
  }),

  toggleLike: asyncHandler(async (req, res) => {
    const result = await postService.toggleLike(req.user._id, req.params.id);
    res.json({ success: true, data: result });
  }),

  toggleRepost: asyncHandler(async (req, res) => {
    const result = await postService.toggleRepost(req.user._id, req.params.id);
    res.json({ success: true, data: result });
  }),

  toggleBookmark: asyncHandler(async (req, res) => {
    const result = await postService.toggleBookmark(req.user._id, req.params.id);
    res.json({ success: true, data: result });
  }),

  createComment: asyncHandler(async (req, res) => {
    const result = await postService.createComment(req.user._id, req.params.id, req.body.text);
    res.status(201).json({ success: true, data: result });
  }),

  getComments: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const viewerId = req.user?._id || null;
    const result = await postService.getComments(req.params.id, { page, limit }, viewerId);
    res.json({ success: true, data: result });
  }),
};
