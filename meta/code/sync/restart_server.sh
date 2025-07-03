#!/bin/bash

# Robust server restart script
echo "Stopping existing server..."
lsof -ti:3002 | xargs kill -9 2>/dev/null

# Wait for port to be free
sleep 2

# Change to correct directory
cd /Users/pauldsmith/Desktop/dev/prompter-1/meta/code/sync

# Check if sync_server.js exists
if [ ! -f "sync_server.js" ]; then
    echo "ERROR: sync_server.js not found!"
    exit 1
fi

# Test if the server can start (syntax check)
echo "Testing server syntax..."
node -c sync_server.js
if [ $? -ne 0 ]; then
    echo "ERROR: Server has syntax errors!"
    exit 1
fi

# Start server in background
echo "Starting server..."
nohup node sync_server.js > server.log 2>&1 &

# Wait for startup
sleep 3

# Verify server is running
if lsof -i:3002 > /dev/null 2>&1; then
    echo "✅ Server successfully started on port 3002"
    echo "📊 Server PID: $(lsof -ti:3002)"
else
    echo "❌ Server failed to start!"
    echo "📝 Check server.log for errors:"
    tail -10 server.log
    exit 1
fi