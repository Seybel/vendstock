import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../utils/prisma";
import bcrypt from "bcryptjs";

const mockPrisma = vi.mocked(prisma);

describe("Auth Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: "user-1",
        email: "test@test.com",
        name: "Test User",
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.activityLog.create.mockResolvedValue({} as any);

      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@test.com", password: "password123", name: "Test User" });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.email).toBe("test@test.com");
    });

    it("should reject duplicate email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@test.com",
        name: "Test",
        password: "hashed",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@test.com", password: "password123", name: "Test" });

      expect(res.status).toBe(409);
    });

    it("should validate required fields", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "bad-email" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const hashed = await bcrypt.hash("password123", 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "test@test.com",
        name: "Test User",
        password: hashed,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.activityLog.create.mockResolvedValue({} as any);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@test.com", password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.email).toBe("test@test.com");
    });

    it("should reject invalid credentials", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@test.com", password: "wrong" });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/health", () => {
    it("should return health status", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
    });
  });
});
