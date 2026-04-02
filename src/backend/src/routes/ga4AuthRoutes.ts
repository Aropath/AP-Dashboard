import { Router } from "express";
import {
  getAuthUrl,
  handleCallback,
  listProperties,
  saveConnection,
  getConnectionStatus,
  disconnectGA4,
  getTokensForClient,
} from "../controllers/ga4AuthController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// ── Public callback (Google redirects here — no JWT) ──
router.get("/callback", handleCallback);

// ── Internal endpoint (called by port 5001 — secured by internal API key) ──
router.get("/internal/tokens/:clientId", getTokensForClient);

// ── All other routes require user JWT ──
router.use(requireAuth);

router.get("/url", getAuthUrl);                          // GET /api/ga4/auth/url?clientId=xxx
router.post("/properties", listProperties);              // POST /api/ga4/auth/properties
router.post("/connect", saveConnection);                 // POST /api/ga4/auth/connect
router.get("/status/:clientId", getConnectionStatus);    // GET  /api/ga4/auth/status/:clientId
router.delete("/disconnect/:clientId", disconnectGA4);   // DELETE /api/ga4/auth/disconnect/:clientId

export default router;
