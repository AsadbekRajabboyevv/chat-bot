# syntax=docker/dockerfile:1.7
# Kontekst — repo ildizi (deploy/docker-compose.yml: context: ..)

# 1) Admin panel (Angular) — manbadan yig'iladi
FROM node:20-alpine AS panel
WORKDIR /src
COPY olima-frontend/package.json olima-frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY olima-frontend/ ./
RUN npx ng build --configuration production

# 2) nginx: panel + widget/landing
#    (demo portal alohida hostda: deploy/caddy/oliytalim.caddy)
FROM nginx:1.27-alpine
COPY deploy/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=panel /src/dist/olima-frontend/browser/ /usr/share/nginx/html/
COPY widget/ /usr/share/nginx/html/w/
