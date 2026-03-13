import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import { NotFoundError, ConflictError, BadRequestError } from "../utils/errors";
import { logActivity } from "./activityLog.service";

interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  costPrice?: number;
  quantity: number;
  lowStockThreshold?: number;
  imageUrl?: string;
}

interface UpdateProductInput extends Partial<CreateProductInput> {}

interface ProductFilters {
  search?: string;
  category?: string;
  lowStock?: boolean;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

export async function createProduct(userId: string, data: CreateProductInput) {
  const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (existing) {
    throw new ConflictError(`Product with SKU "${data.sku}" already exists`);
  }

  const product = await prisma.product.create({
    data: {
      ...data,
      price: new Prisma.Decimal(data.price),
      costPrice: data.costPrice != null ? new Prisma.Decimal(data.costPrice) : null,
      userId,
    },
  });

  await logActivity(userId, "CREATED_PRODUCT", "PRODUCT", product.id, `Created product: ${product.name}`);
  return product;
}

export async function getProducts(userId: string, filters: ProductFilters = {}) {
  const {
    search,
    category,
    lowStock,
    isActive,
    sortBy = "createdAt",
    sortOrder = "desc",
    limit = 20,
    offset = 0,
  } = filters;

  const where: Prisma.ProductWhereInput = { userId };

  if (search) {
    // SQLite does not support mode: "insensitive" — contains is case-insensitive for ASCII by default
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (category) {
    where.category = category;
  }

  if (typeof isActive === "boolean") {
    where.isActive = isActive;
  }

  const allowedSortFields = ["name", "price", "quantity", "createdAt", "category", "sku"];
  const orderBy: Prisma.ProductOrderByWithRelationInput = allowedSortFields.includes(sortBy)
    ? { [sortBy]: sortOrder }
    : { createdAt: "desc" };

  // Fetch all matching products; low-stock filter is applied in-process since
  // SQLite has no way to compare quantity <= lowStockThreshold in a single WHERE clause
  const products = await prisma.product.findMany({
    where,
    orderBy,
  });

  const filtered = lowStock
    ? products.filter((p) => p.quantity <= p.lowStockThreshold)
    : products;

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  return { products: paginated, total };
}

export async function getProductById(userId: string, id: string) {
  const product = await prisma.product.findFirst({ where: { id, userId } });
  if (!product) throw new NotFoundError("Product not found");
  return product;
}

export async function updateProduct(userId: string, id: string, data: UpdateProductInput) {
  const product = await prisma.product.findFirst({ where: { id, userId } });
  if (!product) throw new NotFoundError("Product not found");

  if (data.sku && data.sku !== product.sku) {
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) throw new ConflictError(`SKU "${data.sku}" already in use`);
  }

  const updateData: Prisma.ProductUpdateInput = { ...data };
  if (data.price !== undefined) updateData.price = new Prisma.Decimal(data.price);
  if (data.costPrice !== undefined) updateData.costPrice = new Prisma.Decimal(data.costPrice);

  const updated = await prisma.product.update({ where: { id }, data: updateData });
  await logActivity(userId, "UPDATED_PRODUCT", "PRODUCT", id, `Updated product: ${updated.name}`);
  return updated;
}

export async function deleteProduct(userId: string, id: string) {
  const product = await prisma.product.findFirst({ where: { id, userId } });
  if (!product) throw new NotFoundError("Product not found");

  // Check if product has any order items
  const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });
  if (orderItemCount > 0) {
    // Soft delete by deactivating
    const updated = await prisma.product.update({ where: { id }, data: { isActive: false } });
    await logActivity(userId, "DEACTIVATED_PRODUCT", "PRODUCT", id, `Deactivated product: ${product.name} (has ${orderItemCount} orders)`);
    return updated;
  }

  await prisma.product.delete({ where: { id } });
  await logActivity(userId, "DELETED_PRODUCT", "PRODUCT", id, `Deleted product: ${product.name}`);
  return product;
}

export async function generateUniqueSku() {
  // Retry until we find a SKU that doesn't collide with the global unique index.
  // 36^6 ≈ 2.1B possibilities → collision is astronomically unlikely, but we
  // verify against the DB so the guarantee holds even as the table grows.
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    const sku = `SKU-${random}`;
    const existing = await prisma.product.findUnique({
      where: { sku },
      select: { id: true },
    });
    if (!existing) return sku;
  }
  throw new ConflictError("Could not generate a unique SKU, please try again");
}

export async function getCategories(userId: string) {
  const products = await prisma.product.findMany({
    where: { userId },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return products.map((p) => p.category);
}
