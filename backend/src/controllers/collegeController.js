import { collegeService } from "../services/collegeService.js";
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
};
