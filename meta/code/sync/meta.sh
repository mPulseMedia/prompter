#!/bin/bash

# NOTE: This shell script is OPTIONAL. You can use the "meta" command in Cursor AI chat instead.
# However, this script is useful if you want to:
# - Run the server directly from terminal without opening Cursor
# - Create a shell alias for quick access
# - Automate the startup process in scripts
#
# To use this script directly:
# 1. Make it executable: chmod +x meta.sh
# 2. Run it: ./meta/meta.sh
# 3. Or create an alias: alias meta='/path/to/meta.sh'

# Meta command - Start server and open interactive webpages
# Usage: ./meta.sh or alias meta='./meta.sh'

echo "🚀 Starting Meta environment..."

# Kill any existing node processes on port 3002
lsof -ti:3002 | xargs kill -9 2>/dev/null

# Start the sync server in the background
echo "📦 Starting sync server on port 3002..."
cd "$(dirname "$0")"
node sync_server.js &

# Give the server time to start
sleep 2

# Open browser windows
echo "🌐 Opening browser windows..."

# Define URLs to open
urls=(
    "tool/index.html"      # Codename index viewer
    "tool/web.html"        # Web relationship viewer
    "tool/function.html"   # Function hierarchy viewer
)

# Open first file from prompt folder if it exists
if [ -f ../html/prompt/01_start.html ]; then
    urls+=("prompt/01_start.html")
fi

# Open each URL
for url in "${urls[@]}"; do
    open "http://localhost:3002/$url"
    # Small delay between windows to prevent browser overwhelm
    sleep 0.5
done

echo "✅ Meta environment is running!"
echo ""
echo "The sync server is running in the background."
echo "To stop it, run: lsof -ti:3002 | xargs kill -9"
echo ""
echo "Browser windows opened:"
for url in "${urls[@]}"; do
    echo "  - http://localhost:3002/$url"
done 