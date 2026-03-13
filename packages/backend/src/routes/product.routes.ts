import { Router, Request, Response } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as productService from "../services/product.service";

const router = Router();

const createProductSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  price: z.number().positive("Price must be positive"),
  costPrice: z.number().positive("Cost price must be positive").optional(),
  quantity: z.number().int().min(0, "Quantity cannot be negative"),
  lowStockThreshold: z.number().int().min(0).optional(),
  imageUrl: z.string().url().optional(),
});

const updateProductSchema = createProductSchema.partial();

router.use(authenticate);

router.post(
  "/",
  validate(createProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.createProduct(req.user!.id, req.body);
    res.status(201).json(product);
  })
);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const filters = {
      search: req.query.search as string | undefined,
      category: req.query.category as string | undefined,
      lowStock: req.query.lowStock === "true",
      isActive: req.query.isActive !== undefined ? req.query.isActive === "true" : undefined,
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
      limit: parseInt(req.query.limit as string) || 20,
      offset: parseInt(req.query.offset as string) || 0,
    };
    const result = await productService.getProducts(req.user!.id, filters);
    res.json(result);
  })
);

router.get(
  "/categories",
  asyncHandler(async (req: Request, res: Response) => {
    const categories = await productService.getCategories(req.user!.id);
    res.json(categories);
  })
);

// Must be registered before "/:id" so Express doesn't match "generate-sku" as an id.
router.get(
  "/generate-sku",
  asyncHandler(async (_req: Request, res: Response) => {
    const sku = await productService.generateUniqueSku();
    res.json({ sku });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.getProductById(req.user!.id, req.params.id as string);
    res.json(product);
  })
);

router.put(
  "/:id",
  validate(updateProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const product = await productService.updateProduct(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    res.json(product);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    await productService.deleteProduct(req.user!.id, req.params.id as string);
    res.json({ message: "Product deleted" });
  })
);

export default router;
