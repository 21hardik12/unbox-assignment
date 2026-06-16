# syntax=docker/dockerfile:1
# =============================================================================
# Multi-stage build for the backend.
#   build   - installs all deps and compiles TypeScript → dist/
#   deps    - installs production-only deps (smaller runtime node_modules)
#   runtime - copies compiled output + prod deps, runs as non-root
# =============================================================================

# --- build stage -------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- production dependencies -------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# --- runtime -----------------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Drop root privileges (the "node" user ships with the base image).
USER node

EXPOSE 3001

# Dependency-free health check using Node 22's global fetch.
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
