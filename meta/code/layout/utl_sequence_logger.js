// Simple sequence logger that tracks function calls
window.SEQUENCE_LOG = {
    entries: [],
    start_time: Date.now(),
    enabled: true,
    
    // Log a function call
    log: function(func_name, file_name) {
        if (!this.enabled) return;
        
        const entry = {
            func: func_name,
            file: file_name || 'unknown',
            time: Date.now() - this.start_time,
            timestamp: Date.now()
        };
        
        this.entries.push(entry);
        
        // Also log to console for debugging
        if (window.DEBUG_SEQUENCE) {
            console.log(`[${entry.time}ms] ${func_name}()`);
        }
        
        // Store in localStorage for persistence
        try {
            localStorage.setItem('sequence_log_' + window.location.pathname, JSON.stringify(this.entries));
        } catch (e) {
            // Ignore storage errors
        }
    },
    
    // Get the sequence for current page
    get: function() {
        return this.entries;
    },
    
    // Clear the log
    clear: function() {
        this.entries = [];
        this.start_time = Date.now();
        try {
            localStorage.removeItem('sequence_log_' + window.location.pathname);
        } catch (e) {
            // Ignore storage errors
        }
    },
    
    // Get formatted output
    format: function() {
        return this.entries.map((entry, index) => {
            return `${index + 1}. ${entry.func}() - ${entry.time}ms`;
        }).join('\n');
    }
};

// Shorthand for easier use
window.SEQ = window.SEQUENCE_LOG.log.bind(window.SEQUENCE_LOG);