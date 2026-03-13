import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import { NotFoundError, BadRequestError } from "../utils/errors";
import { logActivity } from "./activityLog.service";

type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

interface OrderItemInput {
  productId: string;
  quantity: number;
}

interface CreateOrderInput {
  customerName: string;
  customerContact?: string;
  notes?: string;
  items: OrderItemInput[];
}

interface OrderFilters {
  search?: string;
  status?: OrderStatus;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

function generateOrderNumber(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}

export async function createOrder(userId: string, data: CreateOrderInput) {
  if (!data.items.length) {
    throw new BadRequestError("Order must contain at least one item");
  }

  const order = await prisma.$transaction(async (tx) => {
    // Verify all products exist and have sufficient stock
    const productIds = data.items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, userId, isActive: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestError("One or more products not found or inactive");
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let totalAmount = new Prisma.Decimal(0);
    const orderItems: { productId: string; quantity: number; unitPrice: Prisma.Decimal; total: Prisma.Decimal }[] = [];

    for (const item of data.items) {
      const product = productMap.get(item.productId)!;
      if (product.quantity < item.quantity) {
        throw new BadRequestError(
          `Insufficient stock for "${product.name}". Available: ${product.quantity}, Requested: ${item.quantity}`
        );
      }
      const itemTotal = product.price.mul(item.quantity);
      totalAmount = totalAmount.add(itemTotal);
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        total: itemTotal,
      });
    }

    // Create order with nested items in a single write
    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerName: data.customerName,
        customerContact: data.customerContact,
        notes: data.notes,
        totalAmount,
        userId,
        items: {
          create: orderItems,
        },
      },
      include: { items: { include: { product: true } } },
    });

    // Deduct stock
    for (const item of data.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    return created;
  });

  // Log activity AFTER the transaction commits. Calling logActivity inside the
  // interactive transaction deadlocks on SQLite: logActivity uses the global
  // prisma client which opens a separate connection that blocks on the write
  // lock held by the transaction, while the transaction waits on logActivity.
  // The transaction would time out and roll back, yet the activity log write
  // would slip through once the lock released — producing a 500 response and a
  // phantom "created order" log entry with no matching order.
  await logActivity(
    userId,
    "CREATED_ORDER",
    "ORDER",
    order.id,
    `Created order ${order.orderNumber} for ${data.customerName} ($${order.totalAmount.toFixed(2)})`
  );

  return order;
}

export async function getOrders(userId: string, filters: OrderFilters = {}) {
  const {
    search,
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
    limit = 20,
    offset = 0,
  } = filters;

  const where: Prisma.OrderWhereInput = { userId };

  if (search) {
    // SQLite does not support mode: "insensitive" — contains is case-insensitive for ASCII by default
    where.OR = [
      { orderNumber: { contains: search } },
      { customerName: { contains: search } },
    ];
  }

  if (status) {
    where.status = status;
  }

  const allowedSortFields = ["createdAt", "totalAmount", "status", "customerName", "orderNumber"];
  const orderBy: Prisma.OrderOrderByWithRelationInput =
    allowedSortFields.includes(sortBy) ? { [sortBy]: sortOrder } : { createdAt: "desc" };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: { items: { include: { product: { select: { name: true, sku: true } } } } },
    }),
    prisma.order.count({ where }),
  ]);

  return { orders, total };
}

export async function getOrderById(userId: string, id: string) {
  const order = await prisma.order.findFirst({
    where: { id, userId },
    include: { items: { include: { product: true } } },
  });
  if (!order) throw new NotFoundError("Order not found");
  return order;
}

export async function updateOrderStatus(userId: string, id: string, status: OrderStatus) {
  const order = await prisma.order.findFirst({ where: { id, userId } });
  if (!order) throw new NotFoundError("Order not found");

  if (order.status === "CANCELLED") {
    throw new BadRequestError("Cannot update a cancelled order");
  }

  if (status === "CANCELLED") {
    // Restore stock
    const items = await prisma.orderItem.findMany({ where: { orderId: id } });
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
      }
      await tx.order.update({ where: { id }, data: { status } });
    });

    await logActivity(userId, "CANCELLED_ORDER", "ORDER", id, `Cancelled order ${order.orderNumber} and restored stock`);
    return prisma.order.findFirst({ where: { id }, include: { items: { include: { product: true } } } });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: { status },
    include: { items: { include: { product: true } } },
  });

  await logActivity(userId, "UPDATED_ORDER_STATUS", "ORDER", id, `Updated order ${order.orderNumber} status to ${status}`);
  return updated;
}
