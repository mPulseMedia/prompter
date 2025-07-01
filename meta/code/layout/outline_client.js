// ============================================
// OUTLINE CLIENT - EXPAND/COLLAPSE FUNCTIONALITY
// ============================================

// Global state
const outline_state = {
    collapsed: {},
    initialized: false,
    is_user_action: false
};

// Storage key based on page
const outline_storage_key = 'outline_state_' + (window.FILE_NAME || 'default');

// ============================================
// STATE PERSISTENCE
// ============================================

function outline_state_save() {
    const state = {};
    const all_divs = document.querySelectorAll('div[data-indent]');
    
    all_divs.forEach((div, index) => {
        const collapsed = div.getAttribute('data-collapsed') === 'true';
        const text = div.textContent.trim().substring(0, 50); // First 50 chars as identifier
        const indent = div.getAttribute('data-indent');
        
        // Create a unique key for this item
        const key = `${indent}_${index}_${text}`;
        state[key] = collapsed;
    });
    
    console.log('Saving outline state for', outline_storage_key, state);
    localStorage.setItem(outline_storage_key, JSON.stringify(state));
}

function outline_state_load() {
    const saved_state = localStorage.getItem(outline_storage_key);
    if (!saved_state) return null;
    
    try {
        return JSON.parse(saved_state);
    } catch (e) {
        console.error('Failed to parse saved state:', e);
        return null;
    }
}

function outline_state_restore() {
    // Don't restore if user is actively clicking
    if (outline_state.is_user_action) return;
    
    const saved_state = outline_state_load();
    if (!saved_state) return;
    
    console.log('Restoring outline state for', outline_storage_key, saved_state);
    
    const all_divs = document.querySelectorAll('div[data-indent]');
    
    all_divs.forEach((div, index) => {
        const text = div.textContent.trim().substring(0, 50);
        const indent = div.getAttribute('data-indent');
        const key = `${indent}_${index}_${text}`;
        
        if (key in saved_state) {
            const should_collapse = saved_state[key];
            div.setAttribute('data-collapsed', should_collapse);
            
            const outline_num = div.querySelector('.outline_line_number');
            if (outline_num) {
                outline_display_update(outline_num, should_collapse);
                // Always update visibility based on state
                outline_descendants_show(div, !should_collapse);
            }
        }
    });
}

// ============================================
// CORE FUNCTIONS
// ============================================

function outline_numbers_find() {
    // Try multiple selectors to find outline numbers
    let found = document.querySelectorAll('.outline_line_number');
    
    if (found.length === 0) {
        // Try to find spans that look like outline numbers
        const all_spans = document.querySelectorAll('span');
        const outline_pattern = /^[0-9]+\.$|^[a-z]\.$|^[0-9]+>$|^[a-z]>$/;
        
        found = Array.from(all_spans).filter(span => {
            return outline_pattern.test(span.textContent.trim());
        });
        
        // Add the class to found elements
        found.forEach(span => {
            span.classList.add('outline_line_number');
            span.style.cursor = 'pointer';
            span.style.backgroundColor = 'rgba(46, 160, 67, 0.1)';
            span.style.padding = '2px 5px';
            span.style.borderRadius = '3px';
            span.style.transition = 'all 0.2s ease';
            
            // Store original text
            if (!span.hasAttribute('data-original')) {
                span.setAttribute('data-original', span.textContent);
            }
        });
    }
    
    return found;
}

function outline_has_children(parent_div) {
    const parent_indent = outline_indent_get(parent_div);
    let sibling = parent_div.nextElementSibling;
    
    while (sibling && sibling.tagName === 'DIV') {
        const sibling_indent = outline_indent_get(sibling);
        if (sibling_indent <= parent_indent) {
            break;
        }
        if (sibling_indent === parent_indent + 1) {
            return true; // Found at least one child
        }
        sibling = sibling.nextElementSibling;
    }
    
    return false;
}

