// SIMPLE WORKING FILTERS - NO FANCY STUFF
console.log('SIMPLE FILTERS LOADING!');

// Global state
let filterState = {
    search: '',
    scope: 'all',
    scopeCodenames: null,
    scopePositions: null,  // Maps codename to line position when file scope is active
    functions: true,
    files: true,
    css: true,
    comments: true,
    sortOrder: 'topdown',
    locationView: false  // Toggle for location-based view
};

// Load filter state from localStorage
function filters_load() {
    const saved = localStorage.getItem('simple_filter_state');
    if (saved) {
        try {
            const savedState = JSON.parse(saved);
            // Merge saved state with defaults
            filterState = { ...filterState, ...savedState };
            // Don't restore scopeCodenames or scopePositions as they're dynamic
            filterState.scopeCodenames = null;
            filterState.scopePositions = null;
            
            console.log('Loaded filter state:', filterState);
        } catch (e) {
            console.error('Error loading filter state:', e);
        }
    }
}

// Save filter state to localStorage
function filters_save() {
    // Don't save scopeCodenames or scopePositions as they're dynamic
    const stateToSave = { ...filterState };
    delete stateToSave.scopeCodenames;
    delete stateToSave.scopePositions;
    localStorage.setItem('simple_filter_state', JSON.stringify(stateToSave));
}

// Update UI to match current filter state
function filters_update_ui() {
    // Update search input
    const searchInput = document.getElementById('search_input');
    if (searchInput) searchInput.value = filterState.search;
    
    // Update scope dropdown
    const scopeFilter = document.getElementById('scope_filter');
    if (scopeFilter) scopeFilter.value = filterState.scope;
    
    // Update sort order dropdown
    const sortOrderSelect = document.getElementById('sort_order_select');
    if (sortOrderSelect) sortOrderSelect.value = filterState.sortOrder;
    
    // Update location checkbox
    const locationCheckbox = document.getElementById('location_view_checkbox');
    if (locationCheckbox) locationCheckbox.checked = filterState.locationView;
    
    // Update checkboxes
    const functionsBox = document.getElementById('filter_functions');
    if (functionsBox) functionsBox.checked = filterState.functions;
    
    const filesBox = document.getElementById('filter_files_folders');
    if (filesBox) filesBox.checked = filterState.files;
    
    const cssBox = document.getElementById('filter_css');
    if (cssBox) cssBox.checked = filterState.css;
    
    const commentsBox = document.getElementById('filter_comments');
    if (commentsBox) commentsBox.checked = filterState.comments;
}


// Apply all filters - now properly extracts scope on the fly
async function applyAllFilters() {
    console.log('APPLYING FILTERS:', filterState);
    
    let displayList;
    
    // If a specific scope is selected, extract codenames for that scope
    if (filterState.scope !== 'all') {
        const extractionResult = await extractCodenamesForScope(filterState.scope);
        displayList = extractionResult.items;
        filterState.scopePositions = extractionResult.positions; // Store positions for sorting
        
        if (!displayList || displayList.length === 0) {
            // Fallback to showing all items if extraction fails
            displayList = Array.from(document.querySelectorAll('#list_content li')).map(li => ({
                text: li.getAttribute('data-fulltext') || '',
                type: li.getAttribute('data-type') || '',
                created: li.getAttribute('data-created') || '',
                modified: li.getAttribute('data-modified') || '',
                element: li
            }));
            filterState.scopePositions = null;
        }
    } else {
        // Use all items from the index
        displayList = Array.from(document.querySelectorAll('#list_content li')).map(li => ({
            text: li.getAttribute('data-fulltext') || '',
            type: li.getAttribute('data-type') || '',
            created: li.getAttribute('data-created') || '',
            modified: li.getAttribute('data-modified') || '',
            element: li
        }));
        filterState.scopePositions = null; // No positions when showing all items
    }
    
    let visibleCount = 0;
    
    // First hide all items
    document.querySelectorAll('#list_content li').forEach(li => li.style.display = 'none');
    
    // Then show only items that match all filters
    displayList.forEach(item => {
        // Check search filter
        const matchesSearch = filterState.search === '' || 
            item.text.toLowerCase().includes(filterState.search.toLowerCase());
        
        // Check type filters
        let matchesType = false;
        if (item.type === 'function' && filterState.functions) matchesType = true;
        if ((item.type === 'file' || item.type === 'folder') && filterState.files) matchesType = true;
        if (item.type === 'css' && filterState.css) matchesType = true;
        if (item.type === 'comment' && filterState.comments) matchesType = true;
        
        // Check time filter (delegated to utl_time_filter_client.js)
        let matchesTime = true;
        if (item.element && item.element.classList.contains('style_time_hidden')) {
            matchesTime = false;
        }
        
        // Show item if it matches all filters
        if (matchesSearch && matchesType && matchesTime && item.element) {
            item.element.style.display = '';
            visibleCount++;
        }
    });
    
    console.log('VISIBLE ITEMS:', visibleCount);
    
    // Apply sort order
    applySortOrder();
    
    // Update clear button
    const clearBtn = document.getElementById('search_clear');
    if (clearBtn) {
        clearBtn.style.display = filterState.search ? 'flex' : 'none';
    }
    
    // If location view is active, rebuild it with filtered results
    if (filterState.locationView) {
        await buildLocationView();
    }
}

