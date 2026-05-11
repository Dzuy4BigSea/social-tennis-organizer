# Build the React bundle
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Serve the static bundle with nginx. The Supabase migration is done;
# the legacy PHP backend (tennis-save.php) is gone, so we no longer
# need PHP at runtime.
FROM nginx:1.27-alpine
RUN mkdir -p /usr/share/nginx/html/feedin
COPY --from=builder /app/dist/ /usr/share/nginx/html/feedin/
COPY nginx/feedin.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
# Use 127.0.0.1 explicitly; nginx listens on 0.0.0.0:80 (IPv4 only),
# but busybox wget resolves `localhost` to ::1 first inside the
# container and the IPv6 attempt is refused before it tries IPv4.
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -q --spider http://127.0.0.1/feedin/ || exit 1
