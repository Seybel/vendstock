import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@/types";

const productSchema = z.object({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().positive("Price must be positive"),
  costPrice: z.coerce.number().positive("Cost price must be positive").optional().or(z.literal("")),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const { toast } = useToast();
  const isEdit = !!product;

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          sku: product.sku,
          name: product.name,
          description: product.description || "",
          category: product.category,
          price: Number(product.price),
          costPrice: product.costPrice ? Number(product.costPrice) : undefined,
          quantity: product.quantity,
          lowStockThreshold: product.lowStockThreshold,
        }
      : {
          quantity: 0,
          lowStockThreshold: 10,
        },
  });

  const generateSkuMutation = useMutation({
    mutationFn: () => api.get<{ sku: string }>("/products/generate-sku"),
    onSuccess: ({ data }) => {
      setValue("sku", data.sku, { shouldDirty: true, shouldValidate: true });
      clearErrors("sku");
    },
    onError: () => {
      toast({
        title: "Could not generate SKU",
        description: "Please try again or enter one manually.",
        variant: "destructive",
      });
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ProductFormData) => {
      const payload = {
        ...data,
        costPrice: data.costPrice === "" ? undefined : data.costPrice || undefined,
      };
      return isEdit
        ? api.put(`/products/${product!.id}`, payload)
        : api.post("/products", payload);
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Product updated" : "Product created" });
      onSuccess();
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description:
          err.response?.data?.error ||
          err.response?.data?.details?.[0]?.message ||
          "Something went wrong",
        variant: "destructive",
      });
    },
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sku">SKU</Label>
          <div className="relative">
            <Input
              id="sku"
              placeholder="e.g. IG-TEE-001"
              className={!isEdit ? "pr-10" : undefined}
              {...register("sku")}
            />
            {!isEdit && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                disabled={generateSkuMutation.isPending}
                onClick={() => generateSkuMutation.mutate()}
                title="Auto-generate SKU"
                aria-label="Auto-generate SKU"
              >
                {generateSkuMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" placeholder="e.g. Clothing" {...register("category")} />
          {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Product Name</Label>
        <Input id="name" placeholder="Product name" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" placeholder="Optional description" {...register("description")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Selling Price ($)</Label>
          <Input id="price" type="number" step="0.01" placeholder="0.00" {...register("price")} />
          {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="costPrice">Cost Price ($)</Label>
          <Input id="costPrice" type="number" step="0.01" placeholder="Optional" {...register("costPrice")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input id="quantity" type="number" {...register("quantity")} />
          {errors.quantity && <p className="text-sm text-destructive">{errors.quantity.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
          <Input id="lowStockThreshold" type="number" {...register("lowStockThreshold")} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : isEdit ? "Update Product" : "Create Product"}
        </Button>
      </div>
    </form>
  );
}