// Apply sort order to visible items
function applySortOrder() {
    const listContent = document.getElementById('list_content');
    if (!listContent) return;
    
    console.log('Applying sort order:', filterState.sortOrder);
    
    // Get all items - IMPORTANT: don't modify the live NodeList during iteration
    const allItems = Array.from(listContent.children);
    
    // Create a copy to sort without affecting DOM yet
    let sortedItems = [...allItems];
    
    if (filterState.sortOrder === 'alphabetical') {
        // Sort alphabetically
        sortedItems.sort((a, b) => {
            const textA = (a.getAttribute('data-fulltext') || '').toLowerCase();
            const textB = (b.getAttribute('data-fulltext') || '').toLowerCase();
            return textA.localeCompare(textB);
        });
        console.log('Sorted alphabetically');
        
    } else if (filterState.sortOrder === 'sequence') {
        // First restore original order
        sortedItems.sort((a, b) => {
            const indexA = parseInt(a.getAttribute('data-original-index') || '0');
            const indexB = parseInt(b.getAttribute('data-original-index') || '0');
            return indexA - indexB;
        });
        
        // Then mark duplicates for hiding
        const seenConcepts = new Set();
        sortedItems.forEach(item => {
            // Remove any previous sequence hiding
            item.removeAttribute('data-hidden-by-sequence');
            
            // Skip if already hidden by other filters
            if (item.classList.contains('style_hidden') || 
                item.classList.contains('style_time_hidden') ||
                item.classList.contains('search_hidden')) {
                return;
            }
            
            const text = item.getAttribute('data-fulltext') || '';
            const baseName = extractBaseName(text);
            
            if (seenConcepts.has(baseName)) {
                item.setAttribute('data-hidden-by-sequence', 'true');
                item.style.display = 'none';
            } else {
                seenConcepts.add(baseName);
                if (item.getAttribute('data-hidden-by-sequence')) {
                    item.removeAttribute('data-hidden-by-sequence');
                }
            }
        });
        console.log('Applied sequence filtering');
        
    } else {
        // Default: top-down (original order)
        // Check if we have file-specific positions to use
        if (filterState.scope !== 'all' && filterState.scope.includes('.') && filterState.scopePositions) {
            // Sort by line position within the file
            sortedItems.sort((a, b) => {
                const textA = (a.getAttribute('data-fulltext') || '').toLowerCase();
                const textB = (b.getAttribute('data-fulltext') || '').toLowerCase();
                const posA = filterState.scopePositions.get(textA) || 999999;
                const posB = filterState.scopePositions.get(textB) || 999999;
                
                // Sort by line position (lower line numbers first)
                if (posA !== posB) {
                    return posA - posB;
                }
                
                // Fallback to original index if positions are the same
                const indexA = parseInt(a.getAttribute('data-original-index') || '0');
                const indexB = parseInt(b.getAttribute('data-original-index') || '0');
                return indexA - indexB;
            });
            console.log('Sorted by file-specific line positions');
        } else {
            // Use global original order
            sortedItems.sort((a, b) => {
                const indexA = parseInt(a.getAttribute('data-original-index') || '0');
                const indexB = parseInt(b.getAttribute('data-original-index') || '0');
                return indexA - indexB;
            });
            console.log('Restored original order');
        }
        
        // Remove any sequence hiding
        sortedItems.forEach(item => {
            if (item.getAttribute('data-hidden-by-sequence') === 'true') {
                item.removeAttribute('data-hidden-by-sequence');
                // Don't automatically show - let other filters decide
            }
        });
    }
    
    // Clear container and re-add in new order
    listContent.innerHTML = '';
    sortedItems.forEach(item => listContent.appendChild(item));
    
    // Log some items for debugging
    const visibleItems = sortedItems.filter(i => i.style.display !== 'none');
    console.log('Sort complete. Visible items:', visibleItems.length);
    if (visibleItems.length > 0) {
        console.log('First visible:', visibleItems[0].getAttribute('data-fulltext'));
        console.log('Last visible:', visibleItems[visibleItems.length-1].getAttribute('data-fulltext'));
    }
}

