#!/bin/bash

# Start server with auto-restart capability
while true; do
    echo "Starting Meta3 Dashboard server..."
    node server.js
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "Server exited cleanly (restart requested)"
    else
        echo "Server crashed with exit code $EXIT_CODE"
    fi
    
    echo "Restarting in 2 seconds..."
    sleep 2
done