# Sync Server

This folder contains the core sync server that powers the Meta development system.

## Core Files

### `sync_server.js`
Main HTTP server that runs on port 3002. Provides:
- Real-time file watching and HTML generation
- WebSocket support for auto-reload functionality  
- REST API for file synchronization
- Static file serving for the browser interface

### `html_extract.js`
Utility functions for extracting content from HTML files back to text format. Used for bidirectional sync between browser edits and source files.

### `server_keepalive.sh`
Comprehensive server management script with multiple modes:
- `start` - Start the server
- `stop` - Stop the server  
- `restart` - Restart the server
- `status` - Check server status
- `keepalive` - Run daemon mode (auto-restart if crashes)
- `auto-restart` - Development mode (restart every minute)

## Package Dependencies

### `package.json`
Contains single dependency:
- `ws` - WebSocket library for real-time communication

## Usage

### Quick Start
```bash
# Start server with keepalive daemon
./server_keepalive.sh start

# Check status
./server_keepalive.sh status

# Stop server
./server_keepalive.sh stop
```

### Development Mode
```bash
# Auto-restart every minute for development
./server_keepalive.sh auto-restart
```

### Production Mode
```bash
# Run keepalive daemon (restarts if crashes)
./server_keepalive.sh keepalive
```

## Server Endpoints

- `http://localhost:3002/tool/index.html` - Main codename index
- `http://localhost:3002/tool/function.html` - Function hierarchy viewer
- `http://localhost:3002/tool/web.html` - Web relationships viewer  
- `http://localhost:3002/tool/tree.html` - Function tree viewer
- `http://localhost:3002/prompt/` - Prompt file browsers

## Architecture

The server watches all `.txt` files in the `meta/src/` directory and automatically generates corresponding HTML files in `meta/html/`. Changes made in the browser interface sync back to the original text files via WebSocket communication.