// Extract base name for sequence sorting
function extractBaseName(text) {
    // For functions, files, etc., extract the base name/concept
    let baseName = text;
    
    // Remove file extensions
    baseName = baseName.replace(/\.[^.]*$/, '');
    
    // Smart extraction based on patterns
    const parts = baseName.split('_');
    
    // If it's a short name (1-2 parts), use the whole thing
    if (parts.length <= 2) {
        return baseName;
    }
    
    // Look for common patterns:
    // 1. Module pattern: "sync_server_init" -> "sync"
    // 2. Action pattern: "filters_apply_all" -> "filters"
    // 3. Component pattern: "list_client_init" -> "list"
    
    // Check if first part is a known module/component name
    const firstPart = parts[0];
    const secondPart = parts[1];
    
    // Common module/component prefixes that group related functions
    const moduleKeywords = ['sync', 'filter', 'list', 'outline', 'tree', 'nav', 
                           'time', 'scope', 'search', 'version', 'timestamp', 
                           'reload', 'file', 'prompt', 'function', 'index', 'web'];
    
    if (moduleKeywords.includes(firstPart)) {
        return firstPart;
    }
    
    // Check for action verbs as second part (indicating first part is the subject)
    const actionVerbs = ['get', 'set', 'update', 'save', 'load', 'apply', 
                        'init', 'create', 'delete', 'handle', 'process'];
    
    if (actionVerbs.includes(secondPart)) {
        return firstPart;
    }
    
    // For other patterns, use first two parts as the base concept
    return parts.slice(0, 2).join('_');
}

// Extract codenames for a specific scope (file, page, function, etc)
async function extractCodenamesForScope(scope) {
    console.log('Extracting codenames for scope:', scope);
    
    // If it's a file, parse it in real-time to extract referenced codenames
    if (scope.includes('.')) {
        const parseResult = await parseFileForCodenames(scope);
        if (parseResult && parseResult.codenames && parseResult.codenames.size > 0) {
            // Get all items from current index
            const allItems = Array.from(document.querySelectorAll('#list_content li'));
            const scopeItems = [];
            
            // Include the file itself
            allItems.forEach(li => {
                const text = li.getAttribute('data-fulltext') || '';
                if (text.toLowerCase() === scope.toLowerCase() || 
                    parseResult.codenames.has(text.toLowerCase())) {
                    scopeItems.push({
                        text: text,
                        type: li.getAttribute('data-type') || '',
                        created: li.getAttribute('data-created') || '',
                        modified: li.getAttribute('data-modified') || '',
                        element: li
                    });
                }
            });
            
            console.log(`Found ${scopeItems.length} items for file scope ${scope} via parsing`);
            return {
                items: scopeItems,
                positions: parseResult.positions // Pass through the line positions
            };
        }
    }
    
    // For non-file scopes, use prefix matching
    const allItems = Array.from(document.querySelectorAll('#list_content li'));
    const scopeItems = [];
    
    allItems.forEach(li => {
        const text = li.getAttribute('data-fulltext') || '';
        if (text.toLowerCase().startsWith(scope.toLowerCase())) {
            scopeItems.push({
                text: text,
                type: li.getAttribute('data-type') || '',
                created: li.getAttribute('data-created') || '',
                modified: li.getAttribute('data-modified') || '',
                element: li
            });
        }
    });
    
    console.log(`Found ${scopeItems.length} items for scope ${scope}`);
    return {
        items: scopeItems,
        positions: null // No positions for non-file scopes
    };
}

