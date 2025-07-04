const http         = require('http');
const fs           = require('fs');
const path         = require('path');
const WebSocket    = require('ws');
const html_extract = require('./html_extract');
const { list_html_generate } = require('../layout/list_template');
const { outline_html_generate } = require('../layout/outline_template');
const { tree_html_generate } = require('../layout/tree_template');
const { big_html_generate } = require('../layout/big_template');
const { timestamp_get_or_create, timestamp_update_modified } = require('../layout/utl_timestamp_manager');
const { version_current, version_current_with_name, version_initialize, version_increment } = require('./version_manager');


const storage_file_config = {};

// Track modification times for auto-reload
const reload_modification_get = {};

// Flag to prevent reload loops during sync
let sync_in_progress = false;

// Auto-reload mode tracking
let reload_mode_auto = {
    active: false,
    activated_at: 0,
    expires_at: 0
};

// WebSocket connections for real-time updates
let websocket_connections = new Set();

// WebSocket utility functions
function sync_message_broadcast(message) {
    console.log(`Broadcasting to ${websocket_connections.size} clients:`, message);
    
    websocket_connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    });
}

// Activate auto-reload mode for 1 hour
function reload_auto_activate() {
    const now = Date.now();
    const one_hour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    reload_mode_auto.active = true;
    reload_mode_auto.activated_at = now;
    reload_mode_auto.expires_at = now + one_hour;
    
    console.log(`Auto-reload mode activated until ${new Date(reload_mode_auto.expires_at).toLocaleTimeString()}`);
    
    // Broadcast activation to all clients
    sync_message_broadcast({
        type: 'auto_reload_activated',
        expires_at: reload_mode_auto.expires_at,
        interval: 10000 // Reload every 10 seconds
    });
    
    // Set timeout to deactivate after 1 hour
    setTimeout(() => {
        reload_mode_auto.active = false;
        console.log('Auto-reload mode deactivated');
        
        // Broadcast deactivation to all clients
        sync_message_broadcast({
            type: 'auto_reload_deactivated'
        });
    }, one_hour);
}

function sync_connection_remove(ws) {
    websocket_connections.delete(ws);
    console.log(`WebSocket client disconnected. Remaining: ${websocket_connections.size}`);
}

// Initialize modification times
// Auto-update index when JavaScript files change  
function index_auto_update() {
    const { spawn } = require('child_process');
    const indexExtractPath = path.join(__dirname, '../extract/index_extract.js');
    
    // Only run if the extractor exists
    if (!fs.existsSync(indexExtractPath)) {
        console.log('Index extractor not found, skipping auto-update');
        return;
    }
    
    console.log('Auto-updating index...');
    const child = spawn('node', [indexExtractPath], { 
        stdio: 'pipe',  // Capture output instead of inheriting
        cwd: path.dirname(indexExtractPath)
    });
    
    // Capture output
    let output = '';
    child.stdout.on('data', (data) => {
        output += data.toString();
    });
    
    child.stderr.on('data', (data) => {
        console.error('Index update error:', data.toString());
    });
    
    child.on('close', (code) => {
        if (code === 0) {
            console.log('Index auto-update completed successfully');
            console.log('Index stats:', output.split('\n').find(line => line.includes('Extracted')) || 'Updated');
            
            // Trigger HTML regeneration for index.txt
            const indexTxtPath = path.join(__dirname, '../../src/tool/index.txt');
            if (fs.existsSync(indexTxtPath)) {
                // Touch the file to trigger regeneration
                fs.utimesSync(indexTxtPath, new Date(), new Date());
                console.log('Index HTML regeneration triggered');
            }
        } else {
            console.error('Index auto-update failed with code:', code);
        }
    });
}

function sync_timestamps_initialize() {
    Object.keys(storage_file_config).forEach(key => {
        try {
            const stats = fs.statSync(storage_file_config[key].txt_path);
            reload_modification_get[key] = stats.mtimeMs;
        } catch (err) {
            reload_modification_get[key] = Date.now();
        }
    });
}

