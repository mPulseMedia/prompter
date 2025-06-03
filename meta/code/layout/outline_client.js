// ============================================
// OUTLINE HELPER FUNCTIONS
// ============================================

// Helper function to get all descendants of an outline element
function outline_children_find(parentDiv) {
    const parentIndent = parseInt(parentDiv.getAttribute('data-indent'));
    const descendants = [];
    let nextSibling = parentDiv.nextElementSibling;
    while (nextSibling) {
        const nextIndent = parseInt(nextSibling.getAttribute('data-indent'));
        if (nextIndent <= parentIndent) {
            break;
        }
        descendants.push(nextSibling);
        nextSibling = nextSibling.nextElementSibling;
    }
    return descendants;
}

// Helper function to show/hide a div with proper display type
function outline_display_set(div, show) {
    const hasOutline = div.querySelector('.outline_line_number');
    div.style.display = show ? (hasOutline ? 'flex' : 'block') : 'none';
}

// ============================================
// OUTLINE STATE PERSISTENCE
// ============================================

// Get a unique key for a div based on its outline and text
function outline_state_key_generate(div) {
    const outlineNum = div.querySelector('.outline_line_number');
    const indent = div.getAttribute('data-indent');
    
    // Use outline number and indent as key, or just indent if no outline
    if (outlineNum) {
        const outlineText = outlineNum.getAttribute('data-original') || outlineNum.textContent;
        const text = div.querySelector('.list_edit_text')?.textContent || '';
        return `${indent}:${outlineText}:${text}`;
    } else {
        const text = div.textContent.trim();
        return `${indent}:text:${text}`;
    }
}

// Save current collapse state to localStorage
function outline_state_save() {
    const fileName = window.FILE_NAME || 'functions_file';
    const storageKey = `outline_collapse_state_${fileName}`;
    const state = {};
    
    document.querySelectorAll('div[data-indent]').forEach(div => {
        if (div.querySelector('.outline_line_number')) {
            const key = outline_state_key_generate(div);
            state[key] = div.getAttribute('data-collapsed') === 'true';
        }
    });
    
    localStorage.setItem(storageKey, JSON.stringify(state));
}

// Restore collapse state from localStorage
function outline_state_restore() {
    const fileName = window.FILE_NAME || 'functions_file';
    const storageKey = `outline_collapse_state_${fileName}`;
    const savedState = localStorage.getItem(storageKey);
    
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            
            document.querySelectorAll('div[data-indent]').forEach(div => {
                if (div.querySelector('.outline_line_number')) {
                    const key = outline_state_key_generate(div);
                    if (key in state) {
                        div.setAttribute('data-collapsed', state[key] ? 'true' : 'false');
                        const outlineNum = div.querySelector('.outline_line_number');
                        if (outlineNum) outline_display_update(outlineNum);
                    }
                }
            });
            
            // After restoring collapsed states, update visibility
            outline_visibility_apply();
        } catch (e) {
            console.error('Error restoring outline state:', e);
            // If restore fails, apply default initial state
            outline_initial_state();
        }
    } else {
        // No saved state, apply default initial state
        outline_initial_state();
    }
}

// ============================================
// OUTLINE DISPLAY FUNCTIONS
// ============================================

