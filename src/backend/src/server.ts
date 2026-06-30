import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import clientRoutes from "./routes/clientRoutes";
import { startSubscriptionCron } from "./services/subscriptionCron";
import projectRoutes from "./routes/projectRoutes";
import notificationRoutes from "./routes/notificationRoutes";
// import brevoRoutes from "./routes/brevoRoutes";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "auth", timestamp: new Date().toISOString() });
});

// ── Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/clients", clientRoutes);
// app.use("/api/brevo", brevoRoutes);        // ← Brevo API routes
app.use("/api/sdk/projects", projectRoutes);   // ← Project API Management routes used by Settings page
app.use("/api/projects", projectRoutes);       // ← Team/join routes used by App.tsx user popover
app.use("/api/notifications", notificationRoutes);

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = parseInt(process.env.PORT || "5000", 10);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🔐 Auth service running on port:${PORT}`);
  startSubscriptionCron();
});

export default app;
