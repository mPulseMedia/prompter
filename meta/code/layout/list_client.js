// Client-side JavaScript for list pages
console.log(`JavaScript is running for ${window.FILE_NAME || 'list'}!`);

const current_filename = window.location.pathname.split('/').pop() || 'index.html';

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

// Auto-reload functionality
let reload_last_modified = window.LAST_MODIFIED || Date.now();
let edit_is_active = false;

function sync_updates_check() {
    if (edit_is_active) return; // Skip if editing
    
    fetch('/check/' + current_filename)
        .then(response => response.json())
        .then(data => {
            if (data.last_modified > reload_last_modified) {
                console.log('File changed, reloading...');
                location.reload();
            }
        })
        .catch(err => console.error('Check failed:', err));
}

setInterval(sync_updates_check, 300);

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

// Add click event listeners to all li elements
const liElements = document.querySelectorAll('li');
let currently_editing = null; // Track which element is currently being edited

liElements.forEach(li => {
    // Modified setupEditableRow for split terms
    let syncDebounced;
    const fullText = li.getAttribute('data-fulltext') || li.textContent;
    const originalName = li.getAttribute('data-original') || '';
    
    // Create debounced sync function for this element
    syncDebounced = sync_throttle_buffer(function() {
        const index = Array.from(li.parentElement.children).indexOf(li);
        
        if (index >= 0) {
            // Get the edited text from the new-name span
            const newNameSpan = li.querySelector('.list_label_new');
            const editedText = newNameSpan ? newNameSpan.textContent : li.textContent;
            
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
    
    // Function to exit edit mode
    function field_mode_exit(element) {
        const newNameSpan = element.querySelector('.list_label_new');
        if (newNameSpan) {
            newNameSpan.removeAttribute('contenteditable');
            newNameSpan.classList.remove('list_editing_mode');
        } else {
            element.removeAttribute('contenteditable');
            element.classList.remove('list_editing_mode');
        }
        
        // Restore the split display with original content if needed
        const originalContent = element.getAttribute('data-original-content');
        if (originalContent) {
            // Get the current edited text
            const editedText = (newNameSpan ? newNameSpan.textContent : element.textContent).trim();
            
            // Update the data-fulltext attribute with edited text
            element.setAttribute('data-fulltext', editedText);
            
            // Restore the original HTML with type indicators
            if (newNameSpan) {
                // For split display, we need to rebuild it
                const parts = editedText.split('_');
                let previousTerms = [];
                
                // Find previous non-empty li
                let prevLi = element.previousElementSibling;
                while (prevLi && !prevLi.textContent.trim()) {
                    prevLi = prevLi.previousElementSibling;
                }
                
                if (prevLi) {
                    const prevFullText = prevLi.getAttribute('data-fulltext') || '';
                    previousTerms = prevFullText.split('_');
                }
                
                // Rebuild the split display with type indicators
                let displayContent = '';
                const commonFolders = ['app', 'meta', 'prompt', 'rule', 'tool', 'html', 'code', 'js'];
                const hasExtension = editedText.includes('.') && !editedText.endsWith('.') && editedText.lastIndexOf('.') > 0;
                const isFolder = commonFolders.includes(editedText);
                
                // Check for common parts
                if (previousTerms.length > 0) {
                    const delimiters = /[_\-\.\s]+/;
                    const currentParts = editedText.split(delimiters);
                    const previousParts = previousTerms.join('_').split(delimiters);
                    
                    let commonParts = [];
                    for (let i = 0; i < Math.min(currentParts.length, previousParts.length); i++) {
                        if (currentParts[i] === previousParts[i]) {
                            commonParts.push(currentParts[i]);
                        } else {
                            break;
                        }
                    }
                    
                    if (commonParts.length > 0 && commonParts.length < currentParts.length) {
                        // Reconstruct with original delimiters
                        let commonPrefix = '';
                        let remainingTerm = editedText;
                        
                        for (let i = 0; i < commonParts.length; i++) {
                            const partIndex = remainingTerm.indexOf(commonParts[i]);
                            if (partIndex === 0) {
                                commonPrefix += commonParts[i];
                                remainingTerm = remainingTerm.substring(commonParts[i].length);
                                
                                const delimMatch = remainingTerm.match(/^[_\-\.\s]+/);
                                if (delimMatch) {
                                    commonPrefix += delimMatch[0];
                                    remainingTerm = remainingTerm.substring(delimMatch[0].length);
                                }
                            }
                        }
                        
                        if (commonPrefix && remainingTerm) {
                            displayContent = `<span class="list_term_duplicate">${commonPrefix}</span><span class="list_term_unique">${remainingTerm}</span>`;
                        } else {
                            displayContent = editedText;
                        }
                    } else {
                        displayContent = editedText;
                    }
                } else {
                    displayContent = editedText;
                }
                
                // Add type indicators
                if (isFolder && !hasExtension) {
                    displayContent += '<span style="color: #6e7681;">/</span>';
                } else if (hasExtension) {
                    const lastDotIndex = editedText.lastIndexOf('.');
                    const baseName = editedText.substring(0, lastDotIndex);
                    const extension = editedText.substring(lastDotIndex);
                    
                    if (displayContent.includes('list_term_duplicate')) {
                        const regex = /<span class="list_term_unique">([^<]+)<\/span>/;
                        displayContent = displayContent.replace(regex, (match, uniquePart) => {
                            const uniqueDotIndex = uniquePart.lastIndexOf('.');
                            if (uniqueDotIndex > 0) {
                                const uniqueBase = uniquePart.substring(0, uniqueDotIndex);
                                const uniqueExt = uniquePart.substring(uniqueDotIndex);
                                return `<span class="list_term_unique">${uniqueBase}</span><span style="color: #6e7681;">${uniqueExt}</span>`;
                            }
                            return match;
                        });
                    } else {
                        displayContent = baseName + `<span style="color: #6e7681;">${extension}</span>`;
                    }
                } else {
                    displayContent += '<span style="color: #6e7681;">()</span>';
                }
                
                newNameSpan.innerHTML = displayContent;
            } else {
                // Restore original content for non-split elements
                element.innerHTML = originalContent;
            }
        }
        
        element.removeAttribute('data-original-content');
    }
    
    // Click on the entire row
    li.addEventListener('click', function(event) {
        // If clicking on the original-name span, ignore
        if (event.target.classList.contains('list_label_old')) {
            return;
        }
        
        // If there's another element being edited, exit its edit mode
        if (currently_editing && currently_editing !== this) {
            field_mode_exit(currently_editing);
        }
        
        const newNameSpan = this.querySelector('.list_label_new');
        const editTarget = newNameSpan || this;
        
        if (editTarget.getAttribute('contenteditable') !== 'true') {
            // Store original content
            if (newNameSpan) {
                this.setAttribute('data-original-content', newNameSpan.innerHTML);
                // Replace split content with full text for editing
                newNameSpan.textContent = fullText;
            } else {
                this.setAttribute('data-original-content', this.innerHTML);
                this.textContent = fullText;
            }
            
            editTarget.setAttribute('contenteditable', 'true');
            editTarget.classList.add('list_editing_mode');
            
            // Pass the click event for accurate cursor placement
            field_cursor_set(editTarget, event);
            
            edit_is_active = true;
            currently_editing = this;
        }
    });
    
    // Add input event for real-time sync
    li.addEventListener('input', function(event) {
        const editTarget = this.querySelector('.list_label_new') || this;
        if (editTarget.getAttribute('contenteditable') === 'true') {
            syncDebounced();
        }
    });
    
    // Only Enter key exits edit mode
    li.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            field_mode_exit(this);
            edit_is_active = false;
            currently_editing = null;
            
            // Final sync on Enter
            syncDebounced();
        }
    });
});