// Update outline display for collapsed/expanded state
function outline_display_update(outlineNum) {
    const parentDiv = outlineNum.parentElement;
    const parentIndent = parseInt(parentDiv.getAttribute('data-indent'));
    const isCollapsed = parentDiv.getAttribute('data-collapsed') === 'true';
    const originalText = outlineNum.getAttribute('data-original');
    const isRepeated = parentDiv.getAttribute('data-repeated') === 'true';
    
    // Check if this item has children
    let hasChildren = false;
    let nextSibling = parentDiv.nextElementSibling;
    if (nextSibling) {
        const nextIndent = parseInt(nextSibling.getAttribute('data-indent'));
        if (nextIndent > parentIndent) {
            hasChildren = true;
        }
    }
    
    // Update the display based on state
    if (!hasChildren && !isRepeated) {
        // No children and not repeated - always show period
        outlineNum.textContent = originalText;
    } else if (isCollapsed) {
        // Collapsed - show caret
        outlineNum.textContent = originalText.replace('.', '>');
    } else {
        // Expanded - show period
        outlineNum.textContent = originalText;
    }
    
    // Update text color for repeated functions
    if (isRepeated) {
        const editableText = parentDiv.querySelector('.list_edit_text');
        if (isCollapsed) {
            editableText.style.color = '#6e7681'; // Gray when collapsed
        } else {
            editableText.style.color = ''; // White when expanded
        }
    }
}

// Apply initial collapsed state visibility
function outline_initial_state() {
    const allDivs = document.querySelectorAll('div[data-indent]');
    
    allDivs.forEach(div => {
        const indent = parseInt(div.getAttribute('data-indent'));
        
        // Skip top-level items
        if (indent === 0) return;
        
        // Check if any parent is collapsed
        let shouldShow = true;
        let checkIndent = indent - 1;
        let current = div.previousElementSibling;
        
        while (checkIndent >= 0 && current) {
            const currentIndent = parseInt(current.getAttribute('data-indent'));
            if (currentIndent === checkIndent) {
                if (current.querySelector('.outline_line_number') && 
                    current.getAttribute('data-collapsed') === 'true') {
                    shouldShow = false;
                    break;
                }
                checkIndent--;
            }
            current = current.previousElementSibling;
        }
        
        // Hide if under a collapsed parent
        if (!shouldShow) {
            div.style.display = 'none';
        }
    });
}

// ============================================
// OUTLINE ACTION FUNCTIONS
// ============================================

// Single click action - toggle immediate children
function outline_click_single_handle(outlineNum) {
    const parentDiv = outlineNum.parentElement;
    const parentIndent = parseInt(parentDiv.getAttribute('data-indent'));
    const isCollapsed = parentDiv.getAttribute('data-collapsed') === 'true';
    const isRepeated = parentDiv.getAttribute('data-repeated') === 'true';
    
    parentDiv.setAttribute('data-collapsed', !isCollapsed);
    
    // Update the outline display for this item
    outline_display_update(outlineNum);
    
    if (isCollapsed) {
        // Expanding - show children respecting their collapsed state
        let current = parentDiv.nextElementSibling;
        let stack = [parentIndent]; // Track the indent levels we should show
        
        while (current) {
            const currentIndent = parseInt(current.getAttribute('data-indent'));
            
            // Stop if we've gone past all descendants
            if (currentIndent <= parentIndent) {
                break;
            }
            
            // Remove deeper levels from stack that we've passed
            while (stack.length > 0 && stack[stack.length - 1] >= currentIndent) {
                stack.pop();
            }
            
            // Should we show this element?
            if (stack.length > 0 && currentIndent === stack[stack.length - 1] + 1) {
                outline_display_set(current, true);
                
                // If parent is repeated and expanding, make children white too
                if (isRepeated) {
                    const childEditableText = current.querySelector('.list_edit_text');
                    if (childEditableText) {
                        childEditableText.style.color = ''; // White
                    }
                }
                
                // If this element is expanded, add its level to the stack
                if (current.querySelector('.outline_line_number') && 
                    current.getAttribute('data-collapsed') !== 'true') {
                    stack.push(currentIndent);
                }
            }
            
            current = current.nextElementSibling;
        }
    } else {
        // Collapsing - hide all descendants
        let current = parentDiv.nextElementSibling;
        while (current) {
            const currentIndent = parseInt(current.getAttribute('data-indent'));
            if (currentIndent <= parentIndent) {
                break;
            }
            outline_display_set(current, false);
            current = current.nextElementSibling;
        }
    }
    
    // Save state after changes
    outline_state_save();
}

