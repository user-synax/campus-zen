import { adminService } from "../services/adminService.js";
import { signAdminToken } from "../middleware/adminAuth.js";
import { setAdminCookie, clearAdminCookie } from "../utils/cookies.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const adminController = {
  login: asyncHandler(async (req, res) => {
    const { email, passkey } = req.body;
    const result = await adminService.login({ email, passkey });
    const token = signAdminToken();
    setAdminCookie(res, token);
    res.json({ success: true, message: "Admin login successful", data: result });
  }),

  logout: asyncHandler(async (req, res) => {
    clearAdminCookie(res);
    res.json({ success: true, message: "Admin logged out" });
  }),

  me: asyncHandler(async (req, res) => {
    res.json({ success: true, data: { email: req.admin.email, role: "admin" } });
  }),

  stats: asyncHandler(async (req, res) => {
    const data = await adminService.stats();
    res.json({ success: true, data });
  }),

  listReports: asyncHandler(async (req, res) => {
    const { status = "open", page = 1, limit = 20 } = req.query;
    const data = await adminService.listReports({ status, page, limit });
    res.json({ success: true, data });
  }),

  resolveReport: asyncHandler(async (req, res) => {
    const { status } = req.body;
    const report = await adminService.resolveReport(req.params.id, status);
    res.json({ success: true, message: `Report ${status}`, data: { report } });
  }),

  deletePost: asyncHandler(async (req, res) => {
    const result = await adminService.deletePost(req.params.id);
    res.json({ success: true, ...result });
  }),

  suspendUser: asyncHandler(async (req, res) => {
    const { reason } = req.body || {};
    const user = await adminService.suspendUser(req.params.id, reason);
    res.json({ success: true, message: "User suspended", data: { user } });
  }),

  unsuspendUser: asyncHandler(async (req, res) => {
    const user = await adminService.unsuspendUser(req.params.id);
    res.json({ success: true, message: "User unsuspended", data: { user } });
  }),

  listAppeals: asyncHandler(async (req, res) => {
    const { status = "open", page = 1, limit = 20 } = req.query;
    const data = await adminService.listAppeals({ status, page, limit });
    res.json({ success: true, data });
  }),

  reviewAppeal: asyncHandler(async (req, res) => {
    const { status, reviewNote } = req.body;
    const appeal = await adminService.reviewAppeal(req.params.id, { status, reviewNote });
    res.json({ success: true, message: `Appeal ${status}`, data: { appeal } });
  }),
};
