import { followService } from "../services/followService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/User.js";

export const followController = {
  follow: asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    // ensure target exists and get live counts
    const result = await followService.follow(req.user._id, targetId);
    if (result.requested) return res.status(202).json({ success: true, message: "Follow request sent. Awaiting approval.", data: result });
    res.status(201).json({ success: true, message: "Followed", data: result });
  }),

  unfollow: asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const result = await followService.unfollow(req.user._id, targetId);
    res.json({ success: true, message: result.cancelledRequest ? "Follow request cancelled" : "Unfollowed", data: result });
  }),

  incoming: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await followService.incomingRequests(req.user._id, { page, limit });
    res.json({ success: true, data: result });
  }),

  outgoing: asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const result = await followService.outgoingRequests(req.user._id, { page, limit });
    res.json({ success: true, data: result });
  }),

  accept: asyncHandler(async (req, res) => {
    const result = await followService.acceptRequest(req.user._id, req.params.requestId);
    res.json({ success: true, message: "Follow request accepted", data: result });
  }),

  decline: asyncHandler(async (req, res) => {
    const result = await followService.declineRequest(req.user._id, req.params.requestId);
    res.json({ success: true, message: "Follow request declined", data: result });
  }),

  getFollowers: asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    // verify target exists
    const exists = await User.exists({ _id: targetId });
    if (!exists) return res.status(404).json({ success: false, message: "User not found", code: "USER_NOT_FOUND" });
    const { page, limit } = req.query;
    const viewerId = req.user?._id || null;
    const result = await followService.getFollowers(targetId, { page, limit, viewerId });
    res.json({ success: true, data: result });
  }),

  getFollowing: asyncHandler(async (req, res) => {
    const targetId = req.params.id;
    const exists = await User.exists({ _id: targetId });
    if (!exists) return res.status(404).json({ success: false, message: "User not found", code: "USER_NOT_FOUND" });
    const { page, limit } = req.query;
    const viewerId = req.user?._id || null;
    const result = await followService.getFollowing(targetId, { page, limit, viewerId });
    res.json({ success: true, data: result });
  }),
};
