import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/types";

const orderSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerContact: z.string().optional(),
  notes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

interface OrderItem {
  productId: string;
  quantity: number;
  product: Product;
}

interface OrderFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function OrderForm({ onSuccess, onCancel }: OrderFormProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  const { data: productsData } = useQuery({
    queryKey: ["products", "for-order"],
    queryFn: () =>
      api
        .get("/products", { params: { limit: 100, isActive: "true" } })
        .then((r) => r.data as { products: Product[]; total: number }),
  });

  const products = productsData?.products || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: OrderFormData & { items: { productId: string; quantity: number }[] }) =>
      api.post("/orders", data),
    onSuccess: () => {
      toast({ title: "Order created successfully" });
      onSuccess();
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.response?.data?.error || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const addItem = () => {
    if (!selectedProductId) return;
    if (items.some((i) => i.productId === selectedProductId)) {
      toast({ title: "Product already added", variant: "destructive" });
      return;
    }
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;
    setItems([...items, { productId: product.id, quantity: 1, product }]);
    setSelectedProductId("");
  };

  const updateQuantity = (index: number, quantity: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index]!, quantity: Math.max(1, quantity) };
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0
  );

  const onSubmit = (data: OrderFormData) => {
    if (items.length === 0) {
      toast({ title: "Add at least one product", variant: "destructive" });
      return;
    }
    mutation.mutate({
      ...data,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customerName">Customer Name</Label>
        <Input id="customerName" placeholder="Customer name" {...register("customerName")} />
        {errors.customerName && (
          <p className="text-sm text-destructive">{errors.customerName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="customerContact">Contact (Instagram handle, phone, etc.)</Label>
        <Input id="customerContact" placeholder="@handle or phone" {...register("customerContact")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" placeholder="Optional order notes" {...register("notes")} />
      </div>

      {/* Product selection */}
      <div className="space-y-2">
        <Label>Products</Label>
        <div className="flex gap-2">
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {products
                .filter((p) => p.quantity > 0)
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.quantity} in stock) - {formatCurrency(Number(p.price))}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="icon" onClick={addItem}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Order items */}
      {items.length > 0 && (
        <div className="space-y-2 border rounded-md p-3">
          {items.map((item, index) => (
            <div key={item.productId} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(item.product.price))} each &middot; Max {item.product.quantity}
                </p>
              </div>
              <Input
                type="number"
                min={1}
                max={item.product.quantity}
                value={item.quantity}
                onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                className="w-20 h-8"
              />
              <span className="text-sm font-medium w-20 text-right">
                {formatCurrency(Number(item.product.price) * item.quantity)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 border-t mt-2">
            <span className="text-sm font-medium">Total</span>
            <span className="text-lg font-bold">{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending || items.length === 0}>
          {mutation.isPending ? "Creating..." : "Create Order"}
        </Button>
      </div>
    </form>
  );
}