// Setup file watcher for a config entry
function file_watcher_setup(key) {
    const config = storage_file_config[key];
    
    // Initialize modification time if not already set
    if (!reload_modification_get[key]) {
        try {
            const stats = fs.statSync(config.txt_path);
            reload_modification_get[key] = stats.mtimeMs;
        } catch (err) {
            reload_modification_get[key] = Date.now();
        }
    }
    
    // Generate initial HTML
    sync_html_build(key);
    
    // Start watching the file
    fs.watch(config.txt_path, (eventType) => {
        if (eventType === 'change' && !sync_in_progress) {
            reload_modification_get[key] = Date.now();
            sync_html_build(key);
            console.log(`File changed: ${key}, new timestamp: ${reload_modification_get[key]}`);
            
            // Activate auto-reload mode
            reload_auto_activate();
            
            // Broadcast file change to all WebSocket clients
            sync_message_broadcast({
                type: 'file_changed',
                file: key,
                timestamp: reload_modification_get[key]
            });
        }
    });
    console.log(`Watching ${key} txt file`);
}

// Detect format type based on content
function prompt_type_detect(lines) {
    // Check if it has outline numbers (with tabs for indentation)
    const hasOutlineNumbers = lines.some(line => /^\t*\d+\./.test(line) || /^\t*[a-z]\./.test(line));
    
    // Check if it's an index file with tab-separated columns
    // Look for lines with text, then tab, then more text (not just leading tabs)
    const hasTabSeparatedColumns = lines.some(line => {
        const trimmed = line.trim();
        if (!trimmed) return false;
        // Check if there's a tab after some non-whitespace content
        const match = line.match(/^[^\t]+\t/);
        return match !== null;
    });
    
    // Debug log for 02_functions.txt
    if (lines.length > 0 && lines[0].includes('sync_server.js')) {
        console.log('Detecting format for functions file:');
        console.log('  hasTabSeparatedColumns:', hasTabSeparatedColumns);
        console.log('  hasOutlineNumbers:', hasOutlineNumbers);
        console.log('  First few lines:', lines.slice(0, 5));
    }
    
    if (hasOutlineNumbers) {
        return 'outline';
    } else if (hasTabSeparatedColumns) {
        return 'index';
    } else if (lines.some(line => line.trim())) {
        return 'index'; // Default for non-empty files without outline numbers
    }
    return 'text'; // Default format
}

// Scan prompt folder for txt files
function prompt_folder_scan() {
    const promptDir = path.join(__dirname, '../../src/prompt');
    
    // Check if directory exists
    if (!fs.existsSync(promptDir)) {
        console.log('Prompt directory not found, skipping...');
        return;
    }
    
    const files = fs.readdirSync(promptDir);
    
    files.forEach(file => {
        if (file.endsWith('.txt')) {
            const baseName = path.basename(file, '.txt');
            
            // Special handling for specific files
            let key;
            if (baseName === 'start') {
                key = 'start_file';
            } else if (baseName === '01_start') {
                key = 'start_file';
            } else if (baseName === 'function') {
                key = 'functions_file';
            } else if (baseName.endsWith('_prompt')) {
                // Legacy support for files that still have _prompt suffix
                key = baseName.replace('_prompt', '');
                if (key === 'start') {
                    key = 'start_file';
                } else if (key === 'function') {
                    key = 'functions_file';
                }
            } else if (baseName.startsWith('00_')) {
                key = baseName.replace(/^\d+_/, '').replace(/-/g, '_'); // Remove number prefix and convert dashes
            } else if (baseName.startsWith('02_')) {
                key = 'functions_file';
            } else {
                key = baseName.replace(/^\d+_/, '').replace(/-/g, '_'); // Remove number prefix and convert dashes
            }
            
            // Skip if already in config
            if (storage_file_config[key]) return;
            
            // Determine the HTML filename
            let htmlBaseName = baseName;
            // Remove _prompt suffix if it exists (for legacy files)
            if (baseName.endsWith('_prompt')) {
                htmlBaseName = baseName.replace('_prompt', '');
            }
            
            // Determine the HTML path based on the file location
            let htmlPath;
            if (baseName.startsWith('00_') || baseName.startsWith('01_') || baseName.startsWith('02_')) {
                // Files with number prefixes go to prompt folder
                htmlPath = path.join(__dirname, '../../html/prompt', htmlBaseName + '.html');
            } else {
                // Other files go to html root
                htmlPath = path.join(__dirname, '../../html', htmlBaseName + '.html');
            }
            
            // Add to storage_file_config
            storage_file_config[key] = {
                txt_path: path.join(promptDir, file),
                html_path: htmlPath
            };
            
            // Setup file watcher
            file_watcher_setup(key);
        }
    });
}

