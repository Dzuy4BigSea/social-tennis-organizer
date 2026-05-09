# Build the React bundle
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Serve the static bundle + the tennis-save.php endpoint via Apache + mod_php.
# Apache + mod_php is the simplest viable runtime for a single-PHP-file API.
FROM php:8.2-apache
RUN a2enmod headers rewrite

# Vite was built with base='/feedin/' so the assets reference /feedin/app.js.
# Serving everything from /var/www/html/feedin keeps those URLs valid whether
# the container is reached directly on port 80 or behind a reverse proxy.
RUN mkdir -p /var/www/html/feedin
COPY --from=builder /app/dist/ /var/www/html/feedin/

# tennis-data/ holds per-room JSON. Mount a volume here to persist tournaments
# across image updates.
RUN mkdir -p /var/www/html/feedin/tennis-data \
    && chown -R www-data:www-data /var/www/html/feedin

# Redirect the bare root to /feedin/ for convenience, and lock down
# tennis-data/ so the per-room JSON files can't be listed or fetched directly.
# (tennis-save.php is the only legitimate entry point to that directory.)
RUN printf 'RedirectMatch ^/$ /feedin/\n' > /etc/apache2/conf-enabled/feedin-root.conf \
 && printf '<Directory /var/www/html/feedin/tennis-data>\n  Options -Indexes\n  Require all denied\n</Directory>\n' \
        > /etc/apache2/conf-enabled/feedin-data-deny.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD php -r 'exit(@file_get_contents("http://localhost/feedin/") ? 0 : 1);'
