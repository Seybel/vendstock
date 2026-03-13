import { Router, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as orderService from "../services/order.service";

type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
const ORDER_STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

const router = Router();

const createOrderSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerContact: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1, "Product ID is required"),
        quantity: z.number().int().positive("Quantity must be positive"),
      })
    )
    .min(1, "At least one item is required"),
});

const updateStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});

router.use(authenticate);

router.post(
  "/",
  validate(createOrderSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.createOrder(req.user!.id, req.body);
    res.status(201).json(order);
  })
);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      search: req.query.search as string | undefined,
      status: req.query.status as OrderStatus | undefined,
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
      limit: parseInt(req.query.limit as string) || 20,
      offset: parseInt(req.query.offset as string) || 0,
    };
    const result = await orderService.getOrders(req.user!.id, filters);
    res.json(result);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.getOrderById(req.user!.id, req.params.id as string);
    res.json(order);
  })
);

router.patch(
  "/:id/status",
  validate(updateStatusSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const order = await orderService.updateOrderStatus(
      req.user!.id,
      req.params.id as string,
      req.body.status
    );
    res.json(order);
  })
);

export default router;
