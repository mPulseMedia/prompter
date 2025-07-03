// Sequence Tracker - Automatically tracks function call sequences
(function() {
    'use strict';
    
    // Global sequence tracker
    window.SEQUENCE_TRACKER = {
        sequences: [],
        enabled: true,
        start_time: Date.now(),
        
        // Track a function call
        track: function(func_name, file_name) {
            if (!this.enabled) return;
            
            const sequence_entry = {
                function: func_name,
                file: file_name || 'unknown',
                timestamp: Date.now() - this.start_time,
                stack: new Error().stack.split('\n').slice(3, 6).join('\n')
            };
            
            this.sequences.push(sequence_entry);
            
            // Broadcast to sequence page if open
            if (window.opener || window.parent !== window) {
                try {
                    const message = {
                        type: 'sequence_update',
                        entry: sequence_entry,
                        page: window.location.pathname
                    };
                    
                    if (window.opener) {
                        window.opener.postMessage(message, '*');
                    }
                    if (window.parent !== window) {
                        window.parent.postMessage(message, '*');
                    }
                } catch (e) {
                    // Ignore cross-origin errors
                }
            }
        },
        
        // Get formatted sequence
        get_sequence: function() {
            return this.sequences.map((entry, index) => {
                return {
                    number: index + 1,
                    function: entry.function,
                    file: entry.file,
                    time_ms: entry.timestamp,
                    time_formatted: (entry.timestamp / 1000).toFixed(3) + 's'
                };
            });
        },
        
        // Clear tracked sequences
        clear: function() {
            this.sequences = [];
            this.start_time = Date.now();
        },
        
        // Export sequences for analysis
        export: function() {
            const data = {
                page: window.location.pathname,
                user_agent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                sequences: this.get_sequence()
            };
            
            return JSON.stringify(data, null, 2);
        }
    };
    
    // Helper function to wrap existing functions
    window.SEQUENCE_TRACKER.wrap = function(func_name, original_func, file_name) {
        return function(...args) {
            window.SEQUENCE_TRACKER.track(func_name, file_name);
            return original_func.apply(this, args);
        };
    };
    
    // Auto-wrap common initialization functions if they exist
    const auto_track_functions = [
        'init',
        'nav_init', 
        'list_init',
        'tree_init',
        'outline_init',
        'search_init',
        'state_all_load',
        'state_all_save',
        'time_filter_init',
        'debug_ui_init',
        'big_duplicate_update',
        'tree_dropdown_setup',
        'tree_function_load',
        'list_create_hierarchy',
        'list_filter_init',
        'filters_apply_all'
    ];
    
    // Delay wrapping to ensure functions are defined
    setTimeout(() => {
        auto_track_functions.forEach(func_name => {
            if (typeof window[func_name] === 'function') {
                const original = window[func_name];
                window[func_name] = window.SEQUENCE_TRACKER.wrap(func_name, original, 'global');
            }
        });
    }, 0);
    
    // Track DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        window.SEQUENCE_TRACKER.track('DOMContentLoaded', 'browser-event');
    });
    
    // Track window load
    window.addEventListener('load', () => {
        window.SEQUENCE_TRACKER.track('window.load', 'browser-event');
    });
    
    // Add console command for manual inspection
    window.show_sequence = function() {
        console.table(window.SEQUENCE_TRACKER.get_sequence());
    };
    
    console.log('🔍 Sequence Tracker initialized. Use show_sequence() to view tracked calls.');
})();