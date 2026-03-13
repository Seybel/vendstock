import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProductForm } from "@/features/products/ProductForm";

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { sku: "SKU-ABCDE1" } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderForm(product = null, onSuccess = vi.fn(), onCancel = vi.fn()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ProductForm product={product} onSuccess={onSuccess} onCancel={onCancel} />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

describe("ProductForm", () => {
  it("renders all required fields for new product", () => {
    renderForm();
    expect(screen.getByLabelText("SKU")).toBeInTheDocument();
    expect(screen.getByLabelText("Category")).toBeInTheDocument();
    expect(screen.getByLabelText("Product Name")).toBeInTheDocument();
    expect(screen.getByLabelText(/selling price/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create product/i })).toBeInTheDocument();
  });

  it("shows cancel button that calls onCancel", async () => {
    const onCancel = vi.fn();
    renderForm(null, vi.fn(), onCancel);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("shows validation errors for empty required fields", async () => {
    renderForm();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /create product/i }));
    expect(await screen.findByText(/sku is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/category is required/i)).toBeInTheDocument();
  });

  it("shows auto-generate SKU button for new products", () => {
    renderForm();
    expect(screen.getByRole("button", { name: /auto-generate sku/i })).toBeInTheDocument();
  });

  it("renders in edit mode with existing product data", () => {
    const product = {
      id: "prod-1",
      sku: "TEST-001",
      name: "Existing Product",
      description: "A description",
      category: "Clothing",
      price: "29.99",
      costPrice: "10.00",
      quantity: 50,
      lowStockThreshold: 10,
      imageUrl: null,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    renderForm(product as any);
    expect(screen.getByDisplayValue("Existing Product")).toBeInTheDocument();
    expect(screen.getByDisplayValue("TEST-001")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update product/i })).toBeInTheDocument();
    // Should NOT show auto-generate SKU button when editing
    expect(screen.queryByRole("button", { name: /auto-generate sku/i })).not.toBeInTheDocument();
  });
});
