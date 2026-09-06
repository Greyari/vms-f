# syntax=docker/dockerfile:1
# INIT-ASL frontend image — static SPA served by nginx, /api proxied to the
# app's backend container via the API_UPSTREAM env (envsubst template).

FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
ENV API_UPSTREAM=http://localhost:8080
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
