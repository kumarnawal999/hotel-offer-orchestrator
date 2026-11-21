# Stage 1: Build stage
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies for TypeScript & workflow bundle build)
RUN npm install

# Copy application source code
COPY src ./src

# Compile TypeScript and pre-bundle Temporal workflows
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package manifests
COPY package*.json ./

# Install production-only dependencies
RUN npm install --omit=dev

# Copy compiled JavaScript and pre-bundled workflow artifacts from builder
COPY --from=builder /app/dist ./dist

# Expose API port
EXPOSE 3000

# Built-in lightweight health check using node (zero external dependency)
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit([200, 503].includes(r.statusCode) ? 0 : 1)).on('error', () => process.exit(1))"

# Start the application server and background worker
CMD ["node", "dist/server.js"]
