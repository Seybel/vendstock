import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../utils/prisma";
import { generateToken } from "../middleware/auth";
import { Prisma } from "@prisma/client";

const mockPrisma = vi.mocked(prisma);

describe("Dashboard Routes", () => {
  const token = generateToken({ id: "user-1", email: "test@test.com", name: "Test" });
  const authHeader = `Bearer ${token}`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/dashboard/metrics", () => {
    it("should return dashboard metrics", async () => {
      mockPrisma.product.count.mockResolvedValue(5);
      mockPrisma.order.count.mockResolvedValue(3);
      mockPrisma.product.findMany
        .mockResolvedValueOnce([
          // low stock check
          { id: "p1", quantity: 5, lowStockThreshold: 10 } as any,
          { id: "p2", quantity: 15, lowStockThreshold: 10 } as any,
        ])
        .mockResolvedValueOnce([
          // inventory value
          { quantity: 5, price: new Prisma.Decimal(10) } as any,
          { quantity: 15, price: new Prisma.Decimal(20) } as any,
        ]);
      mockPrisma.order.findMany.mockResolvedValue([
        { totalAmount: new Prisma.Decimal(50), status: "DELIVERED" } as any,
        { totalAmount: new Prisma.Decimal(30), status: "PENDING" } as any,
        { totalAmount: new Prisma.Decimal(20), status: "CANCELLED" } as any,
      ]);

      const res = await request(app)
        .get("/api/dashboard/metrics")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("totalProducts");
      expect(res.body).toHaveProperty("totalOrders");
      expect(res.body).toHaveProperty("lowStockCount");
      expect(res.body).toHaveProperty("totalInventoryValue");
      expect(res.body).toHaveProperty("totalRevenue");
      expect(res.body).toHaveProperty("pendingOrders");
      expect(res.body.lowStockCount).toBe(1);
      expect(res.body.pendingOrders).toBe(1);
      // Revenue excludes CANCELLED orders
      expect(res.body.totalRevenue).toBe(80);
    });

    it("should require authentication", async () => {
      const res = await request(app).get("/api/dashboard/metrics");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/dashboard/low-stock", () => {
    it("should return low stock products", async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: "p1",
          sku: "SKU-001",
          name: "Low Product",
          quantity: 3,
          lowStockThreshold: 10,
          isActive: true,
        } as any,
        {
          id: "p2",
          sku: "SKU-002",
          name: "OK Product",
          quantity: 50,
          lowStockThreshold: 10,
          isActive: true,
        } as any,
      ]);

      const res = await request(app)
        .get("/api/dashboard/low-stock")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Only the low-stock item should be returned
      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Low Product");
    });
  });

  describe("GET /api/dashboard/orders-per-day", () => {
    it("should return orders per day data", async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get("/api/dashboard/orders-per-day")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Default is 30 days
      expect(res.body).toHaveLength(30);
      // Each entry should have date and count
      expect(res.body[0]).toHaveProperty("date");
      expect(res.body[0]).toHaveProperty("count");
    });
  });

  describe("GET /api/dashboard/recent-orders", () => {
    it("should return recent orders", async () => {
      mockPrisma.order.findMany.mockResolvedValue([
        {
          id: "order-1",
          orderNumber: "ORD-20240101-ABC",
          status: "PENDING",
          customerName: "Alice",
          totalAmount: new Prisma.Decimal(100),
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
        } as any,
      ]);

      const res = await request(app)
        .get("/api/dashboard/recent-orders")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].orderNumber).toBe("ORD-20240101-ABC");
    });
  });

  describe("GET /api/dashboard/recent-activity", () => {
    it("should return recent activity logs", async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue([
        {
          id: "log-1",
          action: "LOGGED_IN",
          entityType: "USER",
          entityId: "user-1",
          details: "User logged in",
          createdAt: new Date(),
          userId: "user-1",
        } as any,
      ]);

      const res = await request(app)
        .get("/api/dashboard/recent-activity")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].action).toBe("LOGGED_IN");
    });
  });
});
