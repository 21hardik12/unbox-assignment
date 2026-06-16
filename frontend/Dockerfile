# syntax=docker/dockerfile:1
# =============================================================================
# Build the React app with Node, then serve the static bundle with nginx.
# nginx also reverse-proxies /api and /socket.io to the backend, so the browser
# talks to a single origin (no CORS, clean WebSocket upgrades).
# =============================================================================

# --- build stage -------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY src ./src
RUN npm run build

# --- runtime (nginx) ---------------------------------------------------------
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