// Scan meta/tool folder for txt files
function tool_folder_scan() {
    const toolDir = path.join(__dirname, '../../src/tool');
    if (!fs.existsSync(toolDir)) {
        console.log('Tool directory not found, skipping...');
        return;
    }
    const files = fs.readdirSync(toolDir);
    files.forEach(file => {
        if (file.endsWith('.txt')) {
            const baseName = path.basename(file, '.txt');
            let key;
            if (baseName === 'function') {
                key = 'functions_file';
            } else if (baseName === 'index') {
                key = 'index';
            } else if (baseName === 'web') {
                key = 'web';
            } else {
                key = baseName.replace(/-/g, '_');
            }
            if (storage_file_config[key]) return;
            storage_file_config[key] = {
                txt_path: path.join(toolDir, file),
                html_path: path.join(__dirname, '../../html/tool', baseName + '.html')
            };
            file_watcher_setup(key);
        }
    });
}

// Constant for indentation
const INDENT_PX = 60;  // Pixels per indentation level
const OUTLINE_GAP_PX = 4;  // Gap between outline number and text

function prompt_txt_read(txt_path) {
    const content = fs.readFileSync(txt_path, 'utf8');
    const lines = content.split('\n');
    return lines;
}

function sync_html_build(config_key) {
    const config = storage_file_config[config_key];
    const lines = prompt_txt_read(config.txt_path);
    
    // Detect format type
    const formatType = prompt_type_detect(lines);
    
    // Get current version
    const current_version = version_current();
    
    // Debug log for functions_file
    if (config_key === 'functions_file') {
        console.log(`Processing ${config_key}:`);
        console.log('  Format type:', formatType);
        console.log('  Number of lines:', lines.length);
        console.log('  Config key match:', config_key === 'functions_file');
    }
    
    let html_content = '';
    
    // Check format type first, then specific config keys
    if (config_key === 'tree' || config_key === 'tree_file') {
        // Special handling for tree page - use tree template
        html_content = tree_html_generate('', config_key, reload_modification_get[config_key], current_version);
    } else if (formatType === 'outline' || config_key === 'start_file' || config_key === 'functions_file' || config_key === 'function') {
        // Track defined functions for graying out references
        const definedFunctions = new Set();
        
        // Generate div elements with indentation for outline format
        const div_elements = lines.map((line, index) => {
            // Skip empty lines
            if (line.trim() === '') return null;
            
            // Count leading tabs
            const tab_count       = line.match(/^\t*/)[0].length;
            const margin_left     = tab_count * INDENT_PX;  // Use constant
            
            // Remove tabs and check for outline number
            const content_after_tabs = line.replace(/^\t*/, '');
            const outline_match      = content_after_tabs.match(/^(\d+\.|[a-z]\.|[A-Z]\.)\s+(.*)$/);
            
            if (outline_match) {
                // Separate outline number from text
                const outline_number = outline_match[1];
                const text_content   = outline_match[2];
                
                // Check if this is a function file
                const isFunctionFile = config_key === 'function' || config_key === 'functions_file';
                
                // For function files, extract the function name and check if it's a reference
                let hasReference = false;
                let functionName = '';
                
                if (isFunctionFile) {
                    // Extract function name (remove event types, element selectors, etc.)
                    functionName = text_content
                        .replace(/\([^)]*\)/g, '') // Remove parentheses content
                        .replace(/^getElementById\('.*?'\)\./, '') // Remove getElementById
                        .replace(/^[a-zA-Z]+\./, '') // Remove object prefixes
                        .replace(/addEventListener$/, '') // Remove addEventListener suffix
                        .trim();
                    
                    // Check if this function has been defined before
                    if (definedFunctions.has(functionName)) {
                        hasReference = true;
                    } else if (functionName) {
                        // Add any function name to the set, not just top-level
                        definedFunctions.add(functionName);
                    }
                    
                    // Also check for explicit [see X] references
                    if (text_content.includes('[see ')) {
                        hasReference = true;
                    }
                }
                
                // Set top-level items (tab_count === 0) as collapsed by default
                const defaultCollapsed = tab_count === 0 ? 'true' : 'false';
                
                // For function files with repeated functions, check if the outline ends with ">"
                let isRepeatedFunction = false;
                let displayOutlineNumber = outline_number;
                if (isFunctionFile && outline_number.endsWith('>')) {
                    isRepeatedFunction = true;
                    hasReference = true; // Repeated functions are shown in gray
                    displayOutlineNumber = outline_number.replace('>', '.'); // Will be converted to > by JavaScript
                }
                
                // Apply gray style to text if it has a reference
                const textStyle = hasReference ? ' style="color: var(--gray);"' : '';
                
                // Set data-collapsed and data-repeated attributes
                const collapsedAttr = isRepeatedFunction ? 'true' : defaultCollapsed;
                const repeatedAttr = isRepeatedFunction ? ' data-repeated="true"' : '';
                
                return `        <div style="margin-left: ${margin_left}px; display: flex;" data-indent="${tab_count}" data-collapsed="${collapsedAttr}"${repeatedAttr}>
            <span class="outline_line_number" style="min-width: 30px; flex-shrink: 0; cursor: pointer; user-select: none; margin-right: ${OUTLINE_GAP_PX}px; text-align: right;" data-original="${displayOutlineNumber}">${displayOutlineNumber}</span>
            <span class="list_edit_text"${textStyle}>${text_content}</span>
        </div>`;
            } else {
                // No outline number, just regular text
                // Check if this is the YOU ARE HERE line
                const isYouAreHere = content_after_tabs.includes('YOU ARE HERE');
                const textStyle = isYouAreHere ? ' style="color: var(--green); font-weight: bold;"' : '';
                return `        <div style="margin-left: ${margin_left}px" class="list_edit_text" data-indent="${tab_count}"${textStyle}>${content_after_tabs}</div>`;
            }
        })
        .filter(Boolean)  // Filter out null values (empty lines)
        .join('\n');
        
        html_content = outline_html_generate(div_elements, config_key, reload_modification_get[config_key], current_version);
    } else if (config_key === 'big') {
        // Special handling for big page - function hierarchy viewer
        const content = lines.join('\n');
        const version_info = version_current_with_name();
        html_content = big_html_generate(content, config.txt_path, reload_modification_get[config_key], version_info.full_display);
    } else if (formatType === 'index' || config_key === 'index' || config_key.startsWith('index_')) {
        // Generate li elements for each line with gray coloring for duplicates
        let previousTerm = '';
        let maxFirstColumnLength = 0;
        
        // First pass: find the longest first column for alignment
        lines.forEach(line => {
            if (line.trim()) {
                const parts = line.split('\t');
                if (parts[0] && parts[0].length > maxFirstColumnLength) {
                    maxFirstColumnLength = parts[0].length;
                }
            }
        });
        
        // Extract codenames for scope dropdown
        const codenames = lines
            .map(line => line.trim() ? line.split('\t')[0].trim() : null)
            .filter(Boolean);
        
        const li_elements = lines
            .map((line, index) => {
                if (!line.trim()) return null;
                
                // Handle tab-separated format: codename[tab]css_classes (ignore second column now)
                const parts = line.split('\t');
                const currentTerm = parts[0].trim();
                
                // For gray coloring, compare with previous line by terms/words
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
                }
                
                previousTerm = currentTerm;
                
                // Determine type and add indicators
                let typeIndicator = '';
                let dataType = '';
                
                // Check if it's a comment entry (starts with __)
                if (currentTerm.startsWith('__')) {
                    // It's a comment - add # indicator
                    typeIndicator = '<span style="color: var(--gray);">#</span>';
                    dataType = 'comment';
                    // For comments, show the full text including the description
                    displayContent = currentTerm;
                } else {
                    // Check if it's a CSS class entry (using same logic as extract_css_classes.js)
                    const css_class_name_is = (name) => {
                        // CSS class names typically contain hyphens or are known CSS classes
                        if (name.includes('-')) return true;
                        if (name.includes('_') && (name.includes('part') || name.includes('btn') || 
                            name.includes('control') || name.includes('filter'))) return true;
                        const knownCssClasses = ['style_active', 'style_hidden', 'index_editing_mode', 'style_inactive', 'duplicate'];
                        if (knownCssClasses.includes(name)) return true;
                        return false;
                    };
                    
                    if (css_class_name_is(currentTerm)) {
                        // It's a CSS class - add > indicator
                        typeIndicator = '<span style="color: var(--gray);">></span>';
                        displayContent += typeIndicator;
                        dataType = 'css';
                    } else {
                    // Check if it's a folder name (no extension and exists as directory)
                    // Common folder names in the project
                    const commonFolders = ['app', 'meta', 'prompt', 'rule', 'tool', 'html', 'code', 'js'];
                    const isFolder = commonFolders.includes(currentTerm);
                    
                    // Check if it's a file (has extension)
                    const hasExtension = currentTerm.includes('.') && 
                                        !currentTerm.endsWith('.') && 
                                        currentTerm.lastIndexOf('.') > 0;
                    
                    if (isFolder && !hasExtension) {
                        // It's a folder - add gray slash
                        typeIndicator = '<span style="color: var(--gray);">/</span>';
                        displayContent += typeIndicator;
                        dataType = 'folder';
                    } else if (hasExtension) {
                        // It's a file - make extension gray
                        const lastDotIndex = currentTerm.lastIndexOf('.');
                        const baseName = currentTerm.substring(0, lastDotIndex);
                        const extension = currentTerm.substring(lastDotIndex);
                        dataType = 'file';
                        
                        // Rebuild displayContent with gray extension
                        if (displayContent.includes('list_term_duplicate')) {
                            // Handle case where term was already split for duplicate coloring
                            // Extract the spans and update the unique part
                            const regex = /<span class="list_term_unique">([^<]+)<\/span>/;
                            displayContent = displayContent.replace(regex, (match, uniquePart) => {
                                const uniqueDotIndex = uniquePart.lastIndexOf('.');
                                if (uniqueDotIndex > 0) {
                                    const uniqueBase = uniquePart.substring(0, uniqueDotIndex);
                                    const uniqueExt = uniquePart.substring(uniqueDotIndex);
                                    return `<span class="list_term_unique">${uniqueBase}</span><span style="color: var(--gray);">${uniqueExt}</span>`;
                                }
                                return match;
                            });
                        } else {
                            displayContent = baseName + `<span style="color: var(--gray);">${extension}</span>`;
                        }
                    } else {
                        // It's a function - add gray parentheses
                        typeIndicator = '<span style="color: var(--gray);">()</span>';
                        displayContent += typeIndicator;
                        dataType = 'function';
                    }
                    }
                }
                
                // Add type indicator for comments
                if (dataType === 'comment') {
                    displayContent += typeIndicator;
                }
                
                // Get timestamps for this entry
                const timestamps = timestamp_get_or_create(currentTerm);
                
                return `        <li data-fulltext="${currentTerm}" data-original="" data-type="${dataType}" data-created="${timestamps.created}" data-modified="${timestamps.modified}">${displayContent}</li>`;
            })
            .filter(Boolean)
            .join('\n');
        
        html_content = list_html_generate(li_elements, config_key, reload_modification_get[config_key], current_version, codenames);
    }
    
    fs.writeFileSync(config.html_path, html_content);
}