// Parse a file to extract all codenames referenced within it
async function parseFileForCodenames(filename) {
    try {
        console.log('Parsing file for codenames:', filename);
        
        // Use the dynamic file-content endpoint
        const filePath = `/file-content/${encodeURIComponent(filename)}`;
        
        // Fetch the file content
        const response = await fetch(filePath);
        if (!response.ok) {
            console.log('Failed to fetch file:', filename, response.status);
            return null;
        }
        
        const content = await response.text();
        const result = {
            codenames: new Set(),
            positions: new Map() // Maps codename to first line number where it appears
        };
        
        // Get all existing codenames from the index
        const allCodenames = new Set();
        document.querySelectorAll('#list_content li').forEach(li => {
            const text = li.getAttribute('data-fulltext');
            if (text) {
                allCodenames.add(text.toLowerCase());
            }
        });
        
        // Split content into lines for position tracking
        const lines = content.split('\n');
        
        // Parse content to find references to existing codenames
        allCodenames.forEach(codename => {
            const regex = new RegExp(`\\b${escapeRegex(codename)}\\b`, 'gi');
            
            // Check each line for the codename
            for (let i = 0; i < lines.length; i++) {
                if (regex.test(lines[i])) {
                    result.codenames.add(codename);
                    // Store the first occurrence line number (1-based)
                    if (!result.positions.has(codename)) {
                        result.positions.set(codename, i + 1);
                    }
                    break; // Found it, no need to check more lines
                }
                regex.lastIndex = 0; // Reset regex for next line
            }
        });
        
        console.log(`Extracted ${result.codenames.size} codename references from ${filename}`);
        return result;
        
    } catch (error) {
        console.error('Error parsing file for codenames:', error);
        return null;
    }
}

// Escape special regex characters
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build location view showing directory/file hierarchy with codenames
async function buildLocationView() {
    console.log('Building location view...');
    
    // Get all visible items after filtering
    const visibleItems = Array.from(document.querySelectorAll('#list_content li'))
        .filter(li => li.style.display !== 'none');
    
    if (visibleItems.length === 0) {
        const locationContent = document.getElementById('location_content');
        locationContent.innerHTML = '<div style="color: var(--gray); padding: 20px;">No items to display</div>';
        return;
    }
    
    // Show loading message
    const locationContent = document.getElementById('location_content');
    locationContent.innerHTML = '<div style="color: var(--gray); padding: 20px;">Building location view...</div>';
    
    // Group codenames by their containing files with type info
    const fileToCodenames = new Map();
    
    // Process all files first to build cache
    const fileItems = Array.from(document.querySelectorAll('#list_content li[data-type="file"]'));
    const relevantFiles = fileItems.filter(fi => {
        const filename = fi.getAttribute('data-fulltext') || '';
        return filename.endsWith('.js') || filename.endsWith('.html') || filename.endsWith('.txt');
    });
    
    // Parse files in parallel (but limit concurrency)
    const batchSize = 5;
    for (let i = 0; i < relevantFiles.length; i += batchSize) {
        const batch = relevantFiles.slice(i, i + batchSize);
        await Promise.all(batch.map(async (fileItem) => {
            const filename = fileItem.getAttribute('data-fulltext') || '';
            if (!fileParseCache.has(filename)) {
                const parseResult = await parseFileForCodenames(filename);
                if (parseResult) {
                    fileParseCache.set(filename, parseResult);
                }
            }
        }));
    }
    
    // Now match visible codenames to files
    for (const item of visibleItems) {
        const codename = item.getAttribute('data-fulltext') || '';
        const type = item.getAttribute('data-type') || '';
        
        // Skip if it's a file or folder itself
        if (type === 'file' || type === 'folder') {
            continue;
        }
        
        // Find which files contain this codename (using cache)
        const containingFiles = await findFilesContainingCodename(codename);
        
        for (const file of containingFiles) {
            if (!fileToCodenames.has(file)) {
                fileToCodenames.set(file, new Map());
            }
            // Store both codename and its type
            fileToCodenames.get(file).set(codename, type);
        }
    }
    
    // Sort files by their path (directory hierarchy)
    const sortedFiles = Array.from(fileToCodenames.keys()).sort((a, b) => {
        // Split paths into segments
        const partsA = a.split('/');
        const partsB = b.split('/');
        
        // Compare each segment
        for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
            // If we're at the last segment of either path, directories come before files
            const isLastA = i === partsA.length - 1;
            const isLastB = i === partsB.length - 1;
            
            if (isLastA && !isLastB) return 1; // a is a file in current dir, b goes deeper
            if (!isLastA && isLastB) return -1; // b is a file in current dir, a goes deeper
            
            // Normal alphabetical comparison
            const cmp = partsA[i].localeCompare(partsB[i]);
            if (cmp !== 0) return cmp;
        }
        
        // If all segments match, shorter path comes first
        return partsA.length - partsB.length;
    });
    
    // Build the HTML
    let html = '';
    for (const file of sortedFiles) {
        const codenameMap = fileToCodenames.get(file);
        const sortedCodenames = Array.from(codenameMap.keys()).sort();
        
        html += `<div class="location_item">`;
        html += `<span class="location_path">${file}</span>`;
        html += `<span class="location_codenames">`;
        
        // Add each codename with its type-specific color
        sortedCodenames.forEach((codename, index) => {
            const type = codenameMap.get(codename);
            html += `<span class="location_codename type-${type}">${codename}</span>`;
        });
        
        html += `</span>`;
        html += `</div>`;
    }
    
    const locationContent = document.getElementById('location_content');
    locationContent.innerHTML = html || '<div style="color: var(--gray); padding: 20px;">No codenames found in files</div>';
}

