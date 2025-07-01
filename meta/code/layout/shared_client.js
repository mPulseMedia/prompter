// Shared client-side functionality for all layout pages

// ============================================
// DEBUG MANAGER
// ============================================

// Debug configuration stored in localStorage
const DEBUG_CONFIG_KEY = 'meta_debug_config';
const DEBUG_GROUPS = {
    'all': 'All Debug Messages',
    'basic': 'Basic Operations',
    'ui': 'UI Interactions',
    'function': 'Function Calls',
    'sync': 'Server Sync',
    'filter': 'Filters & Search',
    'nav': 'Navigation',
    'outline': 'Outline Operations',
    'list': 'List Operations',
    'state': 'State Management',
    'perf': 'Performance'
};

// Load debug configuration from localStorage
let debug_config = {};
try {
    const saved = localStorage.getItem(DEBUG_CONFIG_KEY);
    debug_config = saved ? JSON.parse(saved) : {};
} catch (e) {
    debug_config = {};
}

// Initialize all groups to false if not set
Object.keys(DEBUG_GROUPS).forEach(group => {
    if (!(group in debug_config)) {
        debug_config[group] = false;
    }
});

// Save debug configuration
function debug_config_save() {
    localStorage.setItem(DEBUG_CONFIG_KEY, JSON.stringify(debug_config));
}

// Check if a debug group is enabled
function debug_is_enabled(group) {
    return debug_config.all || debug_config[group] || false;
}

// Enable/disable a debug group
function debug_group_set(group, enabled) {
    debug_config[group] = enabled;
    
    // If enabling 'all', enable all groups
    if (group === 'all' && enabled) {
        Object.keys(DEBUG_GROUPS).forEach(g => {
            debug_config[g] = true;
        });
    }
    // If disabling 'all', disable all groups
    else if (group === 'all' && !enabled) {
        Object.keys(DEBUG_GROUPS).forEach(g => {
            debug_config[g] = false;
        });
    }
    
    debug_config_save();
}

// Store recent debug messages for display
const debug_message_buffer = [];
const DEBUG_MAX_MESSAGES = 500;

