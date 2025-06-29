#!/bin/bash

# Robust server keeper script - restarts server automatically
PROJECT_ROOT="/Users/pauldsmith/Desktop/dev/prompter-1"
SERVER_DIR="$PROJECT_ROOT/meta/code/sync"
LOG_FILE="$SERVER_DIR/server_keepalive.log"
PID_FILE="$SERVER_DIR/server.pid"

echo "$(date): Starting server keepalive script" >> "$LOG_FILE"

# Function to check if server is running
check_server() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            # Check if server responds to HTTP
            if curl -s http://localhost:3002/tool/index.html > /dev/null 2>&1; then
                return 0  # Server is running and responding
            fi
        fi
    fi
    return 1  # Server is not running or not responding
}

# Function to start server
start_server() {
    cd "$SERVER_DIR"
    echo "$(date): Starting server..." >> "$LOG_FILE"
    
    # Kill any existing processes on port 3002
    lsof -ti:3002 | xargs kill -9 2>/dev/null || true
    
    # Start server in background and save PID
    nohup node sync_server.js >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    # Wait a moment for server to start
    sleep 3
    
    # Verify server started
    if check_server; then
        echo "$(date): Server started successfully (PID: $(cat $PID_FILE))" >> "$LOG_FILE"
        echo "Server running at http://localhost:3002/tool/index.html"
    else
        echo "$(date): Failed to start server" >> "$LOG_FILE"
        exit 1
    fi
}

# Function to stop server
stop_server() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p $pid > /dev/null 2>&1; then
            echo "$(date): Stopping server (PID: $pid)" >> "$LOG_FILE"
            kill $pid 2>/dev/null
            rm -f "$PID_FILE"
        fi
    fi
    
    # Ensure port is free
    lsof -ti:3002 | xargs kill -9 2>/dev/null || true
}

# Handle script arguments
case "$1" in
    "start")
        if check_server; then
            echo "Server already running at http://localhost:3002/tool/index.html"
        else
            start_server
        fi
        ;;
    "stop")
        stop_server
        echo "Server stopped"
        ;;
    "restart")
        stop_server
        sleep 2
        start_server
        ;;
    "status")
        if check_server; then
            echo "Server is running at http://localhost:3002/tool/index.html"
        else
            echo "Server is not running"
        fi
        ;;
    "keepalive")
        # Run infinite loop to keep server alive
        while true; do
            if ! check_server; then
                echo "$(date): Server down, restarting..." >> "$LOG_FILE"
                start_server
            fi
            sleep 15  # Check every 15 seconds
        done
        ;;
    "auto-restart")
        # Auto-restart server every minute for development
        echo "$(date): Starting auto-restart mode (restart every minute)" >> "$LOG_FILE"
        while true; do
            echo "$(date): Auto-restarting server..." >> "$LOG_FILE"
            stop_server
            sleep 2
            start_server
            sleep 60  # Wait 60 seconds before next restart
        done
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|keepalive|auto-restart}"
        echo "  start        - Start the server"
        echo "  stop         - Stop the server"
        echo "  restart      - Restart the server"
        echo "  status       - Check server status"
        echo "  keepalive    - Run keepalive daemon (restarts server if it crashes)"
        echo "  auto-restart - Auto-restart server every minute (for development)"
        exit 1
        ;;
esac