// Cache for file parsing results to avoid repeated requests
const fileParseCache = new Map();

// Find files that contain a specific codename
async function findFilesContainingCodename(codename) {
    // For now, we'll use a simple approach - check common file locations
    // In a real implementation, this would search through actual files
    const files = [];
    
    // Get all file items from the index
    const fileItems = Array.from(document.querySelectorAll('#list_content li[data-type="file"]'));
    
    for (const fileItem of fileItems) {
        const filename = fileItem.getAttribute('data-fulltext') || '';
        
        // Only check code files
        if (filename.endsWith('.js') || filename.endsWith('.html') || filename.endsWith('.txt')) {
            // Check cache first
            let parseResult = fileParseCache.get(filename);
            
            if (!parseResult) {
                // Try to parse the file to see if it contains the codename
                parseResult = await parseFileForCodenames(filename);
                if (parseResult) {
                    fileParseCache.set(filename, parseResult);
                }
            }
            
            if (parseResult && parseResult.codenames.has(codename.toLowerCase())) {
                // Construct the full path based on file type and known locations
                const possiblePaths = [];
                
                if (filename.endsWith('.js')) {
                    possiblePaths.push(
                        `meta/code/layout/${filename}`,
                        `meta/code/sync/${filename}`,
                        `meta/code/extract/${filename}`
                    );
                } else if (filename.endsWith('.html')) {
                    possiblePaths.push(
                        `meta/html/tool/${filename}`,
                        `meta/html/prompt/${filename}`,
                        `meta/html/${filename}`
                    );
                } else if (filename.endsWith('.txt')) {
                    possiblePaths.push(
                        `meta/src/tool/${filename}`,
                        `meta/src/prompt/${filename}`,
                        `meta/rule/${filename}`,
                        `meta/${filename}`
                    );
                }
                
                // For now, just use the first possible path
                // In a real implementation, we'd check which path actually exists
                if (possiblePaths.length > 0) {
                    files.push(possiblePaths[0]);
                }
            }
        }
    }
    
    return files;
}


