export interface User {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  price: string | number;
  costPrice: string | number | null;
  quantity: number;
  lowStockThreshold: number;
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: string | number;
  total: string | number;
  productId: string;
  product: {
    name: string;
    sku: string;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerContact: string | null;
  notes: string | null;
  totalAmount: string | number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}

export interface DashboardMetrics {
  totalProducts: number;
  totalOrders: number;
  lowStockCount: number;
  totalInventoryValue: number;
  totalRevenue: number;
  pendingOrders: number;
}

export interface OrdersPerDay {
  date: string;
  count: number;
}

export interface PaginatedResponse<T> {
  total: number;
  [key: string]: T[] | number;
}