function outline_parent_div_get(outline_num) {
    // Get the parent div that contains this outline number
    let parent = outline_num.parentElement;
    while (parent && parent.tagName !== 'DIV') {
        parent = parent.parentElement;
    }
    return parent;
}

function outline_indent_get(div) {
    // Get indent level from data-indent or calculate from margin
    if (div.hasAttribute('data-indent')) {
        return parseInt(div.getAttribute('data-indent'));
    }
    
    // Try to calculate from margin-left
    const margin_left = div.style.marginLeft;
    if (margin_left) {
        const pixels = parseInt(margin_left);
        return Math.floor(pixels / 20); // Assume 20px per indent
    }
    
    return 0;
}

function outline_descendants_get(parent_div) {
    const parent_indent = outline_indent_get(parent_div);
    const descendants = [];
    
    let sibling = parent_div.nextElementSibling;
    while (sibling && sibling.tagName === 'DIV') {
        const sibling_indent = outline_indent_get(sibling);
        if (sibling_indent <= parent_indent) {
            break; // Found a sibling at same or higher level
        }
        descendants.push(sibling);
        sibling = sibling.nextElementSibling;
    }
    
    return descendants;
}

function outline_display_update(outline_num, is_collapsed) {
    const original = outline_num.getAttribute('data-original') || outline_num.textContent;
    
    if (is_collapsed) {
        outline_num.textContent = original.replace('.', '>');
    } else {
        outline_num.textContent = original;
    }
}

// ============================================
// CLICK HANDLERS
// ============================================

function outline_click_handle(outline_num) {
    const parent_div = outline_parent_div_get(outline_num);
    if (!parent_div) return;
    
    // Check if this item has children
    if (!outline_has_children(parent_div)) {
        return; // Don't do anything for leaf nodes
    }
    
    // Mark as user action to prevent interference
    outline_state.is_user_action = true;
    
    const is_collapsed = parent_div.getAttribute('data-collapsed') === 'true';
    const new_collapsed = !is_collapsed;
    
    console.log('Click:', parent_div.textContent.substring(0, 30), 'collapsed:', is_collapsed, '->', new_collapsed);
    
    // Toggle state
    parent_div.setAttribute('data-collapsed', new_collapsed);
    outline_display_update(outline_num, new_collapsed);
    
    // Show/hide descendants based on their own collapsed state
    outline_descendants_show(parent_div, !new_collapsed);
    
    // Visual feedback
    outline_num.style.color = '#2ea043';
    setTimeout(() => {
        outline_num.style.color = '';
    }, 200);
    
    // Save state after change
    outline_state_save();
    
    // Clear user action flag after a delay
    setTimeout(() => {
        outline_state.is_user_action = false;
    }, 100);
}

function outline_descendants_show(parent_div, show) {
    const parent_indent = outline_indent_get(parent_div);
    let sibling = parent_div.nextElementSibling;
    
    while (sibling && sibling.tagName === 'DIV') {
        const sibling_indent = outline_indent_get(sibling);
        
        if (sibling_indent <= parent_indent) {
            break; // Found a sibling at same or higher level
        }
        
        if (sibling_indent === parent_indent + 1) {
            // Direct child
            sibling.style.display = show ? '' : 'none';
            
            // If showing and this child is expanded, show its children too
            if (show && sibling.getAttribute('data-collapsed') !== 'true') {
                outline_descendants_show(sibling, true);
            }
        } else if (!show) {
            // When hiding, hide all descendants
            sibling.style.display = 'none';
        }
        // When showing, deeper descendants are handled by their parents
        
        sibling = sibling.nextElementSibling;
    }
}

