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
            update_functions_visibility(show_functions);
            
            toggle_functions.addEventListener('click', function() {
                const is_active = toggle_functions.classList.contains('active');
                const new_state = !is_active;
                
                toggle_functions.classList.toggle('active');
                update_functions_visibility(new_state);
                localStorage.setItem('big_show_functions', new_state);
            });
        }
        
        // Set up methods filter button
        const toggle_methods = document.getElementById('toggle_methods');
        if (toggle_methods) {
            // Load saved state
            const show_methods = localStorage.getItem('big_show_methods') !== 'false';
            update_methods_visibility(show_methods);
            
            toggle_methods.addEventListener('click', function() {
                const is_active = toggle_methods.classList.contains('active');
                const new_state = !is_active;
                
                toggle_methods.classList.toggle('active');
                update_methods_visibility(new_state);
                localStorage.setItem('big_show_methods', new_state);
            });
        }
        
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
                toggle_descendants(parent_div, !new_collapsed);
                
                // Save state
                save_all_states();
            }
        });
        
        // Load saved states on init
        load_all_states();
    }
    
    function toggle_descendants(parent_div, show) {
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
                        toggle_descendants(sibling, false);
                    }
                } else {
                    sibling.style.display = show ? 'flex' : 'none';
                    
                    // If hiding, also hide its children
                    if (!show) {
                        toggle_descendants(sibling, false);
                    } else if (sibling.getAttribute('data-collapsed') !== 'true') {
                        // If showing and child is expanded, show its children too
                        toggle_descendants(sibling, true);
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
    
    function save_all_states() {
        const state = {};
        const all_divs = document.querySelectorAll('div[data-indent]');
        
        all_divs.forEach((div, index) => {
            if (div.getAttribute('data-collapsed') === 'true') {
                const key = index + '_' + div.textContent.trim().substring(0, 30);
                state[key] = true;
            }
        });
        
        console.log('Saving state:', state);
        localStorage.setItem('big_outline_state', JSON.stringify(state));
    }
    
    function load_all_states() {
        const saved = localStorage.getItem('big_outline_state');
        if (!saved) {
            // Default state: everything is open, so nothing to do
            return;
        }
        
        try {
            const state = JSON.parse(saved);
            console.log('Loading state:', state);
            
            const all_divs = document.querySelectorAll('div[data-indent]');
            
            all_divs.forEach((div, index) => {
                const key = index + '_' + div.textContent.trim().substring(0, 30);
                
                if (state[key]) {
                    // This item should be collapsed
                    div.setAttribute('data-collapsed', 'true');
                    
                    const outline_num = div.querySelector('.outline_line_number');
                    if (outline_num) {
                        const original = outline_num.getAttribute('data-original') || outline_num.textContent;
                        outline_num.textContent = original.replace('.', '>');
                    }
                    
                    toggle_descendants(div, false);
                }
            });
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    }
    
    function update_functions_visibility(show) {
        const function_lines = document.querySelectorAll('.function_line');
        function_lines.forEach(func => {
            if (show) {
                func.classList.remove('hidden');
                // Also check if its children should be visible
                const is_collapsed = func.getAttribute('data-collapsed') === 'true';
                if (!is_collapsed) {
                    toggle_descendants(func, true);
                }
            } else {
                func.classList.add('hidden');
                // Hide all children when hiding functions
                toggle_descendants(func, false);
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
    
    function update_methods_visibility(show) {
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
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();