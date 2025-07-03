# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Problem-Solving Philosophy

**ALWAYS solve problems at their root cause, not with superficial workarounds**

When encountering issues like:
- Version numbers not updating
- Server not detecting changes
- UI not reflecting modifications
- File watchers not triggering

**DO NOT:**
- Manually edit data files (version.json, timestamps.json, etc.)
- Fake system behavior to appear correct
- Apply band-aid fixes that bypass the actual system
- Take shortcuts that will resurface the problem later

**INSTEAD:**
1. Understand WHY the system isn't working as expected
2. Trace the root cause through the codebase
3. Fix the actual mechanism that's broken
4. If the system design is flawed, improve the design
5. Test that your fix works through the proper channels

Example: If version numbers aren't incrementing, understand that versions only increment when files are edited through the browser interface (which triggers sync_txt_save). The solution is NOT to manually edit version.json, but to either:
- Use the browser interface for edits that should increment version
- Improve the system to detect direct file edits if that's the desired behavior
- Add a proper CLI command for version management if needed

## IMPORTANT: First Steps in New Chats

When starting a new chat session with this project:
1. **Check if sync server is running**: `lsof -i:3002`
2. **If not running, start it**: 
   ```bash
   cd /Users/pauldsmith/Desktop/dev/prompter-1/meta/code/sync
   ./restart_server.sh
   ```
3. **Set up auto-restart cron** (optional, for frequent file changes):
   ```bash
   # Add to crontab to restart every 30 seconds
   * * * * * cd /Users/pauldsmith/Desktop/dev/prompter-1/meta/code/sync && ./restart_server.sh > /dev/null 2>&1
   * * * * * sleep 30; cd /Users/pauldsmith/Desktop/dev/prompter-1/meta/code/sync && ./restart_server.sh > /dev/null 2>&1
   ```

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

# Or using the robust restart script (RECOMMENDED)
./restart_server.sh
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

## CRITICAL REMINDERS FOR CLAUDE

### When User Reports Changes Not Visible
1. **IMMEDIATELY restart the server** - Changes may not be picked up by file watchers
2. **Check if cron job is running** - The keepalive cron may have stopped
3. **Verify you're editing template files** - Never edit generated HTML files directly:
   - ✅ CORRECT: Edit files in `meta/code/layout/` (templates) and `meta/src/` (source)
   - ❌ WRONG: Edit files in `meta/html/` (these are auto-generated)

### Server Restart Commands
```bash
# Robust restart (RECOMMENDED)
cd /Users/pauldsmith/Desktop/dev/prompter-1/meta/code/sync
./restart_server.sh

# Manual restart (if needed)
lsof -ti:3002 | xargs kill -9
nohup node sync_server.js > server.log 2>&1 &
lsof -i:3002
```

### Auto-restart Server (Cron)
For frequent file changes, set up automatic restart via cron:

**IMPORTANT**: If user reports that changes aren't showing or outline clicks aren't working, use cron for auto-restart:

```bash
# Edit crontab
crontab -e

# Add these lines to restart every 30 seconds
* * * * * cd /Users/pauldsmith/Desktop/dev/prompter-1/meta/code/sync && ./restart_server.sh > /dev/null 2>&1
* * * * * sleep 30; cd /Users/pauldsmith/Desktop/dev/prompter-1/meta/code/sync && ./restart_server.sh > /dev/null 2>&1

# Check if cron is running
crontab -l

# Remove cron restarts
crontab -e  # then delete the lines
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

## Safe File Renaming

### CRITICAL: Always Use Safe Rename Tools

When renaming files or functions, NEVER rename manually as it breaks dependencies. Always use:

```bash
# Analyze what would be changed (safe to run)
cd /Users/pauldsmith/Desktop/dev/prompter-1/meta/code/sync
node safe_rename.js old_file.js new_file.js

# Actually perform the rename and update all references
node safe_rename.js old_file.js new_file.js --execute
```

The safe rename tool:
1. **Scans all files** for require() statements and script src references
2. **Shows exactly what will be updated** before making changes  
3. **Renames the file and updates all references** atomically
4. **Prevents broken dependencies** that cause page loading failures

### Dependency Mapping

To understand file relationships:
```bash
node -e "console.log(require('./dependency_mapper').dependency_scan())"
```

## Development Rules

Based on .cursor/rules and meta/meta_remind.txt:
- Use outline format (1.a.1.a) for chat responses and thought processes
- Re-read meta/rule/ folder periodically to understand current conventions
- Insert thought bubbles into meta/meta_note.txt when available
- Follow established codenames from the project whenever possible
- **ALWAYS use safe_rename.js for file/function renaming**

## Known Issues and Solutions

### Outline Click Not Working on Prompt Page
- The Prompt page should have clickable outline numbers (1., a., etc.)
- Single click: Toggle immediate children
- Double click: Toggle all descendants  
- Collapsed items show ">" instead of "."
- If not working:
  1. Restart server with keepalive script
  2. Check browser console for JavaScript errors
  3. Verify outline_client.js is loaded
  4. Enable debug mode to see click events