// Time filter functionality for list pages

// Initialize time filter state
let time_filter_state = {
    duration: 0,  // 0 means all time
    type: 'modified'  // 'created' or 'modified'
};

// Apply time filtering to list items
function apply_time_filter() {
    console.log('=== TIME FILTER START ===');
    const now = Date.now();
    const filterDuration = parseInt(time_filter_state.duration) * 60 * 1000; // Convert minutes to milliseconds
    
    console.log('Time filter duration (minutes):', time_filter_state.duration);
    console.log('Time filter type:', time_filter_state.type);
    
    let timeFilteredCount = 0;
    document.querySelectorAll('#list_content li').forEach(li => {
        // Get timestamp based on filter type
        const timestamp = time_filter_state.type === 'created' 
            ? parseInt(li.getAttribute('data-created'))
            : parseInt(li.getAttribute('data-modified'));
        
        if (!timestamp) {
            // No timestamp data, hide if filtering is active
            if (filterDuration > 0) {
                li.classList.add('style_time_hidden');
            } else {
                li.classList.remove('style_time_hidden');
            }
            return;
        }
        
        // Check if within time range
        if (filterDuration === 0 || (now - timestamp) <= filterDuration) {
            li.classList.remove('style_time_hidden');
            timeFilteredCount++;
            
            // Add visual indicators for recent items
            li.classList.remove('time_recent', 'time_modified_recent');
            
            if (filterDuration > 0 && filterDuration <= 60 * 60 * 1000) { // 1 hour or less
                if (time_filter_state.type === 'created') {
                    li.classList.add('time_recent');
                } else {
                    li.classList.add('time_modified_recent');
                }
            }
        } else {
            li.classList.add('style_time_hidden');
        }
    });
    
    console.log('Items passing time filter:', timeFilteredCount);
    console.log('=== TIME FILTER END ===');
}

// Load time filter state from localStorage
function time_filter_load() {
    const saved = localStorage.getItem('time_filter_state');
    if (saved) {
        try {
            time_filter_state = JSON.parse(saved);
            
            // Update UI to match saved state
            const select = document.getElementById('time_filter_select');
            if (select) select.value = time_filter_state.duration;
            
            const radio = document.getElementById(`time_type_${time_filter_state.type}`);
            if (radio) radio.checked = true;
        } catch (e) {
            console.error('Error loading time filter state:', e);
        }
    }
}

// Save time filter state to localStorage
function time_filter_save() {
    localStorage.setItem('time_filter_state', JSON.stringify(time_filter_state));
}

// Initialize time filter controls
function time_filter_init() {
    // Load saved state
    time_filter_load();
    
    // Time duration dropdown
    const timeSelect = document.getElementById('time_filter_select');
    if (timeSelect) {
        timeSelect.addEventListener('change', function() {
            time_filter_state.duration = this.value;
            time_filter_save();
            apply_time_filter();
            // Trigger unified filtering after time filter
            if (typeof filters_apply_all === 'function') {
                filters_apply_all();
            }
        });
    }
    
    // Created/Modified radio buttons
    document.querySelectorAll('input[name="time_type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                time_filter_state.type = this.value;
                time_filter_save();
                apply_time_filter();
                // Trigger unified filtering after time filter
                if (typeof filters_apply_all === 'function') {
                    filters_apply_all();
                }
            }
        });
    });
    
    // Apply initial filter
    apply_time_filter();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', time_filter_init);
} else {
    time_filter_init();
}

// Export for use by other scripts
window.time_filter = {
    apply: apply_time_filter,
    state: time_filter_state
};