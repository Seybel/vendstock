import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { RegisterPage } from "@/features/auth/RegisterPage";

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

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderRegister() {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <RegisterPage />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe("RegisterPage", () => {
  it("renders the registration form", () => {
    renderRegister();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    // Use exact role to avoid ambiguous matches with confirm password field
    expect(screen.getAllByLabelText(/password/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("has a link back to login", () => {
    renderRegister();
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it("shows validation error for empty name", async () => {
    renderRegister();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
  });

  it("shows validation error for empty email field", async () => {
    renderRegister();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/full name/i), "Test User");
    // Leave email empty, type something and clear it
    await user.click(screen.getByRole("button", { name: /create account/i }));
    // Zod validates on submit - empty string fails email validation
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
  });

  it("shows validation error for short password", async () => {
    renderRegister();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/full name/i), "Test User");
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    // Password field has id="password", use the specific id label
    await user.type(screen.getByLabelText("Password"), "abc");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText(/at least 6 characters/i)).toBeInTheDocument();
  });

  it("shows validation error when passwords don't match", async () => {
    renderRegister();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/full name/i), "Test User");
    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm Password"), "different123");
    await user.click(screen.getByRole("button", { name: /create account/i }));
    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument();
  });
});