// ============================================
// FILTER BUTTON FUNCTIONALITY
// ============================================

// Load filter state from localStorage or use defaults
function list_filter_load() {
    const savedState = localStorage.getItem('list_filter_state');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            // Merge with defaults to handle missing keys
            return {
                'function': parsed['function'] !== undefined ? parsed['function'] : true,
                'files-folders': parsed['files-folders'] !== undefined ? parsed['files-folders'] : true,
                'css': parsed['css'] !== undefined ? parsed['css'] : true
            };
        } catch (e) {
            console.error('Failed to parse filter state:', e);
            return {
                'function': true,
                'files-folders': true,
                'css': true
            };
        }
    }
    // Default state (functions and files on, CSS on)
    return {
        'function': true,
        'files-folders': true,
        'css': true
    };
}

// Save filter state to localStorage
function list_filter_save(state) {
    try {
        localStorage.setItem('list_filter_state', JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save filter state:', e);
    }
}

// Initialize filter state from localStorage
const list_filter_state = list_filter_load();

// Get filter buttons
const functionsBtn = document.getElementById('functions-filter');
const filesFoldersBtn = document.getElementById('files-folders-filter');
const cssBtn = document.getElementById('css-filter');

// Update button appearance based on state
function list_filter_update_buttons() {
    if (functionsBtn) {
        if (list_filter_state['function']) {
            functionsBtn.classList.remove('style_inactive');
        } else {
            functionsBtn.classList.add('style_inactive');
        }
    }
    
    if (filesFoldersBtn) {
        if (list_filter_state['files-folders']) {
            filesFoldersBtn.classList.remove('style_inactive');
        } else {
            filesFoldersBtn.classList.add('style_inactive');
        }
    }
    
    if (cssBtn) {
        if (list_filter_state['css']) {
            cssBtn.classList.remove('style_inactive');
        } else {
            cssBtn.classList.add('style_inactive');
        }
    }
}

// Apply current filter state
function list_filter_apply() {
    const liElements = document.querySelectorAll('#list_content li');
    
    liElements.forEach(li => {
        const dataType = li.getAttribute('data-type');
        let shouldShow = true;
        
        if (dataType === 'function') {
            shouldShow = list_filter_state['function'];
        } else if (dataType === 'file' || dataType === 'folder') {
            shouldShow = list_filter_state['files-folders'];
        } else if (dataType === 'css') {
            shouldShow = list_filter_state['css'];
        }
        
        if (shouldShow) {
            li.classList.remove('style_hidden');
        } else {
            li.classList.add('style_hidden');
        }
    });
    
    // Recalculate duplicate coloring after filtering
    list_duplicate_update();
}

// Update duplicate coloring based on visible items
function list_duplicate_update() {
    const liElements = document.querySelectorAll('#list_content li:not(.style_hidden)');
    let previousTerm = '';
    
    liElements.forEach((li, index) => {
        const dataType = li.getAttribute('data-type');
        
        // Skip CSS entries for duplicate coloring
        if (dataType === 'css') {
            return;
        }
        
        const currentTerm = li.getAttribute('data-fulltext');
        const newNameSpan = li.querySelector('.list_label_new');
        const targetElement = newNameSpan || li;
        
        // Reset to default display
        let displayContent = currentTerm;
        
        if (index > 0 && previousTerm) {
            // Split both terms by common delimiters
            const delimiters = /[_\-\.\s]+/;
            const currentParts = currentTerm.split(delimiters);
            const previousParts = previousTerm.split(delimiters);
            
            // Find how many parts match from the start
            let commonParts = [];
            for (let i = 0; i < Math.min(currentParts.length, previousParts.length); i++) {
                if (currentParts[i] === previousParts[i]) {
                    commonParts.push(currentParts[i]);
                } else {
                    break;
                }
            }
            
            // If there are common parts and the current term has more parts
            if (commonParts.length > 0 && commonParts.length < currentParts.length) {
                // Reconstruct the common prefix with original delimiters
                let commonPrefix = '';
                let remainingTerm = currentTerm;
                
                // Find the actual position where common parts end in the original string
                for (let i = 0; i < commonParts.length; i++) {
                    const partIndex = remainingTerm.indexOf(commonParts[i]);
                    if (partIndex === 0) {
                        commonPrefix += commonParts[i];
                        remainingTerm = remainingTerm.substring(commonParts[i].length);
                        
                        // Add delimiter if there's one after this part
                        const delimMatch = remainingTerm.match(/^[_\-\.\s]+/);
                        if (delimMatch) {
                            commonPrefix += delimMatch[0];
                            remainingTerm = remainingTerm.substring(delimMatch[0].length);
                        }
                    }
                }
                
                if (commonPrefix && remainingTerm) {
                    displayContent = `<span class="list_term_duplicate">${commonPrefix}</span><span class="list_term_unique">${remainingTerm}</span>`;
                }
            }
        } else if (index === 0) {
            // First visible item should never have gray parts
            displayContent = currentTerm;
        }
        
        // Only update previousTerm for non-CSS entries
        if (dataType !== 'css') {
            previousTerm = currentTerm;
        }
        
        // Skip rebuilding display for CSS entries - they already have their ">" formatting
        if (dataType === 'css') {
            return;
        }
        
        // Rebuild display with type indicators
        if (dataType === 'folder') {
            displayContent += '<span style="color: #6e7681;">/</span>';
        } else if (dataType === 'file') {
            const lastDotIndex = currentTerm.lastIndexOf('.');
            const baseName = currentTerm.substring(0, lastDotIndex);
            const extension = currentTerm.substring(lastDotIndex);
            
            // Handle extension coloring
            if (displayContent.includes('list_term_duplicate')) {
                const regex = /<span class="list_term_unique">([^<]+)<\/span>/;
                displayContent = displayContent.replace(regex, (match, uniquePart) => {
                    const uniqueDotIndex = uniquePart.lastIndexOf('.');
                    if (uniqueDotIndex > 0) {
                        const uniqueBase = uniquePart.substring(0, uniqueDotIndex);
                        const uniqueExt = uniquePart.substring(uniqueDotIndex);
                        return `<span class="list_term_unique">${uniqueBase}</span><span style="color: #6e7681;">${uniqueExt}</span>`;
                    }
                    return match;
                });
            } else {
                displayContent = baseName + `<span style="color: #6e7681;">${extension}</span>`;
            }
        } else if (dataType === 'function') {
            displayContent += '<span style="color: #6e7681;">()</span>';
        }
        
        // Update the display
        if (newNameSpan) {
            newNameSpan.innerHTML = displayContent;
        } else {
            // Preserve original term if it exists
            const originalTerm = li.getAttribute('data-original');
            if (originalTerm) {
                // This shouldn't happen in normal flow, but handle it gracefully
                targetElement.innerHTML = displayContent;
            } else {
                targetElement.innerHTML = displayContent;
            }
        }
    });
}

// Add click handlers to filter buttons
if (functionsBtn) {
    functionsBtn.addEventListener('click', function() {
        const filter = this.getAttribute('data-filter');
        list_filter_state[filter] = !list_filter_state[filter];
        
        // Save state to localStorage
        list_filter_save(list_filter_state);
        
        // Update button appearance
        if (list_filter_state[filter]) {
            this.classList.remove('style_inactive');
        } else {
            this.classList.add('style_inactive');
        }
        
        list_filter_apply();
    });
}

if (filesFoldersBtn) {
    filesFoldersBtn.addEventListener('click', function() {
        const filter = this.getAttribute('data-filter');
        list_filter_state[filter] = !list_filter_state[filter];
        
        // Save state to localStorage
        list_filter_save(list_filter_state);
        
        // Update button appearance
        if (list_filter_state[filter]) {
            this.classList.remove('style_inactive');
        } else {
            this.classList.add('style_inactive');
        }
        
        list_filter_apply();
    });
}

if (cssBtn) {
    cssBtn.addEventListener('click', function() {
        const filter = this.getAttribute('data-filter');
        list_filter_state[filter] = !list_filter_state[filter];
        
        // Save state to localStorage
        list_filter_save(list_filter_state);
        
        // Update button appearance
        if (list_filter_state[filter]) {
            this.classList.remove('style_inactive');
        } else {
            this.classList.add('style_inactive');
        }
        
        list_filter_apply();
    });
}

// Initialize button states from localStorage
list_filter_update_buttons();

// Apply filters on initial load
list_filter_apply(); 