// Double click action - recursive expand/collapse all
function outline_click_double_handle(outlineNum) {
    const parentDiv = outlineNum.parentElement;
    const descendants = outline_children_find(parentDiv);
    const isCollapsed = parentDiv.getAttribute('data-collapsed') === 'true';
    const isRepeated = parentDiv.getAttribute('data-repeated') === 'true';
    
    if (isCollapsed) {
        // Expand everything recursively
        parentDiv.setAttribute('data-collapsed', 'false');
        outline_display_update(outlineNum);
        descendants.forEach(desc => {
            outline_display_set(desc, true);
            if (desc.querySelector('.outline_line_number')) {
                desc.setAttribute('data-collapsed', 'false');
                const descOutlineNum = desc.querySelector('.outline_line_number');
                if (descOutlineNum) outline_display_update(descOutlineNum);
            }
            // If parent is repeated, make all descendants white
            if (isRepeated) {
                const descEditableText = desc.querySelector('.list_edit_text');
                if (descEditableText) {
                    descEditableText.style.color = ''; // White
                }
            }
        });
    } else {
        // Collapse everything recursively
        parentDiv.setAttribute('data-collapsed', 'true');
        outline_display_update(outlineNum);
        descendants.forEach(desc => {
            outline_display_set(desc, false);
            if (desc.querySelector('.outline_line_number')) {
                desc.setAttribute('data-collapsed', 'true');
                const descOutlineNum = desc.querySelector('.outline_line_number');
                if (descOutlineNum) outline_display_update(descOutlineNum);
            }
        });
    }
    
    // Save state after changes
    outline_state_save();
}

// ============================================
// FIELD EDITING FUNCTIONS
// ============================================

