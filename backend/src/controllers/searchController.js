import { searchService } from "../services/searchService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const searchController = {
  search: asyncHandler(async (req, res) => {
    const { q, page, limit, type } = req.query;
    const viewerId = req.user?._id || null;
    const result = await searchService.search({ q, page, limit, type, viewerId });
    res.json({ success: true, data: result });
  }),
};
