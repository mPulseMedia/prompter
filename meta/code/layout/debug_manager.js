// Debug Manager - Central debugging system for Meta
// Groups: ui, function, sync, filter, nav, basic, all

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

// Main debug logging function
function debug_log(group, functionName, message, data = null) {
    if (!debug_is_enabled(group)) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] [${group.toUpperCase()}] ${functionName}:`;
    
    if (data) {
        console.log(`${prefix} ${message}`, data);
    } else {
        console.log(`${prefix} ${message}`);
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

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debug_log,
        debug_ui,
        debug_function,
        debug_sync,
        debug_filter,
        debug_nav,
        debug_basic,
        debug_is_enabled,
        debug_group_set,
        debug_perf_start,
        debug_perf_end,
        DEBUG_GROUPS
    };
}