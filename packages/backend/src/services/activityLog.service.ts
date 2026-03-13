import prisma from "../utils/prisma";

export async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  details?: string
) {
  return prisma.activityLog.create({
    data: { userId, action, entityType, entityId, details },
  });
}

export async function getActivityLogs(
  userId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 20, offset = 0 } = options;
  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.activityLog.count({ where: { userId } }),
  ]);
  return { logs, total };
}
