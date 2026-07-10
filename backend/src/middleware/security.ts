import helmet from "helmet";
import cors from "cors";

export const securityHeaders = helmet();

// Locks CORS to an explicit allowlist (comma-separated env var) instead
// of reflecting any origin. Falls back to allowing everything only when
// CORS_ORIGINS is unset, which is fine for local dev but should always
// be set in any deployed environment.
const allowedOrigins = process.env.CORS_ORIGINS?.split(",").map((o) => o.trim());

export const corsMiddleware = cors({
  origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true,
});
