# ==========================================
# Stage 1: Build Frontend Single Page App
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Unified Production Runtime
# ==========================================
FROM python:3.12-slim AS runner
WORKDIR /app

# Install Nginx and curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy Backend codebase
COPY backend/ ./backend/

# Copy built frontend assets into Nginx webroot
COPY --from=frontend-builder /app/frontend/dist /var/www/html

# Copy Nginx server configuration and entrypoint script
COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend

# Expose unified application port
EXPOSE 8000

# Health check against API endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:8000/api/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
