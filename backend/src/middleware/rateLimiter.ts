import rateLimit from "express-rate-limit";

// Applied to every route. Generous, since most callers are authenticated
// staff hitting this from an internal app, not the public internet.
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Applied to unauthenticated endpoints where the "credential" can be
// brute-forced (login password, invitation token) - POST /auth/login and
// POST /invitations/accept both use this.
export const publicTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});