// Sync edited content back to txt file
function sync_txt_save(file_name, line_number, new_text) {
    console.log(`Syncing to txt: ${file_name}, line ${line_number}, text: "${new_text}"`);
    
    if (!storage_file_config[file_name]) {
        console.error(`Unknown file: ${file_name}`);
        return false;
    }
    
    try {
        const config = storage_file_config[file_name];
        const lines = prompt_txt_read(config.txt_path);
        
        // For index files, we need to map the visible line number to actual line in txt
        // (accounting for empty lines that were filtered out)
        if (file_name === 'index' || file_name.startsWith('index_')) {
            let visibleIndex = 0;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].trim()) {
                    if (visibleIndex === line_number) {
                        // Preserve the CSS classes in second column
                        const parts = lines[i].split('\t');
                        if (parts.length > 1) {
                            lines[i] = new_text + '\t' + parts[1];
                        } else {
                            lines[i] = new_text;
                        }
                        break;
                    }
                    visibleIndex++;
                }
            }
        } else {
            // For start_file, line numbers need to account for filtered empty lines
            if (file_name === 'start_file') {
                let visibleIndex = 0;
                for (let i = 0; i < lines.length; i++) {
                    // Skip empty lines just like in HTML generation
                    if (lines[i].trim() === '') continue;
                    
                    if (visibleIndex === line_number) {
                        // Preserve existing indentation (tabs)
                        const original_line = lines[i];
                        const tab_match     = original_line.match(/^\t*/);
                        const tabs          = tab_match ? tab_match[0] : '';
                        
                        // For lines with outline numbers, reconstruct the full line
                        const outline_match = original_line.match(/^\t*(\d+\.|[a-z]\.|[A-Z]\.)\s+/);
                        if (outline_match) {
                            lines[i] = tabs + outline_match[1] + ' ' + new_text;
                        } else {
                            lines[i] = tabs + new_text;
                        }
                        break;
                    }
                    visibleIndex++;
                }
            } else {
                // For other files, line numbers map directly
                if (line_number >= 0 && line_number < lines.length) {
                    // Preserve existing indentation (tabs)
                    const original_line = lines[line_number];
                    const tab_match     = original_line.match(/^\t*/);
                    const tabs          = tab_match ? tab_match[0] : '';
                    
                    // For lines with outline numbers, reconstruct the full line
                    const outline_match = original_line.match(/^\t*(\d+\.|[a-z]\.|[A-Z]\.)\s+/);
                    if (outline_match) {
                        lines[line_number] = tabs + outline_match[1] + ' ' + new_text;
                    } else {
                        lines[line_number] = tabs + new_text;
                    }
                }
            }
        }
        
        // Write back to file
        sync_in_progress = true;
        fs.writeFileSync(config.txt_path, lines.join('\n'));
        console.log(`Successfully synced to ${config.txt_path}`);
        
        // Increment version after successful sync
        const new_version = version_increment('patch', `Updated ${file_name}`, file_name, new_text);
        console.log(`Version incremented to ${new_version} after sync`);
        
        // Reset flag after a short delay to ensure file watcher sees it
        setTimeout(() => {
            sync_in_progress = false;
        }, 100);
        
        return true;
    } catch (err) {
        console.error(`Sync error for ${file_name}:`, err);
        return false;
    }
}

