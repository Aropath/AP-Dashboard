// src/routes/authRoutes.ts
import { Router } from "express";
import {
  signUp, signIn, googleAuth, refreshAccessToken, logout, getMe,
} from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

console.log("AUTH ROUTES LOADED");
const router = Router();

router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/google", googleAuth);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);

export default router;
