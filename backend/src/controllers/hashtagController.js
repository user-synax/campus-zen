import { postService } from "../services/postService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const hashtagController = {
  postsByTag: asyncHandler(async (req, res) => {
    const viewerId = req.user?._id || null;
    const { page, limit } = req.query;
    const result = await postService.byHashtag(req.params.tag, { page, limit }, viewerId);
    res.json({ success: true, data: result });
  }),

  trending: asyncHandler(async (req, res) => {
    const { limit } = req.query;
    const result = await postService.trending({ limit });
    res.json({ success: true, data: result });
  }),
};
