import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as dashboardService from "../services/dashboard.service";

const router = Router();

router.use(authenticate);

router.get(
  "/metrics",
  asyncHandler(async (req: Request, res: Response) => {
    const metrics = await dashboardService.getDashboardMetrics(req.user!.id);
    res.json(metrics);
  })
);

router.get(
  "/low-stock",
  asyncHandler(async (req: Request, res: Response) => {
    const products = await dashboardService.getLowStockProducts(req.user!.id);
    res.json(products);
  })
);

router.get(
  "/orders-per-day",
  asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;
    const data = await dashboardService.getOrdersPerDay(req.user!.id, days);
    res.json(data);
  })
);

router.get(
  "/recent-orders",
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 5;
    const orders = await dashboardService.getRecentOrders(req.user!.id, limit);
    res.json(orders);
  })
);

router.get(
  "/recent-activity",
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const activity = await dashboardService.getRecentActivity(req.user!.id, limit);
    res.json(activity);
  })
);

export default router;
