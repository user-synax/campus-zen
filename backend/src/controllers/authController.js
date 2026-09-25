import { authService } from "../services/authService.js";
import { setAuthCookies, clearAuthCookies } from "../utils/cookies.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authController = {
  signup: asyncHandler(async (req, res) => {
    const user = await authService.signup(req.body);
    res.status(201).json({
      success: true,
      message: "Account created. Verification code sent to your email (check console in dev).",
      data: { user },
    });
  }),

  verifyEmail: asyncHandler(async (req, res) => {
    const user = await authService.verifyEmail(req.body);
    res.json({ success: true, message: "Email verified successfully.", data: { user } });
  }),

  resendOtp: asyncHandler(async (req, res) => {
    const result = await authService.resendOtp(req.body);
    res.json({ success: true, ...result });
  }),

  login: asyncHandler(async (req, res) => {
    const { username, password, remember } = req.body;
    const { user, accessToken, refreshToken, remember: rem } = await authService.login({ username, password, remember });
    setAuthCookies(res, { accessToken, refreshToken, remember: rem });
    res.json({
      success: true,
      message: user.isEmailVerified ? "Logged in" : "Logged in — please verify your email (banner)",
      data: { user },
    });
  }),

  refresh: asyncHandler(async (req, res) => {
    const raw = req.cookies?.refreshToken;
    const { accessToken, refreshToken, user } = await authService.refresh({ refreshToken: raw });
    // keep original remember window 7d for simplicity
    setAuthCookies(res, { accessToken, refreshToken, remember: true });
    res.json({ success: true, message: "Token refreshed", data: { user } });
  }),

  logout: asyncHandler(async (req, res) => {
    const refreshRaw = req.cookies?.refreshToken;
    // req.user may exist if access still valid, else use refresh token
    const userId = req.user?._id || null;
    await authService.logout(userId, refreshRaw);
    clearAuthCookies(res);
    res.json({ success: true, message: "Logged out" });
  }),

  me: asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user._id);
    res.json({ success: true, data: { user } });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    const result = await authService.forgotPassword(req.body);
    // always 200 to avoid enumeration
    res.json({ success: true, ...result });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    // frontend sends newPassword as password
    const result = await authService.resetPassword({ email, otp, newPassword: newPassword || req.body.password });
    res.json({ success: true, ...result });
  }),

  checkUsername: asyncHandler(async (req, res) => {
    const { username } = req.query;
    const result = await authService.checkUsername(username || "");
    res.json({ success: true, data: result });
  }),
};
