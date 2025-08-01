# CRITICAL REMINDER: Always Restart Server

## When to ALWAYS restart the server:
1. After ANY changes to server.js
2. After ANY changes to demo.html or client-side files
3. After fixing bugs or issues
4. When the user reports "page not loading" or "can't reach"
5. After making configuration changes

## How to restart:
```bash
lsof -ti:3003 | xargs kill -9 && node server.js
```

## DO NOT:
- Make changes and forget to restart
- Wait for the user to ask multiple times
- Assume changes will work without restart

## REMEMBER:
The user should NEVER have to ask for a restart. If you made changes that could affect the running system, RESTART IMMEDIATELY.