const server = http.createServer((req, res) => {
    // Add CORS headers to all responses
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (req.method === 'GET') {
        // Check for /check/ requests
        const checkMatch = req.url.match(/^\/check\/(.+)$/);
        if (checkMatch) {
            const filename = checkMatch[1];
            
            // Extract config key from filename
            // For example: "start_file.html" -> "start_file"
            const configKey = filename.replace('.html', '');
            
            if (configKey && reload_modification_get[configKey]) {
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ last_modified: reload_modification_get[configKey] }));
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not found');
            }
        } else {
            // Check for HTML file requests using actual filenames
            let config_to_serve = null;
            let config_key_found = null;
            
            for (const [key, config] of Object.entries(storage_file_config)) {
                // Get the relative HTML path from the html directory
                const htmlRelativePath = path.relative(path.join(__dirname, '../../html'), config.html_path);
                const requestPath = req.url.substring(1); // Remove leading /
                const baseName = path.basename(config.html_path);
                
                // Check both the full relative path and just the basename for backwards compatibility
                if (requestPath === htmlRelativePath || req.url === '/' + baseName) {
                    config_to_serve = config;
                    config_key_found = key;
                    break;
                }
            }
            
            if (config_to_serve) {
                // Serve the HTML file
                fs.readFile(config_to_serve.html_path, 'utf8', (err, data) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Server error');
                    } else {
                        res.writeHead(200, { 
                            'Content-Type': 'text/html',
                            'Access-Control-Allow-Origin': '*'
                        });
                        res.end(data);
                    }
                });
            } else if (req.url.match(/^\/js\/.+\.js$/)) {
                // Serve JavaScript files
                const jsFilename = req.url.replace('/js/', '');
                console.log('Requested JS file:', jsFilename);
                
                // Try multiple locations for JavaScript files
                const possiblePaths = [
                    path.join(__dirname, jsFilename),               // Same directory as sync_server.js
                    path.join(__dirname, '../layout', jsFilename),  // Layout directory
                    path.join(__dirname, '..', jsFilename),         // Parent code directory
                ];
                
                console.log('Checking paths for JS file:');
                let jsPath = null;
                for (const possiblePath of possiblePaths) {
                    console.log('  Checking:', possiblePath, 'exists:', fs.existsSync(possiblePath));
                    if (fs.existsSync(possiblePath)) {
                        jsPath = possiblePath;
                        break;
                    }
                }
                
                if (jsPath) {
                    console.log('Serving JS file from:', jsPath);
                    fs.readFile(jsPath, 'utf8', (err, data) => {
                        if (err) {
                            console.log('Error reading JS file:', err);
                            res.writeHead(404, { 'Content-Type': 'text/plain' });
                            res.end('JavaScript file not found');
                        } else {
                            res.writeHead(200, { 
                                'Content-Type': 'application/javascript',
                                'Access-Control-Allow-Origin': '*'
                            });
                            res.end(data);
                        }
                    });
                } else {
                    console.log('JS file not found in any path');
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('JavaScript file not found');
                }
            } else if (req.url.startsWith('/file-content/')) {
                // Serve file content for scope parsing
                const filename = decodeURIComponent(req.url.substring(14)); // Remove '/file-content/' prefix
                console.log('Requested file content:', filename);
                
                // Security: prevent directory traversal
                if (filename.includes('..') || filename.includes('~')) {
                    res.writeHead(403, { 'Content-Type': 'text/plain' });
                    res.end('Forbidden');
                    return;
                }
                
                // Search for the file in various locations based on extension
                const searchPaths = [];
                
                if (filename.endsWith('.js')) {
                    // JavaScript files
                    searchPaths.push(
                        path.join(__dirname, '..', 'layout', filename),
                        path.join(__dirname, filename),
                        path.join(__dirname, '..', 'extract', filename),
                        path.join(__dirname, '..', filename)
                    );
                } else if (filename.endsWith('.html')) {
                    // HTML files
                    searchPaths.push(
                        path.join(__dirname, '..', '..', 'html', 'tool', filename),
                        path.join(__dirname, '..', '..', 'html', 'prompt', filename),
                        path.join(__dirname, '..', '..', 'html', filename)
                    );
                } else if (filename.endsWith('.txt')) {
                    // TXT files
                    searchPaths.push(
                        path.join(__dirname, '..', '..', 'src', 'tool', filename),
                        path.join(__dirname, '..', '..', 'src', 'prompt', filename)
                    );
                }
                
                let fileFound = false;
                let filePath = '';
                
                for (const checkPath of searchPaths) {
                    if (fs.existsSync(checkPath)) {
                        fileFound = true;
                        filePath = checkPath;
                        break;
                    }
                }
                
                if (fileFound) {
                    fs.readFile(filePath, 'utf8', (err, content) => {
                        if (err) {
                            console.error('Error reading file:', err);
                            res.writeHead(500, { 'Content-Type': 'text/plain' });
                            res.end('Internal Server Error');
                        } else {
                            // Determine content type
                            let contentType = 'text/plain';
                            if (filename.endsWith('.js')) contentType = 'application/javascript';
                            else if (filename.endsWith('.html')) contentType = 'text/html';
                            else if (filename.endsWith('.json')) contentType = 'application/json';
                            
                            res.writeHead(200, { 
                                'Content-Type': contentType,
                                'Access-Control-Allow-Origin': '*'
                            });
                            res.end(content);
                        }
                    });
                } else {
                    console.log('File not found:', filename);
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('File not found');
                }
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not found');
            }
        }
    } else if (req.method === 'GET' && req.url === '/api/list_js_files') {
        // API endpoint to list all JavaScript files recursively
        try {
            const js_files = [];
            
            // Function to recursively scan directories for JS files
            function scan_directory_recursive(dir_path) {
                if (!fs.existsSync(dir_path)) return;
                
                const items = fs.readdirSync(dir_path);
                
                for (const item of items) {
                    const full_path = path.join(dir_path, item);
                    const stat = fs.statSync(full_path);
                    
                    if (stat.isDirectory()) {
                        // Skip node_modules and .git directories
                        if (item !== 'node_modules' && item !== '.git' && !item.startsWith('.')) {
                            scan_directory_recursive(full_path);
                        }
                    } else if (item.endsWith('.js')) {
                        const relative_path = path.relative(process.cwd(), full_path);
                        js_files.push(relative_path);
                    }
                }
            }
            
            // Start scanning from the project root
            const project_root = process.cwd();
            scan_directory_recursive(project_root);
            
            res.writeHead(200, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ files: js_files }));
        } catch (error) {
            console.error('Error listing JS files:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
        }
    } else if (req.method === 'GET' && req.url.startsWith('/api/read_file?')) {
        // API endpoint to read file content
        const url_params = new URLSearchParams(req.url.split('?')[1]);
        const file_path = url_params.get('path');
        
        if (!file_path) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing path parameter');
            return;
        }
        
        // Security check
        if (file_path.includes('..') || file_path.includes('~')) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden path');
            return;
        }
        
        try {
            const full_path = path.resolve(process.cwd(), file_path);
            if (fs.existsSync(full_path)) {
                const content = fs.readFileSync(full_path, 'utf8');
                res.writeHead(200, { 
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(content);
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('File not found');
            }
        } catch (error) {
            console.error('Error reading file:', error);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Server error');
        }
    } else if (req.method === 'POST' && req.url === '/api/check_modifications') {
        // API endpoint to check for file modifications
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const since = data.since || 0;
                
                // Check if any JS files have been modified since the given timestamp
                let modified = false;
                
                // Simple check - you could enhance this to check actual file mtimes
                const now = Date.now();
                if (now - since > 30000) { // If more than 30 seconds have passed, consider checking
                    modified = true;
                }
                
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(JSON.stringify({ modified }));
            } catch (error) {
                console.error('Error checking modifications:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    } else if (req.method === 'POST' && req.url === '/sync') {
        // Handle sync requests from browser
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                console.log('Received sync data:', data);
                
                // Call sync function
                const success = sync_txt_save(data.file_name, data.line_number, data.text);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success }));
            } catch (err) {
                console.error('Sync error:', err);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    websocket_connections.add(ws);
    
    ws.on('close', () => {
        sync_connection_remove(ws);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        sync_connection_remove(ws);
    });
});

server.listen(3002, () => {
    console.log('Server running on port 3002');
    console.log('WebSocket server running on ws://localhost:3002');
    
    // Initialize version system
    const current_version = version_initialize();
    console.log('Version system initialized:', current_version);
    
    // Initialize modification times
    sync_timestamps_initialize();
    
    // Scan for new txt files in prompt folder
    prompt_folder_scan();
    
    // Scan for new txt files in meta/tool folder
    tool_folder_scan();
    
    // Rescan periodically for new files
    setInterval(() => {
        prompt_folder_scan();
        tool_folder_scan();
    }, 5000); // Check every 5 seconds
    
    // Auto-update index when JavaScript files change
    setInterval(() => {
        index_auto_update();
    }, 30000); // Update index every 30 seconds
}); 