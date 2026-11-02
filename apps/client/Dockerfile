# --------------- BUILD STAGE ---------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/client/package.json ./apps/client/

RUN npm ci -w apps/client

COPY apps/client ./apps/client


ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build -w apps/client

# --------------- RUNTIME STAGE (caddy) ---------------
FROM caddy:2-alpine AS runtime

COPY infra/Caddyfile /etc/caddy/Caddyfile

# Built static files
COPY --from=build /app/apps/client/dist /srv

EXPOSE 80
