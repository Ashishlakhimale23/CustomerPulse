import "dotenv/config";
import express from "express";
import { authRouter } from "./routes/auth";
import { invitationRouter } from "./routes/invitations";
import { ticketRouter } from "./routes/tickets";
import { keywordRouter } from "./routes/keywords";
import { departmentRouter } from "./routes/departments";
import { categoryRouter } from "./routes/categories";
import { userRouter } from "./routes/users";
import { auditLogRouter } from "./routes/auditLogs";
import { startScheduledJobs } from "./job/scheduler";
import { securityHeaders, corsMiddleware } from "./middleware/security";
import { generalLimiter } from "./middleware/rateLimiter";
import { requestLogger } from "./middleware/requestLogger";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import { clientRouter } from "./routes/client";
import { managerDashboardRouter } from "./routes/managerDashboard";
import { requestorRouter } from "./routes/requestors";
import { notificationRouter } from "./routes/notifications";
import { cxoRouter } from "./routes/cxoDashboard";

const app = express();

// ---- global middleware, in order ----
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(express.json());
app.use(requestLogger);

// app.use(generalLimiter);
// ---- routes ----
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);
app.use("/departments", departmentRouter);
app.use("/categories", categoryRouter);
app.use("/users", userRouter);
app.use("/invitations", invitationRouter);
app.use("/tickets", ticketRouter);
app.use("/keywords", keywordRouter);
app.use("/audit-logs", auditLogRouter);
app.use("/clients",clientRouter)
app.use("/manager-dashboard",managerDashboardRouter)
app.use("/admin/requestors", requestorRouter)
app.use("/notifications", notificationRouter)
app.use("/cxo-dashboard",cxoRouter)
// ---- must be last ----
app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  
  console.log(`Helpdesk API listening on :${port}`);
});