// Main debug logging function
function debug_log(group, functionName, message, data = null) {
    if (!debug_is_enabled(group)) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] [${group.toUpperCase()}] ${functionName}:`;
    
    // Log to console
    if (data) {
        console.log(`${prefix} ${message}`, data);
    } else {
        console.log(`${prefix} ${message}`);
    }
    
    // Store message for on-screen display
    const debugMessage = {
        timestamp: timestamp,
        group: group,
        functionName: functionName,
        message: message,
        data: data,
        fullText: data ? `${prefix} ${message} ${JSON.stringify(data, null, 2)}` : `${prefix} ${message}`
    };
    
    debug_message_buffer.push(debugMessage);
    
    // Keep buffer size manageable
    if (debug_message_buffer.length > DEBUG_MAX_MESSAGES) {
        debug_message_buffer.shift();
    }
    
    // Notify any listeners (like the debug page)
    if (typeof window.debug_message_listener === 'function') {
        window.debug_message_listener(debugMessage);
    }
}

// Convenience functions for common debug groups
function debug_ui(functionName, message, data) {
    debug_log('ui', functionName, message, data);
}

function debug_function(functionName, message, data) {
    debug_log('function', functionName, message, data);
}

function debug_sync(functionName, message, data) {
    debug_log('sync', functionName, message, data);
}

function debug_filter(functionName, message, data) {
    debug_log('filter', functionName, message, data);
}

function debug_nav(functionName, message, data) {
    debug_log('nav', functionName, message, data);
}

function debug_basic(functionName, message, data) {
    debug_log('basic', functionName, message, data);
}

// Performance timing helper
const perf_timers = new Map();

function debug_perf_start(label) {
    if (!debug_is_enabled('perf')) return;
    perf_timers.set(label, performance.now());
}

function debug_perf_end(label, functionName) {
    if (!debug_is_enabled('perf')) return;
    
    const start = perf_timers.get(label);
    if (start) {
        const duration = performance.now() - start;
        debug_log('perf', functionName, `${label} took ${duration.toFixed(2)}ms`);
        perf_timers.delete(label);
    }
}

// Function to get debug messages
function debug_messages_get(group = null, limit = 100) {
    let messages = debug_message_buffer;
    
    // Filter by group if specified
    if (group && group !== 'all') {
        messages = messages.filter(msg => msg.group === group);
    }
    
    // Return most recent messages
    return messages.slice(-limit);
}

// Function to clear debug messages
function debug_messages_clear() {
    debug_message_buffer.length = 0;
    
    // Notify listeners
    if (typeof window.debug_message_listener === 'function') {
        window.debug_message_listener({type: 'clear'});
    }
}

// Make debug functions available globally
window.DEBUG_GROUPS = DEBUG_GROUPS;
window.debug_log = debug_log;
window.debug_ui = debug_ui;
window.debug_function = debug_function;
window.debug_sync = debug_sync;
window.debug_filter = debug_filter;
window.debug_nav = debug_nav;
window.debug_basic = debug_basic;
window.debug_is_enabled = debug_is_enabled;
window.debug_group_set = debug_group_set;
window.debug_perf_start = debug_perf_start;
window.debug_perf_end = debug_perf_end;
window.debug_messages_get = debug_messages_get;
window.debug_messages_clear = debug_messages_clear;
window.debug_message_buffer = debug_message_buffer;

// ============================================
// SHARED STATE VARIABLES
// ============================================
let edit_is_active = false;
let sync_connection = null;
let reload_interval_auto = null;
let currently_editing = null;

// ============================================
// CURSOR AND FOCUS UTILITIES
// ============================================

// Shared cursor placement function
function field_cursor_set(element, event) {
    element.focus();
    
    // Try to place cursor at click position
    if (document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(event.clientX, event.clientY);
        if (pos) {
            const range = document.createRange();
            range.setStart(pos.offsetNode, pos.offset);
            range.collapse(true);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    } else if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(event.clientX, event.clientY);
        if (range) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    } else {
        // Fallback: place cursor at end
        const range = document.createRange();
        const sel   = window.getSelection();
        range.selectNodeContents(element);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

// ============================================
// DEBOUNCE UTILITY
// ============================================

// Debounce function for real-time sync
function sync_debounce_create(func, wait) {
    let timeout;
    return function sync_timeout_execute(...args) {
        const sync_timeout_callback = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(sync_timeout_callback, wait);
    };
}

// ============================================
// WEBSOCKET MANAGEMENT
// ============================================

// Initialize WebSocket for real-time updates
function sync_connection_initialize() {
    try {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}`;
        
        sync_connection = new WebSocket(wsUrl);
        
        sync_connection.onopen = function(event) {
            console.log('WebSocket connected successfully');
        };
        
        sync_connection.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('WebSocket message received:', data);
                
                if (data.type === 'file_changed') {
                    sync_file_handle(data);
                } else if (data.type === 'auto_reload_activated') {
                    reload_auto_activation_handle(data);
                } else if (data.type === 'auto_reload_deactivated') {
                    reload_auto_deactivation_handle();
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
        
        sync_connection.onclose = function(event) {
            console.log('WebSocket connection closed:', event.code, event.reason);
            
            // Attempt to reconnect after a delay
            setTimeout(() => {
                console.log('Attempting to reconnect WebSocket...');
                sync_connection_initialize();
            }, 3000);
        };
        
        sync_connection.onerror = function(error) {
            console.error('WebSocket error:', error);
        };
        
    } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        // Fall back to polling if WebSocket fails
        sync_connection_fallback();
    }
}

// Handle file change events from WebSocket
function sync_file_handle(data) {
    if (edit_is_active) return; // Skip if editing
    
    console.log('File changed via WebSocket, reloading...', data);
    
    // Show notification before reload
    reload_notification_show('File updated, refreshing...');
    
    // Save outline state if available
    if (typeof outline_state_save === 'function') {
        outline_state_save();
    }
    
    // Save any page-specific state
    if (typeof page_state_save === 'function') {
        page_state_save();
    }
    
    // Save current scroll position
    const scrollPosition = window.scrollY;
    sessionStorage.setItem('scroll_position', scrollPosition);
    
    // Reload after a brief delay to show notification
    setTimeout(() => {
        location.reload();
    }, 500);
}

// Handle auto-reload activation
function reload_auto_activation_handle(data) {
    console.log('Auto-reload mode activated', data);
    
    // Clear any existing interval
    if (reload_interval_auto) {
        clearInterval(reload_interval_auto);
    }
    
    // Show notification
    reload_auto_notification_show(true, data.expires_at);
    
    // Set up periodic reload
    reload_interval_auto = setInterval(() => {
        if (!edit_is_active) {
            console.log('Auto-reloading (periodic)...');
            
            // Save outline state if available
            if (typeof outline_state_save === 'function') {
                outline_state_save();
            }
            
            // Save page-specific state
            if (typeof page_state_save === 'function') {
                page_state_save();
            }
            
            // Save scroll position
            const scrollPosition = window.scrollY;
            sessionStorage.setItem('scroll_position', scrollPosition);
            
            location.reload();
        }
    }, data.interval || 60000); // Default to 1 minute
    
    // Also set timeout to stop after expiration
    const timeUntilExpire = data.expires_at - Date.now();
    if (timeUntilExpire > 0) {
        setTimeout(() => {
            reload_auto_deactivation_handle();
        }, timeUntilExpire);
    }
}

