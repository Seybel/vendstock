import { useQuery } from "@tanstack/react-query";
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type {
  DashboardMetrics,
  Product,
  Order,
  ActivityLog,
  OrdersPerDay,
} from "@/types";

function statusColor(status: string) {
  switch (status) {
    case "PENDING": return "warning";
    case "CONFIRMED": return "default";
    case "SHIPPED": return "secondary";
    case "DELIVERED": return "success" as const;
    case "CANCELLED": return "destructive";
    default: return "outline";
  }
}

export function DashboardPage() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard", "metrics"],
    queryFn: () => api.get("/dashboard/metrics").then((r) => r.data),
  });

  const { data: lowStock } = useQuery<Product[]>({
    queryKey: ["dashboard", "low-stock"],
    queryFn: () => api.get("/dashboard/low-stock").then((r) => r.data),
  });

  const { data: ordersPerDay } = useQuery<OrdersPerDay[]>({
    queryKey: ["dashboard", "orders-per-day"],
    queryFn: () => api.get("/dashboard/orders-per-day").then((r) => r.data),
  });

  const { data: recentOrders } = useQuery<Order[]>({
    queryKey: ["dashboard", "recent-orders"],
    queryFn: () => api.get("/dashboard/recent-orders").then((r) => r.data),
  });

  const { data: recentActivity } = useQuery<ActivityLog[]>({
    queryKey: ["dashboard", "recent-activity"],
    queryFn: () => api.get("/dashboard/recent-activity").then((r) => r.data),
  });

  if (metricsLoading) return <PageLoader />;

  const metricCards = [
    {
      title: "Total Products",
      value: metrics?.totalProducts || 0,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Total Revenue",
      value: formatCurrency(metrics?.totalRevenue || 0),
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Total Orders",
      value: metrics?.totalOrders || 0,
      icon: ShoppingCart,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Low Stock Items",
      value: metrics?.lowStockCount || 0,
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "Inventory Value",
      value: formatCurrency(metrics?.totalInventoryValue || 0),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Pending Orders",
      value: metrics?.pendingOrders || 0,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your inventory and orders
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metricCards.map((metric) => (
          <Card key={metric.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${metric.bg}`}>
                  <metric.icon className={`w-4 h-4 ${metric.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">{metric.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {metric.title}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Orders Per Day Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders Per Day (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersPerDay || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    fontSize={11}
                    tickFormatter={(v) => v.slice(5)}
                    className="text-muted-foreground"
                  />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: "hsl(var(--card))",
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Orders"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Low Stock Products</CardTitle>
          </CardHeader>
          <CardContent>
            {!lowStock?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                All products are well-stocked
              </p>
            ) : (
              <div className="overflow-auto max-h-[280px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Threshold</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStock.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.sku}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              product.quantity === 0 ? "destructive" : "warning"
                            }
                          >
                            {product.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {product.lowStockThreshold}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {!recentOrders?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No orders yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.customerName} &middot;{" "}
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColor(order.status) as any}>
                        {order.status}
                      </Badge>
                      <span className="text-sm font-semibold">
                        {formatCurrency(Number(order.totalAmount))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!recentActivity?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent activity
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-2"
                  >
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{log.details || log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
