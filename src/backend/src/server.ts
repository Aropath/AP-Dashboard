import "dotenv/config";
import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import clientRoutes from "./routes/clientRoutes";
import ga4AuthRoutes from "./routes/ga4AuthRoutes";
import { startSubscriptionCron } from "./services/subscriptionCron";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
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
app.use("/api/ga4/auth", ga4AuthRoutes);   // ← GA4 OAuth + token storage

app.use((_req, res) => res.status(404).json({ error: "Route not found" }));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = parseInt(process.env.PORT || "5000", 10);

app.listen(PORT, () => {
  console.log(`\n🔐 Auth service running on http://localhost:${PORT}`);
  startSubscriptionCron();
});

export default app;
