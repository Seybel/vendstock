import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { Order } from "@/types";

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

interface OrderDetailProps {
  order: Order;
}

export function OrderDetail({ order }: OrderDetailProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <Badge variant={statusColor(order.status) as any} className="mt-1">
            {order.status}
          </Badge>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="text-sm font-medium">{formatDateTime(order.createdAt)}</p>
        </div>
      </div>

      <Separator />

      <div>
        <p className="text-sm text-muted-foreground">Customer</p>
        <p className="font-medium">{order.customerName}</p>
        {order.customerContact && (
          <p className="text-sm text-muted-foreground">{order.customerContact}</p>
        )}
      </div>

      {order.notes && (
        <div>
          <p className="text-sm text-muted-foreground">Notes</p>
          <p className="text-sm">{order.notes}</p>
        </div>
      )}

      <Separator />

      <div>
        <p className="text-sm font-medium mb-3">Items</p>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.product.sku} &times; {item.quantity}
                </p>
              </div>
              <p className="text-sm font-medium">
                {formatCurrency(Number(item.total))}
              </p>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex justify-between items-center">
        <p className="font-semibold">Total</p>
        <p className="text-xl font-bold">
          {formatCurrency(Number(order.totalAmount))}
        </p>
      </div>
    </div>
  );
}
