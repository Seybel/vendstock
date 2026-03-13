import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../utils/prisma";
import { generateToken } from "../middleware/auth";
import { Prisma } from "@prisma/client";

const mockPrisma = vi.mocked(prisma);

describe("Product Routes", () => {
  const token = generateToken({ id: "user-1", email: "test@test.com", name: "Test" });
  const authHeader = `Bearer ${token}`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/products", () => {
    it("should create a product", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      mockPrisma.product.create.mockResolvedValue({
        id: "prod-1",
        sku: "TEST-001",
        name: "Test Product",
        description: "A test product",
        category: "Test",
        price: new Prisma.Decimal(29.99),
        costPrice: new Prisma.Decimal(10),
        quantity: 50,
        lowStockThreshold: 10,
        imageUrl: null,
        isActive: true,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.activityLog.create.mockResolvedValue({} as any);

      const res = await request(app)
        .post("/api/products")
        .set("Authorization", authHeader)
        .send({
          sku: "TEST-001",
          name: "Test Product",
          description: "A test product",
          category: "Test",
          price: 29.99,
          quantity: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.sku).toBe("TEST-001");
    });

    it("should reject unauthorized requests", async () => {
      const res = await request(app)
        .post("/api/products")
        .send({ sku: "TEST-001", name: "Test", category: "Test", price: 10, quantity: 5 });

      expect(res.status).toBe(401);
    });

    it("should validate product data", async () => {
      const res = await request(app)
        .post("/api/products")
        .set("Authorization", authHeader)
        .send({ name: "Test" }); // Missing required fields

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/products", () => {
    it("should list products with pagination", async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      const res = await request(app)
        .get("/api/products")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("products");
      expect(res.body).toHaveProperty("total");
    });

    it("should return products with correct fields", async () => {
      const mockProduct = {
        id: "prod-1",
        sku: "SKU-001",
        name: "Test Item",
        description: "A description",
        category: "Clothing",
        price: new Prisma.Decimal(25),
        costPrice: null,
        quantity: 20,
        lowStockThreshold: 5,
        imageUrl: null,
        isActive: true,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const res = await request(app)
        .get("/api/products")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body.products).toHaveLength(1);
      expect(res.body.products[0].name).toBe("Test Item");
      expect(res.body.total).toBe(1);
    });
  });

  describe("GET /api/products/:id", () => {
    it("should return a single product", async () => {
      mockPrisma.product.findFirst.mockResolvedValue({
        id: "prod-1",
        sku: "SKU-001",
        name: "Test Item",
        description: null,
        category: "Clothing",
        price: new Prisma.Decimal(25),
        costPrice: null,
        quantity: 20,
        lowStockThreshold: 5,
        imageUrl: null,
        isActive: true,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get("/api/products/prod-1")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("prod-1");
    });

    it("should return 404 for unknown product", async () => {
      mockPrisma.product.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/products/nonexistent")
        .set("Authorization", authHeader);

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /api/products/:id", () => {
    it("should update a product", async () => {
      const existing = {
        id: "prod-1",
        sku: "SKU-001",
        name: "Old Name",
        description: null,
        category: "Clothing",
        price: new Prisma.Decimal(25),
        costPrice: null,
        quantity: 20,
        lowStockThreshold: 5,
        imageUrl: null,
        isActive: true,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.product.findFirst.mockResolvedValue(existing);
      mockPrisma.product.update.mockResolvedValue({ ...existing, name: "New Name" });
      mockPrisma.activityLog.create.mockResolvedValue({} as any);

      const res = await request(app)
        .put("/api/products/prod-1")
        .set("Authorization", authHeader)
        .send({ name: "New Name" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("New Name");
    });
  });

  describe("DELETE /api/products/:id", () => {
    it("should delete a product with no orders", async () => {
      const existing = {
        id: "prod-1",
        sku: "SKU-001",
        name: "Test Item",
        description: null,
        category: "Clothing",
        price: new Prisma.Decimal(25),
        costPrice: null,
        quantity: 20,
        lowStockThreshold: 5,
        imageUrl: null,
        isActive: true,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.product.findFirst.mockResolvedValue(existing);
      mockPrisma.orderItem.count.mockResolvedValue(0);
      mockPrisma.product.delete.mockResolvedValue(existing);
      mockPrisma.activityLog.create.mockResolvedValue({} as any);

      const res = await request(app)
        .delete("/api/products/prod-1")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Product deleted");
    });

    it("should soft-delete a product that has orders", async () => {
      const existing = {
        id: "prod-1",
        sku: "SKU-001",
        name: "Test Item",
        description: null,
        category: "Clothing",
        price: new Prisma.Decimal(25),
        costPrice: null,
        quantity: 20,
        lowStockThreshold: 5,
        imageUrl: null,
        isActive: true,
        userId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.product.findFirst.mockResolvedValue(existing);
      mockPrisma.orderItem.count.mockResolvedValue(3);
      mockPrisma.product.update.mockResolvedValue({ ...existing, isActive: false });
      mockPrisma.activityLog.create.mockResolvedValue({} as any);

      const res = await request(app)
        .delete("/api/products/prod-1")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/products/generate-sku", () => {
    it("should generate a unique SKU", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get("/api/products/generate-sku")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("sku");
      expect(res.body.sku).toMatch(/^SKU-[A-Z0-9]{6}$/);
    });
  });

  describe("GET /api/products/categories", () => {
    it("should return unique product categories", async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { category: "Clothing" } as any,
        { category: "Accessories" } as any,
      ]);

      const res = await request(app)
        .get("/api/products/categories")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toContain("Clothing");
      expect(res.body).toContain("Accessories");
    });
  });
});
