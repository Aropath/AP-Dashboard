import { Router } from "express";
import {
  getSubscription, getPlans, changePlan,
  cancelSubscription, reactivateSubscription, getSubscriptionHistory,
} from "../controllers/subscriptionController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", getSubscription);
router.get("/plans", getPlans);
router.get("/history", getSubscriptionHistory);
router.post("/change", changePlan);
router.post("/cancel", cancelSubscription);
router.post("/reactivate", reactivateSubscription);

export default router;