// Handle auto-reload deactivation
function reload_auto_deactivation_handle() {
    console.log('Auto-reload mode deactivated');
    
    // Clear interval
    if (reload_interval_auto) {
        clearInterval(reload_interval_auto);
        reload_interval_auto = null;
    }
    
    // Hide notification
    reload_auto_notification_show(false);
}

// Show/hide auto-reload notification
function reload_auto_notification_show(show, expiresAt = null) {
    let notification = document.getElementById('reload_auto_notification');
    
    if (show && !notification) {
        // Create notification element
        notification = document.createElement('div');
        notification.id = 'reload_auto_notification';
        notification.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            background: #2ea043;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        `;
        
        const expiresTime = expiresAt ? new Date(expiresAt).toLocaleTimeString() : '';
        notification.innerHTML = `🔄 Auto-reload active until ${expiresTime}`;
        document.body.appendChild(notification);
    } else if (!show && notification) {
        notification.remove();
    }
}

// Show reload notification
function reload_notification_show(message) {
    // Remove any existing notification
    const existing = document.getElementById('reload-notification');
    if (existing) existing.remove();
    
    // Create notification
    const notification = document.createElement('div');
    notification.id = 'reload-notification';
    notification.style.cssText = `
        position: fixed;
        top: 120px;
        right: 20px;
        background: #2ea043;
        color: white;
        padding: 12px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        z-index: 2000;
        box-shadow: 0 4px 12px rgba(46, 160, 67, 0.4);
        transition: all 0.3s ease;
        opacity: 0;
        transform: translateX(20px);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10);
    
    return notification;
}

// Fallback to polling if WebSocket fails
function sync_connection_fallback() {
    console.log('Falling back to polling for updates...');
    
    setInterval(() => {
        if (!edit_is_active) {
            fetch(`/check-update?t=${Date.now()}`)
                .then(res => res.json())
                .then(data => {
                    if (data.should_reload) {
                        console.log('Update detected via polling, reloading...');
                        location.reload();
                    }
                })
                .catch(err => console.error('Polling error:', err));
        }
    }, 5000); // Poll every 5 seconds
}

// ============================================
// SYNC FUNCTIONALITY
// ============================================

// Create sync function for an element
function sync_function_create(element, getTextCallback) {
    return sync_debounce_create(function() {
        const index = Array.from(element.parentElement.children).indexOf(element);
        
        if (index >= 0) {
            const editedText = getTextCallback ? getTextCallback() : element.textContent;
            
            fetch('/sync', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    file_name:   window.FILE_NAME,
                    line_number: index,
                    text:        editedText.trim()
                })
            })
            .then(res => res.json())
            .then(data => {
                console.log('Real-time sync response:', data);
                if (data.success) {
                    edit_is_active = false;
                }
            })
            .catch(err => console.error('Real-time sync failed:', err));
        }
    }, 100);
}

// ============================================
// SCROLL POSITION MANAGEMENT
// ============================================

// Restore scroll position after reload
function scroll_position_restore() {
    const saved_position = sessionStorage.getItem('scroll_position');
    if (saved_position) {
        window.scrollTo(0, parseInt(saved_position));
        sessionStorage.removeItem('scroll_position');
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize WebSocket on page load
sync_connection_initialize();

// Restore scroll position on page load
document.addEventListener('DOMContentLoaded', () => {
    scroll_position_restore();
});

// Export shared variables and functions for use in other scripts
window.shared_client = {
    // State
    get edit_is_active() { return edit_is_active; },
    set edit_is_active(value) { edit_is_active = value; },
    get currently_editing() { return currently_editing; },
    set currently_editing(value) { currently_editing = value; },
    
    // Functions
    field_cursor_set,
    sync_debounce_create,
    sync_connection_initialize,
    sync_file_handle,
    reload_auto_activation_handle,
    reload_auto_deactivation_handle,
    reload_auto_notification_show,
    reload_notification_show,
    sync_connection_fallback,
    sync_function_create,
    scroll_position_restore
};