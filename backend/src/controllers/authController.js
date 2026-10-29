import { authService } from "../services/authService.js";
import { setAuthCookies, clearAuthCookies, setAnalyticsCookie } from "../utils/cookies.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { describeRequest } from "../utils/device.js";
import { POLICY_VERSION, TERMS_VERSION, PRIVACY_VERSION } from "../config/policy.js";

export const authController = {
  signup: asyncHandler(async (req, res) => {
    const result = await authService.signup(req.body, describeRequest(req));
    setAnalyticsCookie(res, result.user?.consent?.analytics === true);
    // No auth cookies here: the account cannot be used until the emailed OTP
    // is entered. Cookies are issued by verifyEmail on success.
    res.status(201).json({
      success: true,
      message: result.parentalConsentRequired
        ? "Account created. A parent or guardian must approve it before you can verify your email."
        : "Account created. Check your email for a 6-digit verification code.",
      data: { ...result, verificationRequired: true },
    });
  }),

  policy: asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        policyVersion: POLICY_VERSION,
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
      },
    });
  }),

  verifyParentalConsent: asyncHandler(async (req, res) => {
    const result = await authService.verifyGuardianConsent(req.body, describeRequest(req));
    res.json({
      success: true,
      message: "Guardian consent recorded. Check your email for a verification code.",
      data: result,
    });
  }),

  requestParentalWithdrawal: asyncHandler(async (req, res) => {
    const result = await authService.requestGuardianConsentWithdrawal(req.body);
    res.json({ success: true, message: result.message });
  }),

  verifyParentalWithdrawal: asyncHandler(async (req, res) => {
    const result = await authService.verifyGuardianConsentWithdrawal(req.body, describeRequest(req));
    res.json({ success: true, message: result.message });
  }),

  verifyEmail: asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken, remember } = await authService.verifyEmail(
      req.body,
      describeRequest(req),
    );
    setAuthCookies(res, { accessToken, refreshToken, remember });
    setAnalyticsCookie(res, user?.consent?.analytics === true);
    res.json({
      success: true,
      message: "Email verified successfully.",
      // Tokens duplicated in body for native clients; web uses cookies.
      data: { user, accessToken, refreshToken },
    });
  }),

  resendOtp: asyncHandler(async (req, res) => {
    const result = await authService.resendOtp(req.body);
    res.json({ success: true, message: result.message });
  }),

  login: asyncHandler(async (req, res) => {
    const { username, password, remember } = req.body;
    const { user, accessToken, refreshToken, remember: rem } = await authService.login(
      { username, password, remember },
      describeRequest(req),
    );
    setAuthCookies(res, { accessToken, refreshToken, remember: rem });
    setAnalyticsCookie(res, user?.consent?.analytics === true);
    res.json({
      success: true,
      message: "Logged in",
      // Tokens duplicated in body for native clients; web uses cookies.
      data: { user, accessToken, refreshToken },
    });
  }),

  refresh: asyncHandler(async (req, res) => {
    const raw = req.body?.refreshToken || req.cookies?.refreshToken;
    const { accessToken, refreshToken, remember, user } = await authService.refresh(
      { refreshToken: raw },
      describeRequest(req),
    );
    // keep the device's original remember window (7d or 1d)
    setAuthCookies(res, { accessToken, refreshToken, remember });
    setAnalyticsCookie(res, user?.consent?.analytics === true);
    res.json({ success: true, message: "Token refreshed", data: { user, accessToken, refreshToken } });
  }),

  logout: asyncHandler(async (req, res) => {
    const refreshRaw = req.body?.refreshToken || req.cookies?.refreshToken;
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
    res.json({ success: true, message: result.message });
  }),

  verifyResetOtp: asyncHandler(async (req, res) => {
    const result = await authService.verifyResetOtp(req.body);
    res.json({ success: true, message: result.message });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    // frontend sends newPassword as password
    const result = await authService.resetPassword({ email, otp, newPassword: newPassword || req.body.password });
    res.json({ success: true, message: result.message });
  }),

  checkUsername: asyncHandler(async (req, res) => {
    const { username } = req.query;
    const result = await authService.checkUsername(username || "");
    res.json({ success: true, data: result });
  }),

  // ── Signed-in devices ──────────────────────────────────────────
  sessions: asyncHandler(async (req, res) => {
    const data = await authService.listSessions(req.user._id, req.sessionId);
    res.json({ success: true, data });
  }),

  revokeSession: asyncHandler(async (req, res) => {
    await authService.revokeSession(req.user._id, req.params.id);
    res.json({ success: true, message: "Device signed out" });
  }),

  revokeOtherSessions: asyncHandler(async (req, res) => {
    const revoked = await authService.revokeOtherSessions(req.user._id, req.sessionId);
    res.json({
      success: true,
      message: revoked
        ? `Signed out ${revoked} other device${revoked === 1 ? "" : "s"}`
        : "No other devices were signed in",
      data: { revoked },
    });
  }),
};
