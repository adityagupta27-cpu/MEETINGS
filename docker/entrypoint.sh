#!/bin/bash
set -e

# Seed initial database if meetings.db does not exist yet
if [ ! -f /app/meetings.db ]; then
    echo "==> Initializing SQLite database with demo dataset..."
    PYTHONPATH=/app/backend python /app/backend/seed_demo_data.py || true
fi

# Start FastAPI Uvicorn backend on port 8001 (internal)
echo "==> Starting FastAPI backend on 127.0.0.1:8001..."
PYTHONPATH=/app/backend uvicorn app.main:app --host 127.0.0.1 --port 8001 &
BACKEND_PID=$!

# Wait briefly for backend to initialize
sleep 2

# Start Nginx in foreground on exposed port 8000
echo "==> Starting Nginx reverse proxy & frontend server on port 8000..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Graceful termination handler
cleanup() {
    echo "==> Stopping services gracefully..."
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
    kill -TERM "$NGINX_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    wait "$NGINX_PID" 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for either process to terminate
wait -n "$BACKEND_PID" "$NGINX_PID"
