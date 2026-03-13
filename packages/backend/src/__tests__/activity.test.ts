import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../utils/prisma";
import { generateToken } from "../middleware/auth";

const mockPrisma = vi.mocked(prisma);

describe("Activity Routes", () => {
  const token = generateToken({ id: "user-1", email: "test@test.com", name: "Test" });
  const authHeader = `Bearer ${token}`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/activity", () => {
    it("should return paginated activity logs", async () => {
      const mockLogs = [
        {
          id: "log-1",
          action: "CREATED_PRODUCT",
          entityType: "PRODUCT",
          entityId: "prod-1",
          details: "Created product: Test Item",
          createdAt: new Date(),
          userId: "user-1",
        },
        {
          id: "log-2",
          action: "LOGGED_IN",
          entityType: "USER",
          entityId: "user-1",
          details: "User logged in",
          createdAt: new Date(),
          userId: "user-1",
        },
      ];
      mockPrisma.activityLog.findMany.mockResolvedValue(mockLogs as any);
      mockPrisma.activityLog.count.mockResolvedValue(2);

      const res = await request(app)
        .get("/api/activity")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("logs");
      expect(res.body).toHaveProperty("total");
      expect(res.body.logs).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it("should respect limit and offset query params", async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue([]);
      mockPrisma.activityLog.count.mockResolvedValue(100);

      const res = await request(app)
        .get("/api/activity?limit=10&offset=20")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(100);
    });

    it("should require authentication", async () => {
      const res = await request(app).get("/api/activity");
      expect(res.status).toBe(401);
    });
  });
});
