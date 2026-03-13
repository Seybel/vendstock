import { PrismaClient } from "@prisma/client";

type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create demo user
  const hashedPassword = await bcrypt.hash("password123", 12);
  const user = await prisma.user.upsert({
    where: { email: "demo@vendstock.com" },
    update: {},
    create: {
      email: "demo@vendstock.com",
      password: hashedPassword,
      name: "Demo Vendor",
    },
  });

  console.log(`Created user: ${user.email}`);

  // Create products
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: "IG-TEE-001" },
      update: {},
      create: {
        sku: "IG-TEE-001",
        name: "Classic Logo Tee",
        description: "Premium cotton t-shirt with embroidered logo",
        category: "Clothing",
        price: 29.99,
        costPrice: 12.00,
        quantity: 45,
        lowStockThreshold: 10,
        userId: user.id,
      },
    }),
    prisma.product.upsert({
      where: { sku: "IG-HOO-001" },
      update: {},
      create: {
        sku: "IG-HOO-001",
        name: "Vintage Hoodie",
        description: "Oversized vintage wash hoodie",
        category: "Clothing",
        price: 59.99,
        costPrice: 25.00,
        quantity: 8,
        lowStockThreshold: 10,
        userId: user.id,
      },
    }),
    prisma.product.upsert({
      where: { sku: "IG-CAP-001" },
      update: {},
      create: {
        sku: "IG-CAP-001",
        name: "Snapback Cap",
        description: "Adjustable snapback cap with flat brim",
        category: "Accessories",
        price: 24.99,
        costPrice: 8.00,
        quantity: 30,
        lowStockThreshold: 15,
        userId: user.id,
      },
    }),
    prisma.product.upsert({
      where: { sku: "IG-BAG-001" },
      update: {},
      create: {
        sku: "IG-BAG-001",
        name: "Canvas Tote Bag",
        description: "Eco-friendly canvas tote with printed design",
        category: "Accessories",
        price: 19.99,
        costPrice: 6.00,
        quantity: 5,
        lowStockThreshold: 10,
        userId: user.id,
      },
    }),
    prisma.product.upsert({
      where: { sku: "IG-MUG-001" },
      update: {},
      create: {
        sku: "IG-MUG-001",
        name: "Ceramic Coffee Mug",
        description: "11oz ceramic mug with custom design",
        category: "Home & Living",
        price: 14.99,
        costPrice: 4.50,
        quantity: 60,
        lowStockThreshold: 20,
        userId: user.id,
      },
    }),
    prisma.product.upsert({
      where: { sku: "IG-STK-001" },
      update: {},
      create: {
        sku: "IG-STK-001",
        name: "Sticker Pack (5 pcs)",
        description: "Vinyl waterproof sticker pack",
        category: "Stickers",
        price: 9.99,
        costPrice: 2.00,
        quantity: 100,
        lowStockThreshold: 25,
        userId: user.id,
      },
    }),
    prisma.product.upsert({
      where: { sku: "IG-PHN-001" },
      update: {},
      create: {
        sku: "IG-PHN-001",
        name: "Phone Case - Clear",
        description: "Slim clear phone case with custom print",
        category: "Accessories",
        price: 18.99,
        costPrice: 5.00,
        quantity: 3,
        lowStockThreshold: 10,
        userId: user.id,
      },
    }),
    prisma.product.upsert({
      where: { sku: "IG-POS-001" },
      update: {},
      create: {
        sku: "IG-POS-001",
        name: 'Art Print Poster (18x24")',
        description: "High-quality art print on premium paper",
        category: "Home & Living",
        price: 34.99,
        costPrice: 10.00,
        quantity: 20,
        lowStockThreshold: 5,
        userId: user.id,
      },
    }),
  ]);

  console.log(`Created ${products.length} products`);

  // Only create orders if none exist for this user (idempotent)
  const existingOrderCount = await prisma.order.count({ where: { userId: user.id } });
  if (existingOrderCount === 0) {
    const orders = [];
    const statuses: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED"];

    const customerNames = [
      "Sarah Johnson",
      "Mike Chen",
      "Emma Davis",
      "Carlos Rodriguez",
      "Priya Patel",
    ];

    for (let i = 0; i < 12; i++) {
      const daysAgo = Math.floor(Math.random() * 28);
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      const numItems = Math.floor(Math.random() * 3) + 1;
      const selectedProducts = products
        .sort(() => Math.random() - 0.5)
        .slice(0, numItems);

      const items = selectedProducts.map((p) => ({
        productId: p.id,
        quantity: Math.floor(Math.random() * 2) + 1,
        unitPrice: p.price,
        total: p.price.mul(Math.floor(Math.random() * 2) + 1),
      }));

      const totalAmount = items.reduce(
        (sum, item) => sum.add(item.total),
        new (await import("@prisma/client")).Prisma.Decimal(0)
      );

      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-SEED-${String(i + 1).padStart(4, "0")}`,
          customerName: customerNames[i % customerNames.length],
          customerContact: `@${customerNames[i % customerNames.length].toLowerCase().replace(" ", "_")}`,
          status: statuses[i % statuses.length],
          totalAmount,
          userId: user.id,
          createdAt: date,
          items: { create: items },
        },
      });

      orders.push(order);
    }

    console.log(`Created ${orders.length} orders`);
  } else {
    console.log(`Skipped orders (${existingOrderCount} already exist)`);
  }

  // Only create activity logs if none exist for this user (idempotent)
  const existingActivityCount = await prisma.activityLog.count({ where: { userId: user.id } });
  if (existingActivityCount === 0) {
    const activities = [
      { action: "REGISTERED", entityType: "USER", details: "Account created" },
      { action: "CREATED_PRODUCT", entityType: "PRODUCT", details: "Created product: Classic Logo Tee" },
      { action: "CREATED_PRODUCT", entityType: "PRODUCT", details: "Created product: Vintage Hoodie" },
      { action: "CREATED_ORDER", entityType: "ORDER", details: "Created order for Sarah Johnson" },
      { action: "UPDATED_PRODUCT", entityType: "PRODUCT", details: "Updated product: Canvas Tote Bag" },
      { action: "CREATED_ORDER", entityType: "ORDER", details: "Created order for Mike Chen" },
      { action: "UPDATED_ORDER_STATUS", entityType: "ORDER", details: "Updated order status to SHIPPED" },
      { action: "LOGGED_IN", entityType: "USER", details: "User logged in" },
    ];

    for (let i = 0; i < activities.length; i++) {
      const daysAgo = activities.length - i;
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      await prisma.activityLog.create({
        data: {
          ...activities[i],
          userId: user.id,
          createdAt: date,
        },
      });
    }

    console.log(`Created ${activities.length} activity logs`);
  } else {
    console.log(`Skipped activity logs (${existingActivityCount} already exist)`);
  }

  console.log("\nSeed completed successfully!");
  console.log("Login credentials: demo@vendstock.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
