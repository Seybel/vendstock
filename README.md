# VendStock

Inventory and order management system for Instagram vendors. Manage products, track stock levels, create orders, and monitor business metrics through a clean, responsive web interface.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui, React Query, React Router, Recharts, React Hook Form + Zod |
| Backend | Node.js, Express, TypeScript, SQLite, Prisma ORM, JWT, bcrypt, Zod |
| Infrastructure | Docker, Docker Compose, Nginx |
| Testing | Vitest, Supertest, React Testing Library |

## Quick Start (Docker)

> **Requirements:** Docker Desktop (or Docker Engine + Docker Compose v2)

```bash
git clone <repo-url>
cd vendstock
docker compose up --build
```

| Service | URL |
|---|---|
| App (frontend) | http://localhost:3001 |
| Backend API | http://localhost:3001/api |
| Backend (direct) | http://localhost:4001/api |

**Demo credentials:** `demo@vendstock.com` / `password123`

The backend automatically runs database migrations and seeds demo data on first startup. Subsequent restarts are idempotent (seed data is not duplicated).

## Local Development

### Prerequisites

- Node.js 20+
- npm 9+

### Setup

```bash
# Install all workspace dependencies (also generates Prisma client)
npm install

# Start both dev servers in separate terminals:
npm run dev:backend   # http://localhost:4000
npm run dev:frontend  # http://localhost:5173
```

The backend uses a local SQLite file (`packages/backend/prisma/dev.db`). Run migrations and seed data on first run:

```bash
cd packages/backend
npx prisma migrate deploy
npx tsx prisma/seed.ts
cd ../..
```

### Environment Variables

The backend reads from `packages/backend/.env`. Defaults work out of the box for local development:

```
DATABASE_URL=file:./dev.db
JWT_SECRET=vendstock-super-secret-jwt-key-change-in-production
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

In Docker, these are set directly in `docker-compose.yml`. **Change `JWT_SECRET` before deploying to production.**

## Project Structure

```
packages/
  backend/
    prisma/
      schema.prisma         Database schema
      migrations/           Prisma migration files
      seed.ts               Demo data seed script
    src/
      middleware/
        auth.ts             JWT token generation & authentication middleware
        errorHandler.ts     Global error handler
        validate.ts         Zod request body validation middleware
      routes/
        auth.routes.ts      POST /register, POST /login, GET /me
        product.routes.ts   CRUD for products + SKU generation + categories
        order.routes.ts     Order creation, listing, detail, status update
        dashboard.routes.ts Metrics, low-stock, orders chart, recent data
        activity.routes.ts  Paginated activity log
      services/
        auth.service.ts     Register, login, profile
        product.service.ts  Product CRUD, filtering, pagination
        order.service.ts    Transactional order creation & stock management
        dashboard.service.ts Metrics aggregation
        activityLog.service.ts Activity write & read
      utils/
        prisma.ts           Prisma singleton client
        errors.ts           AppError, NotFoundError, BadRequestError, etc.
        asyncHandler.ts     Wraps async route handlers to forward errors
      types/
        express.d.ts        Extends Express Request with `user` property
      __tests__/
        setup.ts            Prisma mock setup
        auth.test.ts
        product.test.ts
        order.test.ts
        dashboard.test.ts
        activity.test.ts
    Dockerfile
  frontend/
    src/
      components/
        ui/                 Shadcn/ui atomic components
        layout/
          AppLayout.tsx     Protected shell with sidebar + mobile nav
          Sidebar.tsx       Desktop navigation
          MobileNav.tsx     Bottom mobile navigation
          MobileHeader.tsx  Mobile top bar
        shared/
          LoadingSpinner.tsx
          EmptyState.tsx
      features/
        auth/
          LoginPage.tsx
          RegisterPage.tsx
        dashboard/
          DashboardPage.tsx Metric cards, chart, low-stock, recent orders, activity
        products/
          ProductsPage.tsx  Table with search, filter, pagination, CRUD dialogs
          ProductForm.tsx   Create / edit form with auto-SKU generation
        orders/
          OrdersPage.tsx    Table with search, filter, inline status update
          OrderForm.tsx     New order form with product picker
          OrderDetail.tsx   Order summary modal
          ActivityPage.tsx  Timeline of activity logs
      hooks/
        useAuth.tsx         Auth context: login, register, logout, token refresh
        use-toast.ts        Toast notification hook
      lib/
        api.ts              Axios instance with auth interceptor & 401 redirect
        utils.ts            cn(), formatCurrency(), formatDate(), formatDateTime()
      types/
        index.ts            TypeScript interfaces for all API shapes
      __tests__/
        setup.ts
        App.test.tsx
        LoginPage.test.tsx
        RegisterPage.test.tsx
        ProductForm.test.tsx
        OrderDetail.test.tsx
    nginx.conf              Nginx reverse proxy config for Docker
    Dockerfile
