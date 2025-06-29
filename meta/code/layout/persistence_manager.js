// Centralized Persistence Manager
// Handles all localStorage operations with minimal code touch points

const persistence_manager = {
    // State keys - centralized registry
    keys: {
        search_term: 'list_search_term',
        search_cursor: 'list_search_cursor', 
        search_focused: 'list_search_focused',
        filter_state: 'list_filter_state',
        time_filter: 'list_time_filter',
        time_filter_open: 'list_time_filter_open'
    },
    
    // Generic get/set methods
    get(key) {
        try {
            const value = localStorage.getItem(this.keys[key] || key);
            return value ? JSON.parse(value) : null;
        } catch (e) {
            console.error(`Persistence get error for ${key}:`, e);
            return null;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(this.keys[key] || key, JSON.stringify(value));
        } catch (e) {
            console.error(`Persistence set error for ${key}:`, e);
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(this.keys[key] || key);
        } catch (e) {
            console.error(`Persistence remove error for ${key}:`, e);
        }
    },
    
    // Specialized methods for common patterns
    search: {
        get_term() {
            return persistence_manager.get('search_term') || '';
        },
        
        set_term(term) {
            if (term && term.length > 0) {
                persistence_manager.set('search_term', term);
            } else {
                persistence_manager.remove('search_term');
            }
        },
        
        get_cursor() {
            const pos = persistence_manager.get('search_cursor');
            return pos !== null ? parseInt(pos, 10) : 0;
        },
        
        set_cursor(position) {
            persistence_manager.set('search_cursor', position);
        },
        
        get_focused() {
            return persistence_manager.get('search_focused') === true;
        },
        
        set_focused(focused) {
            if (focused) {
                persistence_manager.set('search_focused', true);
            } else {
                persistence_manager.remove('search_focused');
            }
        }
    },
    
    filters: {
        get_state() {
            const saved = persistence_manager.get('filter_state');
            return saved || {
                'files-folders': true,
                'function': true,
                'css': true,
                'comment': true
            };
        },
        
        set_state(state) {
            persistence_manager.set('filter_state', state);
        },
        
        get_time_filter() {
            return persistence_manager.get('time_filter') || 0;
        },
        
        set_time_filter(filter) {
            persistence_manager.set('time_filter', filter);
        },
        
        get_time_filter_open() {
            return persistence_manager.get('time_filter_open') === true;
        },
        
        set_time_filter_open(is_open) {
            if (is_open) {
                persistence_manager.set('time_filter_open', true);
            } else {
                persistence_manager.remove('time_filter_open');
            }
        }
    },
    
    // Auto-save wrapper for input elements
    auto_save_input(element, state_key, property = 'value') {
        if (!element) return;
        
        // Save on input
        element.addEventListener('input', () => {
            persistence_manager.set(state_key, element[property]);
        });
        
        // Save on change (for selects, etc.)
        element.addEventListener('change', () => {
            persistence_manager.set(state_key, element[property]);
        });
    },
    
    // Auto-restore wrapper for input elements  
    auto_restore_input(element, state_key, property = 'value') {
        if (!element) return;
        
        const saved_value = persistence_manager.get(state_key);
        if (saved_value !== null) {
            element[property] = saved_value;
        }
    },
    
    // Initialize all persistence for the page
    init() {
        console.log('Persistence Manager initialized');
        this.restore_all_state();
    },
    
    // Restore all known state
    restore_all_state() {
        // Search field
        const search_input = document.getElementById('search_input');
        const search_clear = document.getElementById('search_clear');
        
        if (search_input) {
            const term = this.search.get_term();
            const cursor = this.search.get_cursor();
            const focused = this.search.get_focused();
            
            search_input.value = term;
            
            if (term.length > 0 && search_clear) {
                search_clear.classList.add('search_clear_visible');
            }
            
            setTimeout(() => {
                if (focused) {
                    search_input.focus();
                }
                search_input.setSelectionRange(cursor, cursor);
            }, 0);
        }
        
        // Filter buttons
        const filter_state = this.filters.get_state();
        this.apply_filter_button_states(filter_state);
        
        // Time filter dropdown
        const time_filter_select = document.getElementById('time_filter_select');
        if (time_filter_select) {
            const saved_filter = this.filters.get_time_filter();
            time_filter_select.value = saved_filter.toString();
            
            // Restore open state if it was saved
            if (this.filters.get_time_filter_open()) {
                setTimeout(() => {
                    time_filter_select.focus();
                    // For some browsers, focusing will open the dropdown
                    if (time_filter_select.showPicker) {
                        time_filter_select.showPicker();
                    }
                }, 50);
            }
        }
    },
    
    // Apply filter button visual states
    apply_filter_button_states(state) {
        const buttons = {
            'files-folders': document.getElementById('filter_files_folders'),
            'function': document.getElementById('filter_functions'),
            'css': document.getElementById('filter_css'),
            'comment': document.getElementById('filter_comments')
        };
        
        Object.entries(buttons).forEach(([key, button]) => {
            if (button) {
                if (state[key]) {
                    button.classList.remove('style_inactive');
                } else {
                    button.classList.add('style_inactive');
                }
            }
        });
    }
};