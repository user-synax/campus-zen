import rateLimit from "express-rate-limit";

function jsonHandler(message) {
  return (req, res) => {
    res.status(429).json({ success: false, message });
  };
}

export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1h
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler("Too many signup attempts. Try again in an hour."),
});

export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1m
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler("Too many login attempts. Try again in a minute."),
});

export const verifyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler("Too many verification attempts. Try again shortly."),
});

export const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler("Too many reset requests. Try again later."),
});

export const resendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10m
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler("Too many resend requests. Wait 10 minutes."),
});

export const checkUsernameLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler("Too many checks. Slow down."),
});

export const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler("Too many refresh attempts."),
});
