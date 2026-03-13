import prisma from "../utils/prisma";

export async function getDashboardMetrics(userId: string) {
  const [
    totalProducts,
    totalOrders,
    lowStockProducts,
    allProducts,
    allOrders,
  ] = await Promise.all([
    prisma.product.count({ where: { userId, isActive: true } }),
    prisma.order.count({ where: { userId } }),
    prisma.product.findMany({
      where: { userId, isActive: true },
      select: { id: true, quantity: true, lowStockThreshold: true },
    }),
    prisma.product.findMany({
      where: { userId, isActive: true },
      select: { quantity: true, price: true },
    }),
    prisma.order.findMany({
      where: { userId },
      select: { totalAmount: true, status: true },
    }),
  ]);

  const lowStockCount = lowStockProducts.filter(
    (p) => p.quantity <= p.lowStockThreshold
  ).length;

  const totalInventoryValue = allProducts.reduce(
    (sum, p) => sum + p.quantity * Number(p.price),
    0
  );

  const totalRevenue = allOrders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  const pendingOrders = allOrders.filter((o) => o.status === "PENDING").length;

  return {
    totalProducts,
    totalOrders,
    lowStockCount,
    totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    pendingOrders,
  };
}

export async function getLowStockProducts(userId: string) {
  const products = await prisma.product.findMany({
    where: { userId, isActive: true },
    orderBy: { quantity: "asc" },
  });
  return products.filter((p) => p.quantity <= p.lowStockThreshold);
}

export async function getOrdersPerDay(userId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const orders = await prisma.order.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const countByDay: Record<string, number> = {};

  // Initialize all days
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const key = date.toISOString().slice(0, 10);
    countByDay[key] = 0;
  }

  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    if (countByDay[key] !== undefined) {
      countByDay[key]++;
    }
  }

  return Object.entries(countByDay).map(([date, count]) => ({ date, count }));
}

export async function getRecentOrders(userId: string, limit = 5) {
  return prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      items: { include: { product: { select: { name: true, sku: true } } } },
    },
  });
}

export async function getRecentActivity(userId: string, limit = 10) {
  return prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
