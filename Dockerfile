# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies for TypeScript build)
RUN npm install

# Copy application source code
COPY src ./src

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package manifests
COPY package*.json ./

# Install production-only dependencies
RUN npm install --only=production

# Copy compiled assets from builder
COPY --from=builder /app/dist ./dist

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application server and background worker
CMD ["node", "dist/server.js"]