// Shared cursor placement function
function field_cursor_set(element, event) {
    if (element.childNodes.length === 0) return;
    
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

// Function to exit edit mode
function field_mode_exit(element) {
    // Apply gray style to text if this was originally gray
    const wasGray = element.style.color === 'rgb(110, 118, 129)';
    if (wasGray) {
        element.nextElementSibling.style.color = '#6e7681';
    }
    
    element.removeAttribute('contenteditable');
    element.classList.remove('list_editing_mode');
    
    // Find parent div to update full text
    const parentDiv = element.closest('div[data-indent]');
    if (parentDiv && parentDiv.querySelector('.outline_line_number')) {
        // It has an outline number, so reconstruct the display
        const outlineSpan = parentDiv.querySelector('.outline_line_number');
        const originalOutline = outlineSpan.getAttribute('data-original') || outlineSpan.textContent;
        
        // Keep the > symbol if it was there
        if (element.dataset.wasRepeated === 'true' && !originalOutline.endsWith('>')) {
            outlineSpan.textContent = originalOutline.replace(/\.$/, '>');
        }
    }
    
    delete element.dataset.wasRepeated;
}

// ============================================
// SYNC FUNCTIONS
// ============================================

// Debounce function for real-time sync
function sync_throttle_buffer(func, wait) {
    let timeout;
    return function function_executed(...args) {
        const function_later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(function_later, wait);
    };
}

// Auto-reload functionality
function sync_updates_check() {
    if (edit_is_active) return; // Skip if editing
    
    // Use the FILE_NAME variable set by the server to build the check URL
    const fileName = window.FILE_NAME || 'start_file';
    const checkUrl = `/check/${fileName}.html`;
    
    fetch(checkUrl)
    .then(response => response.json())
    .then(data => {
        if (data.last_modified > reload_last_modified) {
            console.log('File changed, reloading...');
            location.reload();
        }
    })
    .catch(err => console.error('Check failed:', err));
}

// ============================================
// GLOBAL VARIABLES
// ============================================

// Auto-reload state
let reload_last_modified = window.LAST_MODIFIED || Date.now();
let edit_is_active = false;

// Track which element is currently being edited
let currently_editing_text = null;

// Click timer for single/double click detection
let click_timer = null;

// Constant for indentation
const INDENT_PX = 60;  // Pixels per indentation level (must match server)

// ============================================
// INITIALIZATION AND EVENT BINDING
// ============================================

// Start auto-reload interval
setInterval(sync_updates_check, 300);

// Add click event listeners to all row divs
const rowDivs = document.querySelectorAll('div[style*="margin-left"]');

rowDivs.forEach(div => {
    // Find the editable text element within this row
    let editableText;
    if (div.classList.contains('list_edit_text')) {
        // This div is itself the editable text (no outline number)
        editableText = div;
    } else {
        // This div contains an outline number and editable text span
        editableText = div.querySelector('.list_edit_text');
    }
    
    if (editableText) {
        let syncDebounced;
        
        // Create debounced sync function for this element
        syncDebounced = sync_throttle_buffer(function() {
            const allRows = Array.from(document.querySelectorAll('div[style*="margin-left"]'));
            const lineNumber = allRows.indexOf(div);
            
            if (lineNumber >= 0) {
                fetch('/sync', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({
                        file_name:   window.FILE_NAME || 'start_file',
                        line_number: lineNumber,
                        text:        editableText.textContent
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
        
        // Click on the entire row
        div.addEventListener('click', function(event) {
            // If there's another element being edited, exit its edit mode
            if (currently_editing_text && currently_editing_text !== editableText) {
                field_mode_exit(currently_editing_text);
            }
            
            if (editableText.getAttribute('contenteditable') !== 'true') {
                editableText.setAttribute('contenteditable', 'true');
                editableText.classList.add('list_editing_mode');
                
                // Pass the click event for accurate cursor placement
                field_cursor_set(editableText, event);
                
                edit_is_active = true;
                currently_editing_text = editableText;
            }
        });
        
        // Add input event for real-time sync
        editableText.addEventListener('input', function() {
            if (this.getAttribute('contenteditable') === 'true') {
                syncDebounced();
            }
        });
        
        // Only Enter key exits edit mode
        editableText.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                field_mode_exit(this);
                edit_is_active = false;
                currently_editing_text = null;
                
                // Final sync on Enter
                syncDebounced();
            }
        });
    }
});

// Add outline collapse/expand functionality
const outlineNumbers = document.querySelectorAll('.outline_line_number');

// Initial update of all outline displays
outlineNumbers.forEach(outlineNum => {
    outline_display_update(outlineNum);
});

// Restore saved collapse states before applying initial state
outline_state_restore();

// Apply initial state (if no saved state was found)
// Note: outline_state_restore() calls outline_initial_state() after restoring

// Add click handlers to outline numbers
outlineNumbers.forEach(outlineNum => {
    // Click handler with single/double click detection
    outlineNum.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if (click_timer) {
            // Double click detected - cancel single click timer
            clearTimeout(click_timer);
            click_timer = null;
            outline_click_double_handle(outlineNum);
        } else {
            // First click - wait to see if it's a double click
            click_timer = setTimeout(() => {
                click_timer = null;
                outline_click_single_handle(outlineNum);
            }, 250); // Standard double-click delay
        }
    });
});

// Collapse All button functionality
document.getElementById('collapse-all-btn').addEventListener('click', function() {
    // Get all divs with outline numbers
    const allOutlineDivs = document.querySelectorAll('div[data-indent]');
    
    allOutlineDivs.forEach(div => {
        if (div.querySelector('.outline_line_number')) {
            // Mark as collapsed
            div.setAttribute('data-collapsed', 'true');
            
            // Update outline display
            const outlineNum = div.querySelector('.outline_line_number');
            if (outlineNum) outline_display_update(outlineNum);
            
            // Hide all descendants
            const parentIndent = parseInt(div.getAttribute('data-indent'));
            let current = div.nextElementSibling;
            
            while (current) {
                const currentIndent = parseInt(current.getAttribute('data-indent'));
                if (currentIndent <= parentIndent) {
                    break;
                }
                current.style.display = 'none';
                if (current.querySelector('.outline_line_number')) {
                    current.setAttribute('data-collapsed', 'true');
                    const currOutlineNum = current.querySelector('.outline_line_number');
                    if (currOutlineNum) outline_display_update(currOutlineNum);
                }
                current = current.nextElementSibling;
            }
        }
    });
    
    // Save state after collapsing all
    outline_state_save();
});

// Expand All button functionality
document.getElementById('expand-all-btn').addEventListener('click', function() {
    // Get all divs
    const allDivs = document.querySelectorAll('div[data-indent]');
    
    // First, mark all outline divs as expanded
    allDivs.forEach(div => {
        if (div.querySelector('.outline_line_number')) {
            div.setAttribute('data-collapsed', 'false');
            const outlineNum = div.querySelector('.outline_line_number');
            if (outlineNum) outline_display_update(outlineNum);
        }
    });
    
    // Then show all divs with proper display type
    allDivs.forEach(div => {
        const hasOutline = div.querySelector('.outline_line_number');
        div.style.display = hasOutline ? 'flex' : 'block';
    });
    
    // Save state after expanding all
    outline_state_save();
});

// Expand to Level 2 button functionality
document.getElementById('expand-level-2-btn').addEventListener('click', function() {
    // Get all divs
    const allDivs = document.querySelectorAll('div[data-indent]');
    
    // Process all divs
    allDivs.forEach(div => {
        const indent = parseInt(div.getAttribute('data-indent'));
        const hasOutline = div.querySelector('.outline_line_number');
        
        if (hasOutline) {
            if (indent === 0) {
                // First level - expand
                div.setAttribute('data-collapsed', 'false');
            } else if (indent === 1) {
                // Second level - collapse
                div.setAttribute('data-collapsed', 'true');
            }
            // Third level and deeper - leave unchanged
            
            // Update outline display
            const outlineNum = div.querySelector('.outline_line_number');
            if (outlineNum) outline_display_update(outlineNum);
        }
    });
    
    // Now handle visibility
    allDivs.forEach(div => {
        const indent = parseInt(div.getAttribute('data-indent'));
        
        if (indent === 0) {
            // First level - always show
            const hasOutline = div.querySelector('.outline_line_number');
            div.style.display = hasOutline ? 'flex' : 'block';
        } else if (indent === 1) {
            // Second level - show if parent is expanded
            let parent = div.previousElementSibling;
            while (parent && parseInt(parent.getAttribute('data-indent')) >= indent) {
                parent = parent.previousElementSibling;
            }
            if (parent && parent.getAttribute('data-collapsed') === 'false') {
                const hasOutline = div.querySelector('.outline_line_number');
                div.style.display = hasOutline ? 'flex' : 'block';
            } else {
                div.style.display = 'none';
            }
        } else {
            // Third level and deeper - show/hide based on parent hierarchy
            let shouldShow = true;
            let checkIndent = indent - 1;
            let current = div.previousElementSibling;
            
            // Find each parent level and check if it's expanded
            while (checkIndent >= 0 && current) {
                const currentIndent = parseInt(current.getAttribute('data-indent'));
                if (currentIndent === checkIndent) {
                    if (current.querySelector('.outline_line_number') && 
                        current.getAttribute('data-collapsed') === 'true') {
                        shouldShow = false;
                        break;
                    }
                    checkIndent--;
                }
                current = current.previousElementSibling;
            }
            
            if (shouldShow) {
                const hasOutline = div.querySelector('.outline_line_number');
                div.style.display = hasOutline ? 'flex' : 'block';
            } else {
                div.style.display = 'none';
            }
        }
    });
    
    // Save state after expanding to level 2
    outline_state_save();
}); 