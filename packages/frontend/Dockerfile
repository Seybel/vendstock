FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json ./
COPY packages/frontend/package.json ./packages/frontend/

# Install dependencies (--ignore-scripts skips postinstall which needs backend schema)
RUN npm install --workspace=packages/frontend --include-workspace-root --ignore-scripts

# Copy frontend source
COPY packages/frontend ./packages/frontend

# Build with API URL as relative path (nginx proxies to backend)
ENV VITE_API_URL=/api
RUN npm run build --workspace=packages/frontend

# Production stage with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