docker-compose.yml
```

## API Reference

All endpoints except `/api/auth/*` and `/api/health` require:
```
Authorization: Bearer <jwt_token>
```

### Auth

| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Create account. Body: `{ email, password, name }` |
| POST | /api/auth/login | Login. Body: `{ email, password }` |
| GET | /api/auth/me | Current user profile |
| GET | /api/health | Health check |

### Products

| Method | Path | Description |
|---|---|---|
| GET | /api/products | List products. Query: `search`, `category`, `lowStock`, `isActive`, `sortBy`, `sortOrder`, `limit`, `offset` |
| POST | /api/products | Create product |
| GET | /api/products/categories | List distinct categories |
| GET | /api/products/generate-sku | Generate a unique SKU suggestion |
| GET | /api/products/:id | Get product by ID |
| PUT | /api/products/:id | Update product |
| DELETE | /api/products/:id | Delete (hard delete if no orders, soft deactivate otherwise) |

### Orders

| Method | Path | Description |
|---|---|---|
| GET | /api/orders | List orders. Query: `search`, `status`, `sortBy`, `sortOrder`, `limit`, `offset` |
| POST | /api/orders | Create order with items. Deducts stock atomically |
| GET | /api/orders/:id | Get order with items |
| PATCH | /api/orders/:id/status | Update status. Restores stock when CANCELLED |

Valid statuses: `PENDING` → `CONFIRMED` → `SHIPPED` → `DELIVERED` or `CANCELLED`

### Dashboard

| Method | Path | Description |
|---|---|---|
| GET | /api/dashboard/metrics | Aggregate metrics (totals, revenue, low-stock count, pending orders) |
| GET | /api/dashboard/low-stock | Products where quantity ≤ lowStockThreshold |
| GET | /api/dashboard/orders-per-day | Order counts for last N days (default: 30) |
| GET | /api/dashboard/recent-orders | Latest 5 orders |
| GET | /api/dashboard/recent-activity | Latest 10 activity log entries |

### Activity

| Method | Path | Description |
|---|---|---|
| GET | /api/activity | Paginated activity log. Query: `limit`, `offset` |

## Running Tests

```bash
# All tests (backend + frontend)
npm test

# Backend only (36 tests across 5 files)
npm run test:backend

# Frontend only (24 tests across 5 files)
npm run test:frontend
```

### Test Strategy

**Backend tests** use Vitest + Supertest. The Prisma client is mocked via `vi.mock`, so tests run without a real database. Every route is covered for:
- Happy path (correct response shape and status)
- Authentication enforcement (401 without token)
- Validation rejection (400 for bad input)
- Not-found handling (404 for unknown IDs)

**Frontend tests** use Vitest + React Testing Library. The Axios API module is mocked so no real HTTP calls are made. Tests cover:
- Form rendering and field presence
- Client-side validation error messages
- Component interaction (cancel button, edit mode pre-fill)
- Routing guards (unauthenticated redirect to login)

## TypeScript

```bash
# Check both frontend and backend
npm run typecheck
```

Backend: strict mode, CommonJS, `@/*` path alias.
Frontend: strict mode, ESNext/bundler resolution, `@/*` path alias.

## Production Considerations

Before deploying:

1. **Change `JWT_SECRET`** in `docker-compose.yml` to a long random string.
2. **Restrict `CORS_ORIGIN`** to your actual frontend domain.
3. **SQLite persistence**: The `sqlitedata` Docker volume persists the database across container restarts. For high-availability, migrate to PostgreSQL (update `schema.prisma` provider to `postgresql`).
4. **HTTPS**: Put Nginx or a load balancer in front with TLS termination.

## Features

- Secure authentication — bcrypt password hashing (12 rounds), 24h JWT tokens
- Product CRUD — SKU uniqueness, category filtering, low-stock thresholds, auto-SKU generation
- Order management — atomic stock deduction on creation, stock restoration on cancellation, status workflow
- Dashboard — revenue, inventory value, low-stock alerts, orders-per-day chart, activity feed
- Activity log — all significant actions recorded with timestamps
- Full-text search on products and orders
- Pagination on all list endpoints
- Responsive UI — desktop sidebar, mobile bottom nav
- Zod validation on both frontend (forms) and backend (request bodies)
- Centralized error handling with consistent JSON error responses
