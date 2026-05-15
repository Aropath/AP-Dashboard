import { Router } from "express";
import {
  getBrevoAuthUrl,
  handleBrevoCallback,
  getBrevoStatus,
  disconnectBrevo,
} from "../controllers/brevoController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ── Public callback (Brevo redirects here — no JWT) ──
router.get("/callback", handleBrevoCallback);

// ── All other routes require user JWT ──
router.use(requireAuth);

router.get("/url", getBrevoAuthUrl);              // GET    /api/brevo/url
router.get("/status", getBrevoStatus);            // GET    /api/brevo/status
router.delete("/disconnect", disconnectBrevo);    // DELETE /api/brevo/disconnect

export default router;
