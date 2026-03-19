import { Router } from "express";
import {
  getDashboard, getLatestMetrics, getTrafficAnalysis,
  getTopCountries, getAcquisitionChannels, getPagePerformance,
  getProductRevenue, getCohortRetention, ingestEvent,
} from "../controllers/analyticsController";
import { requireAuth } from "../middleware/auth";
import { requireFeature } from "../middleware/subscription";

const router = Router();

// Public ingest endpoint — secured by trackingId not JWT
router.post("/ingest", ingestEvent);

// All dashboard endpoints require auth
router.use(requireAuth);

router.get("/metrics/latest", getLatestMetrics);
router.get("/dashboard", getDashboard);
router.get("/dashboard/trafficAnalysis", getTrafficAnalysis);
router.get("/dashboard/topCountries", getTopCountries);
router.get(
  "/dashboard/acquisitionChannels",
  requireFeature("advanced_analytics"),
  getAcquisitionChannels
);
router.get(
  "/dashboard/pagePerformance",
  requireFeature("advanced_analytics"),
  getPagePerformance
);
router.get(
  "/dashboard/productRevenue",
  requireFeature("advanced_analytics"),
  getProductRevenue
);
router.get(
  "/dashboard/cohortRetention",
  requireFeature("cohort_analysis"),
  getCohortRetention
);

export default router;
