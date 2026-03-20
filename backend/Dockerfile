# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy source and config
COPY . .

# Generate Prisma client (reads prisma.config.ts → prisma/schema.prisma)
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build

# ── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# Copy runtime artifacts from builder
COPY --from=builder /app/dist          ./dist
COPY --from=builder /app/node_modules  ./node_modules
COPY --from=builder /app/prisma        ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/package.json  ./package.json

EXPOSE 4000

# Run DB migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