// Setup when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('SETTING UP SIMPLE FILTERS!');
    
    // CRITICAL: Store original order before any filtering/sorting happens
    const listContent = document.getElementById('list_content');
    if (listContent && !listContent.hasAttribute('data-original-order-stored')) {
        const allItems = Array.from(listContent.children);
        allItems.forEach((item, index) => {
            item.setAttribute('data-original-index', index);
        });
        listContent.setAttribute('data-original-order-stored', 'true');
        console.log('Stored original order for', allItems.length, 'items on page load');
    }
    
    // Load saved filter state
    filters_load();
    
    // Search input
    const searchInput = document.getElementById('search_input');
    if (searchInput) {
        console.log('Found search input!');
        searchInput.addEventListener('input', function() {
            console.log('SEARCH INPUT CHANGED:', this.value);
            filterState.search = this.value;
            filters_save();
            applyAllFilters();
        });
    }
    
    // Scope filter
    const scopeFilter = document.getElementById('scope_filter');
    if (scopeFilter) {
        console.log('Found scope filter!');
        scopeFilter.addEventListener('change', async function() {
            console.log('SCOPE FILTER CHANGED:', this.value);
            filterState.scope = this.value;
            filters_save();
            
            // Apply all filters with the new scope
            await applyAllFilters();
        });
    }
    
    // Sort order dropdown
    const sortOrderSelect = document.getElementById('sort_order_select');
    if (sortOrderSelect) {
        console.log('Found sort order select!');
        sortOrderSelect.addEventListener('change', async function() {
            console.log('SORT ORDER CHANGED:', this.value);
            filterState.sortOrder = this.value;
            filters_save();
            await applyAllFilters();
        });
    }
    
    // Location view checkbox
    const locationCheckbox = document.getElementById('location_view_checkbox');
    if (locationCheckbox) {
        console.log('Found location checkbox!');
        locationCheckbox.addEventListener('change', async function() {
            console.log('LOCATION VIEW CHANGED:', this.checked);
            filterState.locationView = this.checked;
            filters_save();
            
            // Toggle between list and location view
            const listContent = document.getElementById('list_content');
            const locationContent = document.getElementById('location_content');
            
            if (filterState.locationView) {
                listContent.style.display = 'none';
                locationContent.style.display = 'block';
                await buildLocationView();
            } else {
                listContent.style.display = '';
                locationContent.style.display = 'none';
            }
        });
    }
    
    // Clear button
    const clearBtn = document.getElementById('search_clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            console.log('CLEAR BUTTON CLICKED!');
            filterState.search = '';
            if (searchInput) searchInput.value = '';
            applyAllFilters();
        });
    }
    
    // Checkboxes
    const functionsBox = document.getElementById('filter_functions');
    if (functionsBox) {
        console.log('Found functions checkbox!');
        functionsBox.addEventListener('change', function() {
            console.log('FUNCTIONS CHECKBOX CHANGED:', this.checked);
            filterState.functions = this.checked;
            filters_save();
            applyAllFilters();
        });
    }
    
    const filesBox = document.getElementById('filter_files_folders');
    if (filesBox) {
        console.log('Found files checkbox!');
        filesBox.addEventListener('change', function() {
            console.log('FILES CHECKBOX CHANGED:', this.checked);
            filterState.files = this.checked;
            filters_save();
            applyAllFilters();
        });
    }
    
    const cssBox = document.getElementById('filter_css');
    if (cssBox) {
        console.log('Found CSS checkbox!');
        cssBox.addEventListener('change', function() {
            console.log('CSS CHECKBOX CHANGED:', this.checked);
            filterState.css = this.checked;
            filters_save();
            applyAllFilters();
        });
    }
    
    const commentsBox = document.getElementById('filter_comments');
    if (commentsBox) {
        console.log('Found comments checkbox!');
        commentsBox.addEventListener('change', function() {
            console.log('COMMENTS CHECKBOX CHANGED:', this.checked);
            filterState.comments = this.checked;
            filters_save();
            applyAllFilters();
        });
    }
    
    // Update UI to match loaded state
    filters_update_ui();
    
    // Apply filters with loaded state
    applyAllFilters();
    
    // Check if location view should be active
    if (filterState.locationView) {
        const listContent = document.getElementById('list_content');
        const locationContent = document.getElementById('location_content');
        if (listContent && locationContent) {
            listContent.style.display = 'none';
            locationContent.style.display = 'block';
            buildLocationView();
        }
    }
    
    console.log('SIMPLE FILTERS SETUP COMPLETE!');
});

console.log('SIMPLE FILTERS SCRIPT LOADED!');