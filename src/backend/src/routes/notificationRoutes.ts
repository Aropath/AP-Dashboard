import { Router } from "express";
import {
  getNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../controllers/notificationController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", getNotifications);
router.post("/", createNotification);

router.patch("/:id/read", markNotificationRead);
router.patch("/read-all", markAllNotificationsRead);

router.delete("/:id", deleteNotification);

export default router;