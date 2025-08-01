// Test progress reporter that intercepts console logs and sends to server
const http = require('http');

function createProgressReporter(testName) {
    const originalConsoleLog = console.log;
    
    return {
        startCapture: () => {
            // Override console.log to capture test progress
            console.log = function(...args) {
                // Call original console.log
                originalConsoleLog.apply(console, args);
                
                // Extract action from log if it matches pattern
                const logStr = args.join(' ');
                
                // Skip certain logs that aren't meaningful actions
                if (logStr.includes('test_mouse_cursor') || 
                    logStr.includes('test_marker') ||
                    logStr.includes('localStorage') ||
                    logStr.includes('test_setup')) {
                    return;
                }
                
                // Extract meaningful actions from console logs
                const actionPatterns = [
                    { pattern: /circle_hover_action:\s*(.+)/, format: (m) => m[1] },
                    { pattern: /circle_click_action:\s*(.+)/, format: (m) => m[1] },
                    { pattern: /page_reload_action:\s*(.+)/, format: (m) => m[1] },
                    { pattern: /double_click_action:\s*(.+)/, format: (m) => m[1] },
                    { pattern: /test_panel_action:\s*(.+)/, format: (m) => m[1] },
                    { pattern: /reset_action:\s*(.+)/, format: (m) => m[1] },
                    { pattern: /color_change_action:\s*(.+)/, format: (m) => m[1] },
                    { pattern: /waiting for (.+)/, format: (m) => `waiting for ${m[1]}` },
                    { pattern: /found (.+)/, format: (m) => `found ${m[1]}` },
                    { pattern: /clicking (.+)/, format: (m) => `clicking ${m[1]}` },
                    { pattern: /hovering over (.+)/, format: (m) => `hovering over ${m[1]}` },
                    { pattern: /Circle hover: (.+)/, format: (m) => `hover ${m[1]}` },
                    { pattern: /Circle clicked: (.+)/, format: (m) => `clicked, now ${m[1]}` },
                    { pattern: /Reset: (.+)/, format: (m) => m[1] },
                    { pattern: /Double-click detected/, format: () => 'double-click detected' },
                    { pattern: /Auto-reload (.+)/, format: (m) => `auto-reload ${m[1]}` },
                    { pattern: /Auto-test (.+)/, format: (m) => `auto-test ${m[1]}` },
                    { pattern: /Manual reload triggered/, format: () => 'manual reload triggered' },
                    { pattern: /_run$/, format: () => 'starting test' },
                    { pattern: /_initial_(.+)/, format: (m) => `initial ${m[1].replace(/_/g, ' ')}` },
                    { pattern: /_after_(.+)/, format: (m) => `after ${m[1].replace(/_/g, ' ')}` }
                ];
                
                for (const { pattern, format } of actionPatterns) {
                    const match = logStr.match(pattern);
                    if (match) {
                        const action = format(match);
                        sendProgress(testName, action);
                        break;
                    }
                }
            };
        },
        
        stopCapture: () => {
            // Restore original console.log
            console.log = originalConsoleLog;
        }
    };
}

function sendProgress(testName, action) {
    const data = JSON.stringify({ testName, action });
    
    const options = {
        hostname: 'localhost',
        port: 3003,
        path: '/api/test/progress',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };
    
    const req = http.request(options, (res) => {
        // Ignore response
    });
    
    req.on('error', (error) => {
        // Ignore errors to not disrupt tests
    });
    
    req.write(data);
    req.end();
}

module.exports = { createProgressReporter };