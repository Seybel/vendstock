import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../App";

// Mock the API module
vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn().mockRejectedValue(new Error("No token")),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

describe("App", () => {
  it("renders the login page when not authenticated", async () => {
    render(<App />);
    expect(
      await screen.findByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
  });

  it("renders the VendStock branding on login page", async () => {
    render(<App />);
    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument();
  });
});