function outline_double_click_handle(outline_num) {
    const parent_div = outline_parent_div_get(outline_num);
    if (!parent_div) return;
    
    // Check if this item has children
    if (!outline_has_children(parent_div)) {
        return; // Don't do anything for leaf nodes
    }
    
    const is_collapsed = parent_div.getAttribute('data-collapsed') === 'true';
    
    if (is_collapsed) {
        // If closed, expand ALL descendants recursively
        outline_expand_all(parent_div);
    } else {
        // If open, collapse ALL descendants recursively
        outline_collapse_all(parent_div);
    }
    
    // Visual feedback
    outline_num.style.color = '#007AFF';
    setTimeout(() => {
        outline_num.style.color = '';
    }, 200);
    
    // Save state after change
    outline_state_save();
}

function outline_expand_all(parent_div) {
    // First expand the parent itself
    parent_div.setAttribute('data-collapsed', 'false');
    const parent_outline = parent_div.querySelector('.outline_line_number');
    if (parent_outline) {
        outline_display_update(parent_outline, false);
    }
    
    // Get all descendants and expand them
    const descendants = outline_descendants_get(parent_div);
    descendants.forEach(desc => {
        desc.style.display = '';
        desc.setAttribute('data-collapsed', 'false');
        
        const outline = desc.querySelector('.outline_line_number');
        if (outline) {
            outline_display_update(outline, false);
        }
    });
}

function outline_collapse_all(parent_div) {
    // Collapse the parent
    parent_div.setAttribute('data-collapsed', 'true');
    const parent_outline = parent_div.querySelector('.outline_line_number');
    if (parent_outline) {
        outline_display_update(parent_outline, true);
    }
    
    // Hide and collapse all descendants
    const descendants = outline_descendants_get(parent_div);
    descendants.forEach(desc => {
        desc.style.display = 'none';
        desc.setAttribute('data-collapsed', 'true');
        
        const outline = desc.querySelector('.outline_line_number');
        if (outline) {
            outline_display_update(outline, true);
        }
    });
}

// ============================================
// BUTTON HANDLERS
// ============================================

function outline_level_1_handle() {
    const all_divs = document.querySelectorAll('div');
    all_divs.forEach(div => {
        const indent = outline_indent_get(div);
        const has_outline = div.querySelector('.outline_line_number');
        
        if (indent === 0) {
            div.style.display = '';
            if (has_outline) {
                div.setAttribute('data-collapsed', 'true');
                outline_display_update(has_outline, true);
            }
        } else {
            div.style.display = 'none';
        }
    });
    
    outline_state_save();
}

function outline_level_2_handle() {
    const all_divs = document.querySelectorAll('div');
    
    // First pass: set collapse states
    all_divs.forEach(div => {
        const indent = outline_indent_get(div);
        const has_outline = div.querySelector('.outline_line_number');
        
        if (has_outline) {
            if (indent === 0) {
                div.setAttribute('data-collapsed', 'false');
                outline_display_update(has_outline, false);
            } else if (indent === 1) {
                div.setAttribute('data-collapsed', 'true');
                outline_display_update(has_outline, true);
            }
        }
    });
    
    // Second pass: show/hide
    all_divs.forEach(div => {
        const indent = outline_indent_get(div);
        
        if (indent <= 1) {
            div.style.display = '';
        } else {
            div.style.display = 'none';
        }
    });
    
    outline_state_save();
}

function outline_expand_all_handle() {
    const all_divs = document.querySelectorAll('div');
    all_divs.forEach(div => {
        div.style.display = '';
        
        const has_outline = div.querySelector('.outline_line_number');
        if (has_outline) {
            div.setAttribute('data-collapsed', 'false');
            outline_display_update(has_outline, false);
        }
    });
    
    outline_state_save();
}

// ============================================
// INITIALIZATION
// ============================================

