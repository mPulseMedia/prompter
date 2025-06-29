// Shared client-side functionality for all layout pages

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