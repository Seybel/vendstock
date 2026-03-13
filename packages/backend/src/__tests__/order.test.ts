import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../utils/prisma";
import { generateToken } from "../middleware/auth";
import { Prisma } from "@prisma/client";

const mockPrisma = vi.mocked(prisma);

describe("Order Routes", () => {
  const token = generateToken({ id: "user-1", email: "test@test.com", name: "Test" });
  const authHeader = `Bearer ${token}`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/orders", () => {
    it("should create an order and deduct stock", async () => {
      const mockProduct = {
        id: "prod-1",
        sku: "TEST-001",
        name: "Test Product",
        description: null,
        category: "Test",
        price: new Prisma.Decimal(29.99),
        costPrice: null,
        quantity: 50,
        lowStockThreshold: 10,
        imageUrl: null,
        isActive: true,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock transaction internals
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          product: {
            findMany: vi.fn().mockResolvedValue([mockProduct]),
            update: vi.fn().mockResolvedValue({ ...mockProduct, quantity: 48 }),
          },
          order: {
            create: vi.fn().mockResolvedValue({
              id: "order-1",
              orderNumber: "ORD-20240101-ABC123",
              status: "PENDING",
              customerName: "John Doe",
              customerContact: "@johndoe",
              notes: null,
              totalAmount: new Prisma.Decimal(59.98),
              userId: "user-1",
              createdAt: new Date(),
              updatedAt: new Date(),
              items: [
                {
                  id: "item-1",
                  quantity: 2,
                  unitPrice: new Prisma.Decimal(29.99),
                  total: new Prisma.Decimal(59.98),
                  productId: "prod-1",
                  orderId: "order-1",
                  product: mockProduct,
                },
              ],
            }),
          },
        };
        return fn(tx);
      });
      mockPrisma.activityLog.create.mockResolvedValue({} as any);

      const res = await request(app)
        .post("/api/orders")
        .set("Authorization", authHeader)
        .send({
          customerName: "John Doe",
          customerContact: "@johndoe",
          items: [{ productId: "prod-1", quantity: 2 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.orderNumber).toBeDefined();
    });

    it("should validate order data", async () => {
      const res = await request(app)
        .post("/api/orders")
        .set("Authorization", authHeader)
        .send({ customerName: "" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/orders", () => {
    it("should list orders", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      const res = await request(app)
        .get("/api/orders")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("orders");
      expect(res.body).toHaveProperty("total");
    });

    it("should filter orders by status", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);
      mockPrisma.order.count.mockResolvedValue(0);

      const res = await request(app)
        .get("/api/orders?status=PENDING")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("orders");
    });
  });

  describe("GET /api/orders/:id", () => {
    it("should return a single order", async () => {
      mockPrisma.order.findFirst.mockResolvedValue({
        id: "order-1",
        orderNumber: "ORD-20240101-XYZ",
        status: "PENDING",
        customerName: "Jane Doe",
        customerContact: "@janedoe",
        notes: null,
        totalAmount: new Prisma.Decimal(59.98),
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      } as any);

      const res = await request(app)
        .get("/api/orders/order-1")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("order-1");
      expect(res.body.customerName).toBe("Jane Doe");
    });

    it("should return 404 for unknown order", async () => {
      mockPrisma.order.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/orders/nonexistent")
        .set("Authorization", authHeader);

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /api/orders/:id/status", () => {
    it("should update order status", async () => {
      const mockOrder = {
        id: "order-1",
        orderNumber: "ORD-20240101-XYZ",
        status: "PENDING",
        customerName: "Jane Doe",
        customerContact: null,
        notes: null,
        totalAmount: new Prisma.Decimal(50),
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.order.findFirst.mockResolvedValue(mockOrder as any);
      mockPrisma.order.update.mockResolvedValue({
        ...mockOrder,
        status: "CONFIRMED",
        items: [],
      } as any);
      mockPrisma.activityLog.create.mockResolvedValue({} as any);

      const res = await request(app)
        .patch("/api/orders/order-1/status")
        .set("Authorization", authHeader)
        .send({ status: "CONFIRMED" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("CONFIRMED");
    });

    it("should restore stock when cancelling an order", async () => {
      const mockOrder = {
        id: "order-1",
        orderNumber: "ORD-20240101-XYZ",
        status: "PENDING",
        customerName: "Jane Doe",
        customerContact: null,
        notes: null,
        totalAmount: new Prisma.Decimal(50),
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.order.findFirst
        .mockResolvedValueOnce(mockOrder as any)
        .mockResolvedValueOnce({ ...mockOrder, status: "CANCELLED", items: [] } as any);
      mockPrisma.orderItem.findMany.mockResolvedValue([
        { id: "item-1", productId: "prod-1", quantity: 2, orderId: "order-1" } as any,
      ]);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          product: { update: vi.fn().mockResolvedValue({}) },
          order: {
            update: vi.fn().mockResolvedValue({ ...mockOrder, status: "CANCELLED" }),
          },
        };
        return fn(tx);
      });
      mockPrisma.activityLog.create.mockResolvedValue({} as any);

      const res = await request(app)
        .patch("/api/orders/order-1/status")
        .set("Authorization", authHeader)
        .send({ status: "CANCELLED" });

      expect(res.status).toBe(200);
    });

    it("should reject invalid status", async () => {
      const res = await request(app)
        .patch("/api/orders/order-1/status")
        .set("Authorization", authHeader)
        .send({ status: "INVALID_STATUS" });

      expect(res.status).toBe(400);
    });
  });
});
