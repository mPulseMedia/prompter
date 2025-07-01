// Big page client-side functionality
(function() {
    'use strict';
    
    // Wait for DOM to be ready
    function init() {
        console.log('Big page initializing...');
        
        // Set up functions filter button
        const toggle_functions = document.getElementById('toggle_functions');
        if (toggle_functions) {
            // Load saved state
            const show_functions = localStorage.getItem('big_show_functions') !== 'false';
            function_show_update(show_functions);
            
            toggle_functions.addEventListener('click', function() {
                const is_active = toggle_functions.classList.contains('active');
                const new_state = !is_active;
                
                toggle_functions.classList.toggle('active');
                function_show_update(new_state);
                localStorage.setItem('big_show_functions', new_state);
            });
        }
        
        // Set up methods filter button
        const toggle_methods = document.getElementById('toggle_methods');
        if (toggle_methods) {
            // Load saved state
            const show_methods = localStorage.getItem('big_show_methods') !== 'false';
            method_show_update(show_methods);
            
            toggle_methods.addEventListener('click', function() {
                const is_active = toggle_methods.classList.contains('active');
                const new_state = !is_active;
                
                toggle_methods.classList.toggle('active');
                method_show_update(new_state);
                localStorage.setItem('big_show_methods', new_state);
            });
        }
        
        // Save state before page unloads (including auto-reload)
        window.addEventListener('beforeunload', function() {
            state_all_save();
        });
        
        // Also save state periodically to catch any changes
        // But debounce it to avoid saving while user is typing
        let save_timer = null;
        function debounced_save() {
            if (save_timer) clearTimeout(save_timer);
            save_timer = setTimeout(state_all_save, 1000);
        }
        setInterval(debounced_save, 2000);
        
        // Add global click handler for all outline numbers
        document.addEventListener('click', function(e) {
            // Check if clicked element is an outline number
            if (e.target.classList.contains('outline_line_number')) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Clicked outline number:', e.target.textContent);
                
                const parent_div = e.target.parentElement;
                if (!parent_div) return;
                
                // Check if has children
                const current_indent = parseInt(parent_div.getAttribute('data-indent') || '0');
                let next_sibling = parent_div.nextElementSibling;
                let has_children = false;
                
                if (next_sibling && next_sibling.getAttribute('data-indent')) {
                    const next_indent = parseInt(next_sibling.getAttribute('data-indent'));
                    has_children = next_indent > current_indent;
                }
                
                if (!has_children) {
                    console.log('No children, skipping');
                    return;
                }
                
                // Toggle collapsed state
                const is_collapsed = parent_div.getAttribute('data-collapsed') === 'true';
                const new_collapsed = !is_collapsed;
                
                console.log('Toggling:', parent_div.textContent.substring(0, 30), 'from', is_collapsed, 'to', new_collapsed);
                
                parent_div.setAttribute('data-collapsed', new_collapsed);
                
                // Update display
                const outline_num = e.target;
                const original = outline_num.getAttribute('data-original') || outline_num.textContent;
                if (new_collapsed) {
                    outline_num.textContent = original.replace('.', '>');
                } else {
                    outline_num.textContent = original;
                }
                
                // Show/hide children
                descendant_toggle(parent_div, !new_collapsed);
                
                // Save state immediately
                state_all_save();
            }
        });
        
        // Set up search functionality
        const search_input = document.getElementById('search_input');
        const search_clear = document.getElementById('search_clear');
        
        if (search_input) {
            search_input.addEventListener('input', function() {
                const raw_value = search_input.value;
                const search_term = raw_value.trim();
                
                if (raw_value) {
                    search_clear.classList.add('search_clear_visible');
                    if (search_term) {
                        search_big_apply(search_term.toLowerCase());
                    } else {
                        // Just spaces - clear the search results
                        search_big_clear();
                    }
                } else {
                    search_clear.classList.remove('search_clear_visible');
                    search_big_clear();
                }
            });
            
            // Clear button
            if (search_clear) {
                search_clear.addEventListener('click', function() {
                    search_input.value = '';
                    search_clear.classList.remove('search_clear_visible');
                    search_big_clear();
                    search_input.focus();
                });
            }
        }
        
        // Load saved states on init
        state_all_load();
        
        // Set up time filter
        const time_filter_select = document.getElementById('time_filter_select');
        if (time_filter_select) {
            // Load saved time filter state
            const saved_time_filter = localStorage.getItem('big_time_filter') || '0';
            time_filter_select.value = saved_time_filter;
            
            time_filter_select.addEventListener('change', function() {
                const filter_value = time_filter_select.value;
                localStorage.setItem('big_time_filter', filter_value);
                time_filter_big_apply(parseInt(filter_value));
            });
            
            // Apply initial time filter
            time_filter_big_apply(parseInt(saved_time_filter));
        }
    }
    
    function descendant_toggle(parent_div, show) {
        const parent_indent = parseInt(parent_div.getAttribute('data-indent') || '0');
        let sibling = parent_div.nextElementSibling;
        
        while (sibling && sibling.getAttribute('data-indent')) {
            const sibling_indent = parseInt(sibling.getAttribute('data-indent'));
            
            if (sibling_indent <= parent_indent) {
                break; // Reached same or higher level
            }
            
            if (sibling_indent === parent_indent + 1) {
                // Direct child
                // Don't show if it's hidden by filter
                if ((sibling.classList.contains('method_calls') && sibling.classList.contains('hidden')) ||
                    (sibling.classList.contains('function_line') && sibling.classList.contains('hidden'))) {
                    // Skip showing this one, but still process its children if hiding
                    if (!show) {
                        descendant_toggle(sibling, false);
                    }
                } else {
                    sibling.style.display = show ? 'flex' : 'none';
                    
                    // If hiding, also hide its children
                    if (!show) {
                        descendant_toggle(sibling, false);
                    } else if (sibling.getAttribute('data-collapsed') !== 'true') {
                        // If showing and child is expanded, show its children too
                        descendant_toggle(sibling, true);
                    }
                }
            } else {
                // Deeper descendant - only show if parent chain is expanded
                if ((sibling.classList.contains('method_calls') && sibling.classList.contains('hidden')) ||
                    (sibling.classList.contains('function_line') && sibling.classList.contains('hidden'))) {
                    // Skip showing this one
                } else {
                    sibling.style.display = show ? 'flex' : 'none';
                }
            }
            
            sibling = sibling.nextElementSibling;
        }
    }
    
    function state_all_save() {
        const state = {
            collapsed: {},
            search: '',
            cursor_position: null,
            cursor_active: false
        };
        
        // Save collapsed state
        const all_divs = document.querySelectorAll('div[data-indent]');
        all_divs.forEach((div, index) => {
            const collapsed = div.getAttribute('data-collapsed') === 'true';
            const indent = div.getAttribute('data-indent');
            const text = div.textContent.trim().replace(/\s+/g, ' ').substring(0, 50);
            
            // Create a more robust key that can survive page reloads
            const key = `${indent}_${text}`;
            if (collapsed) {
                state.collapsed[key] = true;
            }
        });
        
        // Save search term and cursor position
        const search_input = document.getElementById('search_input');
        if (search_input) {
            state.search = search_input.value;
            state.cursor_position = search_input.selectionStart;
            state.cursor_active = document.activeElement === search_input;
        }
        
        console.log('Saving state:', Object.keys(state.collapsed).length, 'collapsed items, search:', state.search, 'cursor:', state.cursor_position);
        try {
            localStorage.setItem('big_outline_state', JSON.stringify(state));
        } catch (e) {
            console.error('Failed to save state:', e);
        }
    }
    
    function state_all_load() {
        const saved = localStorage.getItem('big_outline_state');
        if (!saved) {
            // Default state: everything is open, so nothing to do
            return;
        }
        
        try {
            const state = JSON.parse(saved);
            
            // Handle both old format (direct object) and new format (with collapsed/search)
            let collapsed_state = state.collapsed || state;
            let search_term = state.search || '';
            let cursor_position = state.cursor_position;
            let cursor_active = state.cursor_active;
            
            console.log('Loading state:', Object.keys(collapsed_state).length, 'collapsed items, search:', search_term, 'cursor:', cursor_position);
            
            // Restore search term
            const search_input = document.getElementById('search_input');
            if (search_input && search_term) {
                search_input.value = search_term;
                search_input.dispatchEvent(new Event('input'));
                
                // Restore cursor position and focus if it was active
                if (cursor_active) {
                    search_input.focus();
                    if (cursor_position !== null && cursor_position !== undefined) {
                        search_input.setSelectionRange(cursor_position, cursor_position);
                    }
                }
            }
            
            // Restore collapsed state
            const all_divs = document.querySelectorAll('div[data-indent]');
            
            all_divs.forEach((div, index) => {
                const indent = div.getAttribute('data-indent');
                const text = div.textContent.trim().replace(/\s+/g, ' ').substring(0, 50);
                const key = `${indent}_${text}`;
                
                if (collapsed_state[key]) {
                    // This item should be collapsed
                    div.setAttribute('data-collapsed', 'true');
                    
                    const outline_num = div.querySelector('.outline_line_number');
                    if (outline_num) {
                        const original = outline_num.getAttribute('data-original') || outline_num.textContent;
                        outline_num.textContent = original.replace('.', '>');
                    }
                    
                    descendant_toggle(div, false);
                }
            });
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    }
    
    function function_show_update(show) {
        const function_lines = document.querySelectorAll('.function_line');
        function_lines.forEach(func => {
            if (show) {
                func.classList.remove('hidden');
                // Also check if its children should be visible
                const is_collapsed = func.getAttribute('data-collapsed') === 'true';
                if (!is_collapsed) {
                    descendant_toggle(func, true);
                }
            } else {
                func.classList.add('hidden');
                // Hide all children when hiding functions
                descendant_toggle(func, false);
            }
        });
        
        const toggle_button = document.getElementById('toggle_functions');
        if (toggle_button) {
            if (show) {
                toggle_button.classList.add('active');
            } else {
                toggle_button.classList.remove('active');
            }
        }
    }
    
    function method_show_update(show) {
        const method_calls = document.querySelectorAll('.method_calls');
        method_calls.forEach(method => {
            if (show) {
                method.classList.remove('hidden');
            } else {
                method.classList.add('hidden');
            }
        });
        
        const toggle_button = document.getElementById('toggle_methods');
        if (toggle_button) {
            if (show) {
                toggle_button.classList.add('active');
            } else {
                toggle_button.classList.remove('active');
            }
        }
    }
    
    function search_big_apply(search_term) {
        const all_divs = document.querySelectorAll('div[data-indent]');
        const matched_paths = new Set();
        
        // First pass: find all matching items
        all_divs.forEach(div => {
            const text_content = div.textContent.toLowerCase();
            const is_match = text_content.includes(search_term);
            
            if (is_match) {
                // Mark this item and all its ancestors as needing to be shown
                let current = div;
                while (current && current.getAttribute('data-indent')) {
                    matched_paths.add(current);
                    
                    // Find parent by going backwards through siblings
                    const current_indent = parseInt(current.getAttribute('data-indent'));
                    let prev = current.previousElementSibling;
                    
                    while (prev) {
                        if (prev.getAttribute('data-indent')) {
                            const prev_indent = parseInt(prev.getAttribute('data-indent'));
                            if (prev_indent < current_indent) {
                                current = prev;
                                break;
                            }
                        }
                        prev = prev.previousElementSibling;
                    }
                    
                    if (prev === null) break;
                }
            }
        });
        
        // Second pass: hide/show based on matches
        all_divs.forEach(div => {
            if (matched_paths.has(div)) {
                div.classList.remove('search_hidden');
                
                // If it's a match and not just an ancestor, expand it
                const text_content = div.textContent.toLowerCase();
                if (text_content.includes(search_term)) {
                    // Expand this item to show its children
                    div.setAttribute('data-collapsed', 'false');
                    const outline_num = div.querySelector('.outline_line_number');
                    if (outline_num) {
                        const original = outline_num.getAttribute('data-original') || outline_num.textContent;
                        outline_num.textContent = original.replace('>', '.');
                    }
                }
            } else {
                div.classList.add('search_hidden');
            }
        });
        
        // Show all children of matched items
        matched_paths.forEach(div => {
            if (div.getAttribute('data-collapsed') !== 'true') {
                descendant_toggle(div, true);
            }
        });
    }
    
    function search_big_clear() {
        const all_divs = document.querySelectorAll('div[data-indent]');
        
        all_divs.forEach(div => {
            div.classList.remove('search_hidden');
        });
        
        // Restore only collapse states, not search
        const saved = localStorage.getItem('big_outline_state');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                const collapsed_state = state.collapsed || state;
                
                // Restore collapsed state
                const all_divs = document.querySelectorAll('div[data-indent]');
                
                all_divs.forEach((div, index) => {
                    const indent = div.getAttribute('data-indent');
                    const text = div.textContent.trim().replace(/\s+/g, ' ').substring(0, 50);
                    const key = `${indent}_${text}`;
                    
                    if (collapsed_state[key]) {
                        // This item should be collapsed
                        div.setAttribute('data-collapsed', 'true');
                        
                        const outline_num = div.querySelector('.outline_line_number');
                        if (outline_num) {
                            const original = outline_num.getAttribute('data-original') || outline_num.textContent;
                            outline_num.textContent = original.replace('.', '>');
                        }
                        
                        descendant_toggle(div, false);
                    }
                });
            } catch (e) {
                console.error('Failed to restore collapse states:', e);
            }
        }
    }
    
    function time_filter_big_apply(duration_minutes) {
        const now = Date.now();
        const filter_duration = duration_minutes * 60 * 1000; // Convert to milliseconds
        
        // Get all file divs that have timestamps
        const all_divs = document.querySelectorAll('div[data-indent]');
        const hidden_files = new Set();
        
        // First pass: identify which files should be hidden
        all_divs.forEach(div => {
            const timestamp = parseInt(div.getAttribute('data-modified'));
            if (timestamp) {
                // This is a file div
                if (filter_duration > 0 && (now - timestamp) > filter_duration) {
                    hidden_files.add(div);
                    div.classList.add('time_hidden');
                } else {
                    div.classList.remove('time_hidden');
                }
            }
        });
        
        // Second pass: hide/show all elements based on file visibility
        all_divs.forEach(div => {
            if (!div.getAttribute('data-modified')) {
                // This is not a file - it's a folder or function
                // Check if it belongs to a hidden file
                let current_file = null;
                let prev = div.previousElementSibling;
                
                // Find the parent file by going backwards
                while (prev) {
                    if (prev.getAttribute('data-modified')) {
                        current_file = prev;
                        break;
                    }
                    const prev_indent = parseInt(prev.getAttribute('data-indent') || '0');
                    const div_indent = parseInt(div.getAttribute('data-indent') || '0');
                    
                    if (prev_indent < div_indent - 1) {
                        // We've gone past the file level
                        break;
                    }
                    prev = prev.previousElementSibling;
                }
                
                if (current_file && hidden_files.has(current_file)) {
                    div.classList.add('time_hidden');
                } else {
                    div.classList.remove('time_hidden');
                }
            }
        });
        
        // Third pass: show folders that contain visible files
        if (filter_duration > 0) {
            const visible_paths = new Set();
            
            all_divs.forEach(div => {
                if (div.getAttribute('data-modified') && !div.classList.contains('time_hidden')) {
                    // This file is visible, mark all its ancestor folders as visible
                    let current = div;
                    while (current) {
                        const current_indent = parseInt(current.getAttribute('data-indent') || '0');
                        
                        // Find parent folder
                        let prev = current.previousElementSibling;
                        while (prev) {
                            const prev_indent = parseInt(prev.getAttribute('data-indent') || '0');
                            if (prev_indent < current_indent && !prev.getAttribute('data-modified')) {
                                // This is a parent folder
                                visible_paths.add(prev);
                                current = prev;
                                break;
                            }
                            prev = prev.previousElementSibling;
                        }
                        
                        if (!prev) break;
                    }
                }
            });
            
            // Show all necessary folders
            visible_paths.forEach(folder => {
                folder.classList.remove('time_hidden');
            });
        }
    }
    
    // Make save function available globally for shared_client.js to call
    window.page_state_save = state_all_save;
    
    // Global functions for the control buttons
    window.outline_expand_all = function() {
        // Find the current deepest visible level
        const all_divs = document.querySelectorAll('div[data-indent]');
        let max_visible_level = -1;
        
        all_divs.forEach(div => {
            if (div.style.display !== 'none' && !div.classList.contains('search_hidden') && !div.classList.contains('time_hidden')) {
                const indent = parseInt(div.getAttribute('data-indent') || '0');
                if (indent > max_visible_level) {
                    max_visible_level = indent;
                }
            }
        });
        
        // Expand one more level down
        const target_level = max_visible_level + 1;
        
        all_divs.forEach(div => {
            const indent = parseInt(div.getAttribute('data-indent') || '0');
            
            if (indent === target_level) {
                // Check if parent is expanded
                let parent = div.previousElementSibling;
                let parent_expanded = true;
                
                while (parent) {
                    const parent_indent = parseInt(parent.getAttribute('data-indent') || '0');
                    if (parent_indent < indent) {
                        if (parent.getAttribute('data-collapsed') === 'true') {
                            parent_expanded = false;
                        }
                        break;
                    }
                    parent = parent.previousElementSibling;
                }
                
                if (parent_expanded && !div.classList.contains('search_hidden') && !div.classList.contains('time_hidden')) {
                    div.style.display = 'flex';
                }
            } else if (indent === max_visible_level && div.style.display !== 'none') {
                // Expand items at current max level
                div.setAttribute('data-collapsed', 'false');
                
                const outline_num = div.querySelector('.outline_line_number');
                if (outline_num) {
                    const original = outline_num.getAttribute('data-original') || outline_num.textContent;
                    outline_num.textContent = original.replace('>', '.');
                }
            }
        });
        
        state_all_save();
    };
    
    window.outline_collapse_all = function() {
        // Find the current deepest visible level
        const all_divs = document.querySelectorAll('div[data-indent]');
        let max_visible_level = -1;
        
        all_divs.forEach(div => {
            if (div.style.display !== 'none' && !div.classList.contains('search_hidden') && !div.classList.contains('time_hidden')) {
                const indent = parseInt(div.getAttribute('data-indent') || '0');
                if (indent > max_visible_level) {
                    max_visible_level = indent;
                }
            }
        });
        
        if (max_visible_level <= 0) return; // Nothing to collapse
        
        // Collapse the deepest level
        all_divs.forEach(div => {
            const indent = parseInt(div.getAttribute('data-indent') || '0');
            
            if (indent === max_visible_level) {
                div.style.display = 'none';
            } else if (indent === max_visible_level - 1 && div.style.display !== 'none') {
                // Mark parent level as collapsed
                div.setAttribute('data-collapsed', 'true');
                
                const outline_num = div.querySelector('.outline_line_number');
                if (outline_num) {
                    const original = outline_num.getAttribute('data-original') || outline_num.textContent;
                    outline_num.textContent = original.replace('.', '>');
                }
            }
        });
        
        state_all_save();
    };
    
    window.outline_level_1_handle = function() {
        const all_divs = document.querySelectorAll('div[data-indent]');
        
        all_divs.forEach(div => {
            const indent = parseInt(div.getAttribute('data-indent') || '0');
            
            if (indent === 0) {
                // Expand level 0
                div.setAttribute('data-collapsed', 'false');
                div.style.display = 'flex';
                
                const outline_num = div.querySelector('.outline_line_number');
                if (outline_num) {
                    const original = outline_num.getAttribute('data-original') || outline_num.textContent;
                    outline_num.textContent = original.replace('>', '.');
                }
            } else if (indent === 1) {
                // Show level 1 but keep it collapsed
                div.setAttribute('data-collapsed', 'true');
                div.style.display = 'flex';
                
                const outline_num = div.querySelector('.outline_line_number');
                if (outline_num) {
                    const original = outline_num.getAttribute('data-original') || outline_num.textContent;
                    outline_num.textContent = original.replace('.', '>');
                }
                
                // Hide its descendants
                descendant_toggle(div, false);
            } else {
                // Hide deeper levels
                div.style.display = 'none';
            }
        });
        
        state_all_save();
    };
    
    window.outline_level_2_handle = function() {
        const all_divs = document.querySelectorAll('div[data-indent]');
        
        all_divs.forEach(div => {
            const indent = parseInt(div.getAttribute('data-indent') || '0');
            
            if (indent <= 1) {
                // Expand levels 0 and 1
                div.setAttribute('data-collapsed', 'false');
                div.style.display = 'flex';
                
                const outline_num = div.querySelector('.outline_line_number');
                if (outline_num) {
                    const original = outline_num.getAttribute('data-original') || outline_num.textContent;
                    outline_num.textContent = original.replace('>', '.');
                }
            } else if (indent === 2) {
                // Show level 2 but keep it collapsed
                div.setAttribute('data-collapsed', 'true');
                div.style.display = 'flex';
                
                const outline_num = div.querySelector('.outline_line_number');
                if (outline_num) {
                    const original = outline_num.getAttribute('data-original') || outline_num.textContent;
                    outline_num.textContent = original.replace('.', '>');
                }
                
                // Hide its descendants
                descendant_toggle(div, false);
            } else {
                // Hide deeper levels
                div.style.display = 'none';
            }
        });
        
        state_all_save();
    };
    
    window.outline_level_3_handle = function() {
        const all_divs = document.querySelectorAll('div[data-indent]');
        
        all_divs.forEach(div => {
            const indent = parseInt(div.getAttribute('data-indent') || '0');
            
            if (indent <= 2) {
                // Expand levels 0, 1, and 2
                div.setAttribute('data-collapsed', 'false');
                div.style.display = 'flex';
                
                const outline_num = div.querySelector('.outline_line_number');
                if (outline_num) {
                    const original = outline_num.getAttribute('data-original') || outline_num.textContent;
                    outline_num.textContent = original.replace('>', '.');
                }
            } else if (indent === 3) {
                // Show level 3 but keep it collapsed
                div.setAttribute('data-collapsed', 'true');
                div.style.display = 'flex';
                
                const outline_num = div.querySelector('.outline_line_number');
                if (outline_num) {
                    const original = outline_num.getAttribute('data-original') || outline_num.textContent;
                    outline_num.textContent = original.replace('.', '>');
                }
                
                // Hide its descendants
                descendant_toggle(div, false);
            } else {
                // Hide deeper levels
                div.style.display = 'none';
            }
        });
        
        state_all_save();
    };
    
    window.outline_expand_all_handle = function() {
        // Toggle between all expanded and all collapsed
        const all_divs = document.querySelectorAll('div[data-indent]');
        let any_collapsed = false;
        
        // Check if anything is collapsed
        all_divs.forEach(div => {
            if (div.getAttribute('data-collapsed') === 'true' && div.style.display !== 'none') {
                any_collapsed = true;
            }
        });
        
        if (any_collapsed) {
            // Some items are collapsed, so expand all
            all_divs.forEach(div => {
                div.setAttribute('data-collapsed', 'false');
                div.style.display = 'flex';
                
                const outline_num = div.querySelector('.outline_line_number');
                if (outline_num) {
                    const original = outline_num.getAttribute('data-original') || outline_num.textContent;
                    outline_num.textContent = original.replace('>', '.');
                }
            });
        } else {
            // Everything is expanded, so collapse all to top level
            const top_level_divs = Array.from(all_divs).filter(div => 
                parseInt(div.getAttribute('data-indent') || '0') === 0
            );
            
            // Collapse all top-level items
            top_level_divs.forEach(div => {
                div.setAttribute('data-collapsed', 'true');
                
                const outline_num = div.querySelector('.outline_line_number');
                if (outline_num) {
                    const original = outline_num.getAttribute('data-original') || outline_num.textContent;
                    outline_num.textContent = original.replace('.', '>');
                }
                
                // Hide all descendants
                descendant_toggle(div, false);
            });
        }
        
        state_all_save();
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();