FROM node:20-alpine AS builder

WORKDIR /app

# Prisma's migration engine requires openssl on Alpine
RUN apk add --no-cache openssl

# Copy root package files
COPY package.json ./
COPY packages/backend/package.json ./packages/backend/

# Install dependencies (--ignore-scripts skips postinstall which needs the schema)
RUN npm install --workspace=packages/backend --include-workspace-root --ignore-scripts

# Copy backend source and prisma schema
COPY packages/backend ./packages/backend

# Generate Prisma client (schema is now present)
RUN npx --workspace=packages/backend prisma generate

# Build TypeScript
RUN npm run build --workspace=packages/backend

# Production stage
FROM node:20-alpine

WORKDIR /app

# Prisma's migration engine requires openssl on Alpine
RUN apk add --no-cache openssl

COPY package.json ./
COPY packages/backend/package.json ./packages/backend/

# Install production dependencies (--ignore-scripts skips postinstall which needs the schema)
RUN npm install --workspace=packages/backend --include-workspace-root --ignore-scripts

# Copy built artifacts
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/prisma ./packages/backend/prisma

# Regenerate Prisma client in production stage to ensure correct binaries
RUN npx --workspace=packages/backend prisma generate

EXPOSE 4000

# Set working directory to backend package for correct Prisma schema resolution
WORKDIR /app/packages/backend

# Run migrations, seed, then start the server
CMD sh -c "npx prisma migrate deploy && npx tsx prisma/seed.ts && node dist/index.js"
