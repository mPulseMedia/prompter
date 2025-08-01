#!/bin/bash

# Auto-restart server script for meta3 dashboard
# This script will automatically restart the server when it exits

echo "🚀 Starting auto-restart server wrapper..."

while true; do
    echo "📦 Starting server..."
    node server.js
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ Server exited cleanly (probably for restart), restarting in 1 second..."
        sleep 1
    else
        echo "❌ Server crashed with exit code $EXIT_CODE, restarting in 3 seconds..."
        sleep 3
    fi
done