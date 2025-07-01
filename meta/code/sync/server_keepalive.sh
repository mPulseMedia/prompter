#!/bin/bash

# Usage: ./server_keepalive.sh [interval_seconds] [duration_hours]
# Default: check every 30 seconds for 8 hours

INTERVAL=${1:-30}
DURATION_HOURS=${2:-8}
DURATION_SECONDS=$((DURATION_HOURS * 3600))
END_TIME=$(($(date +%s) + DURATION_SECONDS))

echo "Starting keepalive: checking every ${INTERVAL}s for ${DURATION_HOURS} hours"
echo "$(date): Keepalive started - interval: ${INTERVAL}s, duration: ${DURATION_HOURS}h" >> server_keepalive.log

while [ $(date +%s) -lt $END_TIME ]; do
    if ! lsof -i:3002 > /dev/null 2>&1; then
        cd /Users/pauldsmith/Desktop/dev/prompter-1/meta/code/sync
        nohup node sync_server.js > server.log 2>&1 &
        echo "$(date): Server restarted" >> server_keepalive.log
    fi
    sleep $INTERVAL
done

echo "$(date): Keepalive finished after ${DURATION_HOURS} hours" >> server_keepalive.log