function outline_init() {
    // Find all outline numbers
    const outline_numbers = outline_numbers_find();
    
    if (outline_numbers.length === 0) {
        return false;
    }
    
    // FIRST: Apply initial state (all expanded by default)
    const all_divs = document.querySelectorAll('div[data-indent]');
    all_divs.forEach(div => {
        const collapsed = div.getAttribute('data-collapsed') === 'true';
        if (collapsed) {
            const outline_num = div.querySelector('.outline_line_number');
            if (outline_num) {
                outline_display_update(outline_num, true);
                outline_descendants_show(div, false);
            }
        }
    });
    
    // THEN: Try to restore saved state
    const has_saved_state = outline_state_load() !== null;
    if (has_saved_state) {
        // Restore from localStorage - this will override the default state
        outline_state_restore();
    }
    
    // Bind click handlers to outline numbers
    outline_numbers.forEach((outline_num, idx) => {
        // Remove any existing handlers
        const new_outline = outline_num.cloneNode(true);
        outline_num.parentNode.replaceChild(new_outline, outline_num);
        
        const parent_div = outline_parent_div_get(new_outline);
        const is_leaf = parent_div && !outline_has_children(parent_div);
        
        // Update cursor based on whether it has children
        if (is_leaf) {
            new_outline.style.cursor = 'default';
        } else {
            new_outline.style.cursor = 'pointer';
            // Make the click target larger
            new_outline.style.padding = '2px 4px';
            new_outline.style.marginLeft = '-4px';
            new_outline.style.borderRadius = '3px';
            // Prevent text selection on double-click
            new_outline.style.userSelect = 'none';
            new_outline.style.webkitUserSelect = 'none';
        }
        
        // Add hover effect for all clickable outline numbers
        if (!is_leaf) {
            new_outline.addEventListener('mouseenter', () => {
                new_outline.style.backgroundColor = 'rgba(110, 118, 129, 0.2)';
                new_outline.style.color = '#ffffff';
            });
            
            new_outline.addEventListener('mouseleave', () => {
                new_outline.style.backgroundColor = '';
                new_outline.style.color = '';
            });
        }
        
        // Simple click handler - just toggle on click
        new_outline.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('Click event fired on:', new_outline.textContent);
            outline_click_handle(new_outline);
        });
        
        // Separate double-click for expand/collapse all
        new_outline.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('Double-click event fired on:', new_outline.textContent);
            outline_double_click_handle(new_outline);
        });
    });
    
    // Bind button handlers
    const btn1 = document.getElementById('button_expand_level_1');
    const btn2 = document.getElementById('button_expand_level_2');
    const btn_all = document.getElementById('button_expand_all');
    
    if (btn1) {
        const new_btn1 = btn1.cloneNode(true);
        btn1.parentNode.replaceChild(new_btn1, btn1);
        new_btn1.addEventListener('click', (e) => {
            e.preventDefault();
            outline_level_1_handle();
        });
    }
    
    if (btn2) {
        const new_btn2 = btn2.cloneNode(true);
        btn2.parentNode.replaceChild(new_btn2, btn2);
        new_btn2.addEventListener('click', (e) => {
            e.preventDefault();
            outline_level_2_handle();
        });
    }
    
    if (btn_all) {
        const new_btn_all = btn_all.cloneNode(true);
        btn_all.parentNode.replaceChild(new_btn_all, btn_all);
        new_btn_all.addEventListener('click', (e) => {
            e.preventDefault();
            outline_expand_all_handle();
        });
    }
    
    return true;
}

// ============================================
// INITIALIZATION LOOP
// ============================================

let outline_init_attempts = 0;
const outline_max_attempts = 20;

function outline_init_try() {
    outline_init_attempts++;
    
    if (outline_init()) {
        outline_state.initialized = true;
    } else if (outline_init_attempts < outline_max_attempts) {
        setTimeout(outline_init_try, 500);
    }
}

// Start immediately
outline_init_try();

// Also try on standard events
document.addEventListener('DOMContentLoaded', () => {
    if (!outline_state.initialized) {
        outline_init_try();
    }
});

window.addEventListener('load', () => {
    if (!outline_state.initialized) {
        outline_init_try();
    }
});