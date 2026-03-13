import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderDetail } from "@/features/orders/OrderDetail";
import type { Order } from "@/types";

const mockOrder: Order = {
  id: "order-1",
  orderNumber: "ORD-20240101-ABCDEF",
  status: "PENDING",
  customerName: "Jane Doe",
  customerContact: "@janedoe",
  notes: "Please handle with care",
  totalAmount: "59.98",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  items: [
    {
      id: "item-1",
      quantity: 2,
      unitPrice: "29.99",
      total: "59.98",
      productId: "prod-1",
      product: {
        name: "Classic Tee",
        sku: "IG-TEE-001",
      },
    },
  ],
};

describe("OrderDetail", () => {
  it("renders order status", () => {
    render(<OrderDetail order={mockOrder} />);
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  it("renders customer name", () => {
    render(<OrderDetail order={mockOrder} />);
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });

  it("renders customer contact", () => {
    render(<OrderDetail order={mockOrder} />);
    expect(screen.getByText("@janedoe")).toBeInTheDocument();
  });

  it("renders order notes", () => {
    render(<OrderDetail order={mockOrder} />);
    expect(screen.getByText("Please handle with care")).toBeInTheDocument();
  });

  it("renders order items", () => {
    render(<OrderDetail order={mockOrder} />);
    expect(screen.getByText("Classic Tee")).toBeInTheDocument();
    expect(screen.getByText(/IG-TEE-001/)).toBeInTheDocument();
  });

  it("renders total amount", () => {
    render(<OrderDetail order={mockOrder} />);
    // The total appears in both the items list and the footer total - use getAllByText
    const amounts = screen.getAllByText(/\$59\.98/);
    expect(amounts.length).toBeGreaterThan(0);
  });

  it("does not show contact section when customerContact is null", () => {
    const orderNoContact = { ...mockOrder, customerContact: null };
    render(<OrderDetail order={orderNoContact} />);
    expect(screen.queryByText("@janedoe")).not.toBeInTheDocument();
  });

  it("does not show notes section when notes is null", () => {
    const orderNoNotes = { ...mockOrder, notes: null };
    render(<OrderDetail order={orderNoNotes} />);
    expect(screen.queryByText("Please handle with care")).not.toBeInTheDocument();
  });
});
