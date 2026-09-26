import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { authController } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { signupLimiter, loginLimiter, verifyLimiter, forgotLimiter, resendLimiter, checkUsernameLimiter, refreshLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// --- Zod schemas ---
const emailDomain = z
  .string()
  .email()
  .transform((v) => v.toLowerCase().trim())
  .refine((v) => ["gmail.com", "proton.me"].includes(v.split("@")[1] || ""), {
    message: "Email must be gmail.com or proton.me",
  });

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name at least 2 chars").max(50),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(20)
    .regex(/^[a-z0-9_]+$/, "Only a-z, 0-9 and _"),
  email: emailDomain,
  password: z.string().min(8, "Minimum 8 characters").max(128),
  remember: z.boolean().optional(),
  agree: z.boolean().optional(), // frontend checkbox, not enforced server-side but allowed
});

const verifySchema = z.object({
  email: emailDomain,
  otp: z.string().regex(/^[0-9]{6}$/, "6-digit code required"),
});

const resendSchema = z.object({
  email: emailDomain,
  type: z.enum(["verify", "reset"]),
});

const loginSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(20).regex(/^[a-z0-9_]+$/),
  password: z.string().min(1).max(128),
  remember: z.boolean().optional().default(true),
});

const forgotSchema = z.object({
  email: emailDomain,
});

const resetSchema = z.object({
  email: emailDomain,
  otp: z.string().regex(/^[0-9]{6}$/),
  newPassword: z.string().min(8).max(128).optional(),
  password: z.string().min(8).max(128).optional(),
}).refine((d) => d.newPassword || d.password, { message: "newPassword required", path: ["newPassword"] });

const checkQuery = z.object({
  username: z.string().trim().toLowerCase().min(1).max(20),
});

// routes
router.get("/check-username", checkUsernameLimiter, validate(checkQuery, "query"), authController.checkUsername);

router.post("/signup", signupLimiter, validate(signupSchema), authController.signup);
router.post("/verify-email", verifyLimiter, validate(verifySchema), authController.verifyEmail);
router.post("/resend-otp", resendLimiter, validate(resendSchema), authController.resendOtp);
router.post("/login", loginLimiter, validate(loginSchema), authController.login);
router.post("/refresh", refreshLimiter, authController.refresh);
router.post("/logout", authController.logout);
router.get("/me", protect, authController.me);
router.post("/forgot-password", forgotLimiter, validate(forgotSchema), authController.forgotPassword);
router.post("/reset-password", verifyLimiter, validate(resetSchema), authController.resetPassword);

export default router;
