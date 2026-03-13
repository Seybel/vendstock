import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as activityLogService from "../services/activityLog.service";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await activityLogService.getActivityLogs(req.user!.id, {
      limit,
      offset,
    });
    res.json(result);
  })
);

export default router;
