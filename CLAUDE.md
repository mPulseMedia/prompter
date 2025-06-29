# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development System Overview

This is a Meta development system designed for Cursor.ai that builds web applications through sequential prompts and browser-based editing interfaces. The system enforces naming conventions, provides real-time sync between text and HTML files, and maintains a comprehensive index of all codenames (functions, files, CSS classes).

## Key Architecture

### Core Structure
- **meta/**: System support files (rules, code, configuration, browser sync)
- **app/**: Generated application code (starts empty, populated by prompt execution)
- **prompt/**: Master prompt files containing numbered requirements (located at project root)

### Meta Subsystem Components
- **meta/code/sync/**: Browser sync server and utilities
  - `sync_server.js`: Main HTTP server (port 3002) with file watchers and real-time HTML generation
  - `html_extract.js`: HTML processing utilities  
  - `meta.sh`: Shell script to start the environment
- **meta/code/layout/**: Browser UI templates and client-side JavaScript
- **meta/src/**: Source text files (tool/, prompt/ subdirectories)
- **meta/html/**: Auto-generated HTML files (DO NOT EDIT DIRECTLY)
- **meta/rule/**: Formatting and style rules for different components
- **meta/data/**: Timestamp tracking and other data files

## Common Development Commands

### Starting the Meta Environment
```bash
# From meta/code/sync/ directory
node sync_server.js

# Or using the shell script
./meta/code/sync/meta.sh
```

### Server Details
- Runs on port 3002
- Auto-opens browser to http://localhost:3002/tool/index.html
- Provides real-time sync between .txt files and browser interface
- Automatically discovers and watches all files in meta/ directory

### Stopping the Server
```bash
lsof -ti:3002 | xargs kill -9
```

## Development Workflow

### File Organization Principles
1. **Rules First**: Always read files in meta/rule/ before coding
2. **Prompt-Driven**: Execute numbered sections in prompt files sequentially  
3. **Index Maintenance**: All new codenames must be added to appropriate index files
4. **Browser Sync**: Use browser interface for editing text files when server is running

### Important File Paths
- `meta/meta_remind.txt`: Critical reminders that should be re-read frequently
- `meta/src/tool/index.txt`: Master codename index
- `meta/src/tool/function.txt`: Function hierarchy
- `meta/src/prompt/01_start.txt`: Primary prompt file with current requirements

### Codename System
- All identifiers follow snake_case convention
- Functions, CSS classes, files, and folders are tracked in real-time index
- Unique codenames can be edited through browser interface and sync back to source files
- Comment codenames use `__codename` format

## File Sync Behavior

### Real-time Generation
- .txt files in meta/src/ automatically generate corresponding HTML in meta/html/
- Server detects outline format vs index format and applies appropriate templates
- File watchers trigger immediate regeneration on changes
- Index files show live aggregation of all project codenames

### Edit Synchronization  
- Browser edits to unique codenames sync back to original .txt files
- Index files are read-only except for valid codename edits
- Preserves indentation and outline numbering when syncing changes

## Browser Interface

### Navigation
- Index viewer: Lists all codenames with type indicators (>, #, /, () for CSS, comments, folders, functions)
- Function viewer: Shows function hierarchy and relationships
- Web viewer: Displays web relationships  
- Prompt viewer: Browser-editable prompt files

### UI Features
- Collapsible outline sections (top-level collapsed by default)
- Gray highlighting for duplicate/reference items
- Real-time filtering and search capabilities
- Timestamp tracking for all entries

## Development Rules

Based on .cursor/rules and meta/meta_remind.txt:
- Use outline format (1.a.1.a) for chat responses and thought processes
- Re-read meta/rule/ folder periodically to understand current conventions
- Insert thought bubbles into meta/meta_note.txt when available
- Follow established codenames from the project whenever possible