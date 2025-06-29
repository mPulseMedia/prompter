// Client-side JavaScript for list pages
console.log('!!!!! LIST_CLIENT.JS IS LOADING !!!!!');
console.log(`JavaScript is running for ${window.FILE_NAME || 'list'}!`);
console.log('=== LIST_CLIENT.JS LOADED ===');

// Add a visible test to prove JavaScript is running
document.addEventListener('DOMContentLoaded', function() {
    console.log('!!!! DOM CONTENT LOADED - JS IS WORKING !!!!');
    
    // Add a test element to prove JS is running
    const testDiv = document.createElement('div');
    testDiv.innerHTML = 'JAVASCRIPT IS WORKING!';
    testDiv.style.position = 'fixed';
    testDiv.style.top = '100px';
    testDiv.style.right = '20px';
    testDiv.style.background = 'red';
    testDiv.style.color = 'white';
    testDiv.style.padding = '10px';
    testDiv.style.zIndex = '9999';
    document.body.appendChild(testDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        testDiv.remove();
    }, 3000);
});

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

// ============================================
// FUNCTION EXPANSION FUNCTIONALITY
// ============================================

// Toggle function expansion
function function_toggle_expansion(li) {
    if (li.classList.contains('expanded')) {
        li.classList.remove('expanded');
    } else {
        li.classList.add('expanded');
    }
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
        
        // Check if this is a function item and we clicked on the number
        const dataType = this.getAttribute('data-type');
        if (dataType === 'function') {
            // Get click position relative to the li element
            const rect = this.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            
            // Check if click was on the line number (first ~30px)
            if (clickX < 30) {
                event.preventDefault();
                function_toggle_expansion(this);
                return;
            }
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
// FILTER CHECKBOX FUNCTIONALITY
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
                'css': parsed['css'] !== undefined ? parsed['css'] : true,
                'comment': parsed['comment'] !== undefined ? parsed['comment'] : true
            };
        } catch (e) {
            console.error('Failed to parse filter state:', e);
            return {
                'function': true,
                'files-folders': true,
                'css': true,
                'comment': true
            };
        }
    }
    // Default state (all filters on)
    return {
        'function': true,
        'files-folders': true,
        'css': true,
        'comment': true
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

// Initialize checkboxes when DOM is ready
let functionsCheckbox, filesFoldersCheckbox, cssCheckbox, commentsCheckbox;

function list_filter_init() {
    console.log('=== FILTER INIT STARTING ===');
    
    // Get filter checkboxes
    functionsCheckbox = document.getElementById('filter_functions');
    filesFoldersCheckbox = document.getElementById('filter_files_folders');
    cssCheckbox = document.getElementById('filter_css');
    commentsCheckbox = document.getElementById('filter_comments');
    
    console.log('Filter checkboxes found:', {
        functions: !!functionsCheckbox,
        filesfolders: !!filesFoldersCheckbox,
        css: !!cssCheckbox,
        comments: !!commentsCheckbox
    });
    
    if (functionsCheckbox) {
        console.log('Functions checkbox element:', functionsCheckbox);
        console.log('Functions checkbox checked:', functionsCheckbox.checked);
        console.log('Functions checkbox data-filter:', functionsCheckbox.getAttribute('data-filter'));
    }
    
    // Set up checkbox event handlers
    list_filter_setup_handlers();
    
    // Update checkbox states based on saved state
    list_filter_update_checkboxes();
    
    // Apply initial filter state
    list_filter_apply();
    
    console.log('=== FILTER INIT COMPLETE ===');
}

// Update checkbox states based on saved state
function list_filter_update_checkboxes() {
    if (functionsCheckbox) {
        functionsCheckbox.checked = list_filter_state['function'];
    }
    
    if (filesFoldersCheckbox) {
        filesFoldersCheckbox.checked = list_filter_state['files-folders'];
    }
    
    if (cssCheckbox) {
        cssCheckbox.checked = list_filter_state['css'];
    }
    
    if (commentsCheckbox) {
        commentsCheckbox.checked = list_filter_state['comment'];
    }
}

// Apply current filter state using unified filtering
function list_filter_apply() {
    console.log('list_filter_apply called');
    filters_apply_all();
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

// Setup checkbox event handlers
function list_filter_setup_handlers() {
    console.log('=== SETTING UP CHECKBOX HANDLERS ===');
    
    if (functionsCheckbox) {
        console.log('Adding event listener to functions checkbox');
        functionsCheckbox.addEventListener('change', function() {
            console.log('FUNCTIONS CHECKBOX CHANGED!', this.checked);
            const filter = this.getAttribute('data-filter');
            console.log('Filter key:', filter);
            list_filter_state[filter] = this.checked;
            console.log('Updated filter state:', list_filter_state);
            
            // Save state to localStorage
            list_filter_save(list_filter_state);
            
            list_filter_apply();
        });
    } else {
        console.log('Functions checkbox not found for event handler');
    }

    if (filesFoldersCheckbox) {
        filesFoldersCheckbox.addEventListener('change', function() {
            const filter = this.getAttribute('data-filter');
            list_filter_state[filter] = this.checked;
            
            // Save state to localStorage
            list_filter_save(list_filter_state);
            
            list_filter_apply();
        });
    }

    if (cssCheckbox) {
        cssCheckbox.addEventListener('change', function() {
            const filter = this.getAttribute('data-filter');
            list_filter_state[filter] = this.checked;
            
            // Save state to localStorage
            list_filter_save(list_filter_state);
            
            list_filter_apply();
        });
    }

    if (commentsCheckbox) {
        commentsCheckbox.addEventListener('change', function() {
            const filter = this.getAttribute('data-filter');
            list_filter_state[filter] = this.checked;
            
            // Save state to localStorage
            list_filter_save(list_filter_state);
            
            list_filter_apply();
        });
    }
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

let searchInput, searchClear;

// Simple search function for debugging
function search_apply_simple() {
    if (!searchInput) {
        console.log('searchInput not found');
        return;
    }
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    console.log('Search term:', searchTerm);
    
    const liElements = document.querySelectorAll('#list_content li');
    console.log('Found li elements:', liElements.length);
    
    let filteredCount = 0;
    liElements.forEach(li => {
        const fullText = li.getAttribute('data-fulltext');
        if (!fullText) return;
        
        // Check search filter only (ignore type filters for now)
        const passesSearch = searchTerm === '' || fullText.toLowerCase().includes(searchTerm);
        
        if (passesSearch) {
            li.classList.remove('search_hidden');
            filteredCount++;
        } else {
            li.classList.add('search_hidden');
        }
    });
    
    console.log('Items shown after search:', filteredCount);
    
    // Show/hide clear button
    if (searchClear) {
        if (searchTerm) {
            searchClear.classList.add('search_clear_visible');
            console.log('Clear button shown');
        } else {
            searchClear.classList.remove('search_clear_visible');
            console.log('Clear button hidden');
        }
    }
}

// Unified filtering function that coordinates all filters
function filters_apply_all() {
    console.log('=== UNIFIED FILTERING START ===');
    
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const liElements = document.querySelectorAll('#list_content li');
    
    console.log('Search term:', searchTerm);
    console.log('Filter state:', list_filter_state);
    console.log('Processing', liElements.length, 'items');
    
    let visibleCount = 0;
    liElements.forEach(li => {
        const dataType = li.getAttribute('data-type');
        const fullText = li.getAttribute('data-fulltext');
        if (!fullText) return;
        
        // Check search filter
        const passesSearch = searchTerm === '' || fullText.toLowerCase().includes(searchTerm);
        
        // Check type filter
        let passesTypeFilter = true;
        if (dataType === 'function') {
            passesTypeFilter = list_filter_state['function'];
        } else if (dataType === 'file' || dataType === 'folder') {
            passesTypeFilter = list_filter_state['files-folders'];
        } else if (dataType === 'css') {
            passesTypeFilter = list_filter_state['css'];
        } else if (dataType === 'comment') {
            passesTypeFilter = list_filter_state['comment'];
        }
        
        // Check time filter (don't hide if already hidden by time)
        const passesTimeFilter = !li.classList.contains('style_time_hidden');
        
        // Show item only if it passes all filters
        const shouldShow = passesSearch && passesTypeFilter && passesTimeFilter;
        
        if (shouldShow) {
            li.classList.remove('style_hidden', 'search_hidden');
            visibleCount++;
        } else {
            li.classList.add('style_hidden');
        }
    });
    
    console.log('Items visible after filtering:', visibleCount);
    
    // Show/hide clear button
    if (searchClear && searchInput) {
        if (searchTerm) {
            searchClear.classList.add('search_clear_visible');
            console.log('Clear button shown');
        } else {
            searchClear.classList.remove('search_clear_visible');
            console.log('Clear button hidden');
        }
    }
    
    // Recalculate duplicate coloring after filtering
    if (typeof list_duplicate_update === 'function') {
        list_duplicate_update();
    }
    
    console.log('=== UNIFIED FILTERING END ===');
}

// Search function (using simple version for debugging)
function search_apply() {
    search_apply_simple();
}

// Initialize search functionality
function search_init() {
    console.log('=== SEARCH INIT STARTING ===');
    
    searchInput = document.getElementById('search_input');
    searchClear = document.getElementById('search_clear');
    
    console.log('Search elements found:', {
        searchInput: !!searchInput,
        searchClear: !!searchClear,
        searchInputId: searchInput ? searchInput.id : 'not found',
        searchClearId: searchClear ? searchClear.id : 'not found'
    });
    
    // Test basic DOM querying
    const allInputs = document.querySelectorAll('input');
    const allButtons = document.querySelectorAll('button');
    console.log('All inputs on page:', allInputs.length);
    console.log('All buttons on page:', allButtons.length);
    
    // Add event listeners for search
    if (searchInput) {
        console.log('Adding event listeners to search input...');
        
        searchInput.addEventListener('input', function(e) {
            console.log('Search input event fired! Value:', e.target.value);
            search_apply();
        });
        
        // Handle Enter key
        searchInput.addEventListener('keydown', function(e) {
            console.log('Keydown in search input:', e.key);
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
        
        // Test that the input is working
        setTimeout(() => {
            console.log('Search input current value:', searchInput.value);
            console.log('Search input type:', searchInput.type);
        }, 1000);
    } else {
        console.error('Search input not found!');
    }

    if (searchClear) {
        console.log('Adding click listener to clear button...');
        searchClear.addEventListener('click', function() {
            console.log('Clear button clicked!');
            searchInput.value = '';
            search_apply();
            searchInput.focus();
        });
    } else {
        console.error('Search clear button not found!');
    }
    
    console.log('=== SEARCH INIT COMPLETE ===');
}

// Initialize functionality when DOM is ready
function list_init() {
    console.log('=== LIST INIT STARTING ===');
    console.log('Document ready state:', document.readyState);
    
    // Initialize filters first
    list_filter_init();
    
    // Then search (which depends on filters)
    search_init();
    
    // Apply initial unified filtering
    setTimeout(() => {
        console.log('Applying initial unified filtering...');
        filters_apply_all();
    }, 100);
    
    console.log('=== LIST INIT COMPLETE ===');
}

console.log('Script loading... Document ready state:', document.readyState);

if (document.readyState === 'loading') {
    console.log('Document still loading, adding DOMContentLoaded listener');
    document.addEventListener('DOMContentLoaded', list_init);
} else {
    console.log('Document already loaded, calling list_init immediately');
    list_init();
}

// Also try a backup initialization
setTimeout(() => {
    console.log('=== BACKUP INIT AFTER 2 SECONDS ===');
    if (!searchInput) {
        console.log('Search not initialized, trying again...');
        search_init();
    }
}, 2000); 