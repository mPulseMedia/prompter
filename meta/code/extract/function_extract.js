const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '../../..');
const FUNCTION_PATH = path.join(__dirname, '../../src/tool/function.txt');

// Directories to scan for JavaScript files
const SCAN_DIRS = [
    'meta/code/sync',
    'meta/code/layout',
    'meta/code/extract',
    'app'
];

// Files to exclude
const EXCLUDE_FILES = ['node_modules', '.git', 'function_extract.js', 'web_extract.js', 'index_extract.js'];

// Store function definitions and calls
const functionDefinitions = new Map(); // functionName -> { file, calls: Set, calledBy: Set }
const allFunctionCalls = new Map(); // Track all function calls globally

// Parse JavaScript file to extract function definitions and calls
function function_analyzer(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath);
        
        // Extract function definitions with snake_case names
        const functionDefPattern = /(?:function\s+([a-z_][a-z0-9_]*)|const\s+([a-z_][a-z0-9_]*)\s*=\s*(?:function|\([^)]*\)\s*=>))/g;
        let match;
        
        while ((match = functionDefPattern.exec(content)) !== null) {
            const functionName = match[1] || match[2];
            if (functionName && !functionName.match(/^[A-Z]/)) { // Skip camelCase/PascalCase
                if (!functionDefinitions.has(functionName)) {
                    functionDefinitions.set(functionName, {
                        file: fileName,
                        calls: new Set(),
                        calledBy: new Set(),
                        line: content.substring(0, match.index).split('\n').length
                    });
                }
            }
        }
        
        // Extract function calls (simple pattern - function_name followed by parenthesis)
        const callPattern = /([a-z_][a-z0-9_]*)\s*\(/g;
        while ((match = callPattern.exec(content)) !== null) {
            const functionName = match[1];
            
            // Skip language keywords and common methods
            const skipWords = ['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 
                             'console', 'require', 'parseInt', 'setTimeout', 'setInterval',
                             'forEach', 'map', 'filter', 'reduce', 'push', 'pop', 'shift',
                             'indexOf', 'includes', 'split', 'join', 'replace', 'match',
                             'substring', 'substr', 'slice', 'trim', 'toString', 'parseInt'];
            
            if (!skipWords.includes(functionName) && functionName.includes('_')) {
                // Track this function call globally
                if (!allFunctionCalls.has(fileName)) {
                    allFunctionCalls.set(fileName, new Set());
                }
                allFunctionCalls.get(fileName).add(functionName);
                
                // Find which function in this file makes the call
                const callLine = content.substring(0, match.index).split('\n').length;
                let callingFunction = null;
                let bestMatch = 0;
                
                // Find the function that contains this call (closest preceding function)
                for (const [fname, fdata] of functionDefinitions.entries()) {
                    if (fdata.file === fileName && fdata.line < callLine && fdata.line > bestMatch) {
                        callingFunction = fname;
                        bestMatch = fdata.line;
                    }
                }
                
                if (callingFunction) {
                    // Track what this function calls
                    if (functionDefinitions.has(callingFunction)) {
                        functionDefinitions.get(callingFunction).calls.add(functionName);
                    }
                    
                    // Track who calls the target function (bidirectional)
                    if (!functionDefinitions.has(functionName)) {
                        functionDefinitions.set(functionName, {
                            file: 'unknown',
                            calls: new Set(),
                            calledBy: new Set(),
                            line: 0
                        });
                    }
                    functionDefinitions.get(functionName).calledBy.add(callingFunction);
                }
            }
        }
        
    } catch (error) {
        console.error(`Error analyzing ${filePath}:`, error.message);
    }
}

// Scan directories for JavaScript files
function meta_files_scan_js() {
    const jsFiles = [];
    
    for (const dir of SCAN_DIRS) {
        const fullPath = path.join(PROJECT_ROOT, dir);
        if (!fs.existsSync(fullPath)) continue;
        
        const files = fs.readdirSync(fullPath);
        for (const file of files) {
            if (file.endsWith('.js') && !EXCLUDE_FILES.includes(file)) {
                jsFiles.push(path.join(fullPath, file));
            }
        }
    }
    
    return jsFiles;
}

// Filter to only user-defined functions (exclude built-in/library functions)
function function_user_defined_check(functionName) {
    // Skip if it's a known built-in function or method
    const builtInFunctions = [
        'console', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
        'fetch', 'parseInt', 'parseFloat', 'JSON', 'Object', 'Array', 'String',
        'Number', 'Boolean', 'Date', 'Math', 'RegExp', 'Error', 'Promise',
        'forEach', 'map', 'filter', 'reduce', 'find', 'some', 'every',
        'push', 'pop', 'shift', 'unshift', 'slice', 'splice', 'indexOf',
        'includes', 'split', 'join', 'replace', 'match', 'search', 'test',
        'substring', 'substr', 'trim', 'toLowerCase', 'toUpperCase',
        'toString', 'valueOf', 'hasOwnProperty', 'focus', 'blur',
        'addEventListener', 'removeEventListener', 'querySelector',
        'querySelectorAll', 'getElementById', 'getElementsByClassName',
        'createElement', 'appendChild', 'removeChild', 'setAttribute',
        'getAttribute', 'removeAttribute', 'classList', 'style',
        'preventDefault', 'stopPropagation', 'location', 'window',
        'document', 'localStorage', 'sessionStorage', 'history',
        'caretPositionFromPoint', 'createRange', 'getSelection',
        'nextElementSibling', 'previousElementSibling', 'textContent',
        'innerHTML', 'outerHTML', 'readFileSync', 'writeFileSync',
        'existsSync', 'readdirSync', 'statSync', 'watch', 'require',
        'const', 'function', 'for', 'while', 'if', 'else', 'return',
        'var', 'let', 'switch', 'case', 'break', 'continue', 'try',
        'catch', 'finally', 'throw', 'new', 'this', 'super'
    ];
    
    // Must be a snake_case function that we actually defined
    return functionName.includes('_') && 
           !builtInFunctions.includes(functionName) &&
           functionDefinitions.has(functionName) &&
           functionDefinitions.get(functionName).file !== 'unknown';
}

// Identify root causes and user actions that trigger functions
function function_event_extract(functionName) {
    const triggers = {
        // User Interface Events
        'nav_button_click': '[USER_CLICK] Navigation button clicked',
        'filter_button_click_handler': '[USER_CLICK] Filter button clicked',
        'outline_click_single_handle': '[USER_CLICK] Single click on outline item',
        'outline_click_double_handle': '[USER_CLICK] Double click on outline item',
        'apply_time_filter': '[USER_INTERACTION] Time filter dropdown changed',
        'filter_time_refresh_start': '[TIMER] Auto-refresh timer started',
        'filter_time_refresh_stop': '[TIMER] Auto-refresh timer stopped',
        'layout_time_dropdown_update': '[USER_INTERACTION] Time dropdown selection changed',
        
        // Page/System Events
        'nav_init': '[PAGE_LOAD] Page initialization',
        'sync_connection_initialize': '[PAGE_LOAD] WebSocket connection setup',
        'page_refresh_manual': '[USER_ACTION] Manual page refresh',
        'reload_notification_show': '[SYSTEM_EVENT] Connection lost/page needs reload',
        
        // File System Events
        'file_watcher_setup': '[FILE_SYSTEM] File system watcher initialized',
        'sync_file_handle': '[FILE_SYSTEM] File change detected',
        'sync_html_build': '[FILE_SYSTEM] File change triggered rebuild',
        
        // External Data Events
        'index_content_extract_live': '[DATA_UPDATE] Index content extraction triggered',
        'css_classes_extract_live': '[DATA_UPDATE] CSS classes extraction triggered',
        'meta_folder_scan_recursive': '[DATA_UPDATE] Meta folder scan triggered',
        
        // Network/WebSocket Events
        'sync_connection_fallback': '[NETWORK] WebSocket connection failed',
        'sync_message_broadcast': '[NETWORK] WebSocket message received',
        'sync_polling_fallback': '[NETWORK] Polling fallback for updates'
    };
    
    return triggers[functionName] || '';
}

// Build clean outline hierarchy for target function
function function_hierarchy_build() {
    const output = [];
    const focusFunction = 'apply_all_filters';
    const maxDepth = 3;
    
    if (!functionDefinitions.has(focusFunction)) {
        output.push(`Function '${focusFunction}' not found`);
        return output;
    }
    
    const funcData = functionDefinitions.get(focusFunction);
    let sectionNumber = 1;
    
    // Build ancestors section (functions that call our target)
    const callers = Array.from(funcData.calledBy).filter(function_user_defined_check).sort();
    
    if (callers.length > 0) {
        callers.forEach((caller, index) => {
            const triggerDescription = function_event_extract(caller);
            const triggerText = triggerDescription ? ` ${triggerDescription}` : '';
            
            output.push(`${sectionNumber}. ${caller}${triggerText}`);
            
            // Show what this caller's parents are (one level up)
            const callerData = functionDefinitions.get(caller);
            if (callerData) {
                const parentCallers = Array.from(callerData.calledBy).filter(function_user_defined_check).sort();
                parentCallers.forEach((parentCaller, parentIndex) => {
                    const parentTriggerDescription = function_event_extract(parentCaller);
                    const parentTriggerText = parentTriggerDescription ? ` ${parentTriggerDescription}` : '';
                    output.push(`    ${String.fromCharCode(97 + parentIndex)}. ${parentCaller}${parentTriggerText}`);
                });
            }
            
            sectionNumber++;
        });
    }
    
    // Output the target function 
    output.push('');
    output.push(`◄── ${focusFunction} ◄── TARGET FUNCTION`);
    output.push('');
    
    // Build descendants section (functions that our target calls)
    const callees = Array.from(funcData.calls).filter(function_user_defined_check).sort();
    
    if (callees.length > 0) {
        callees.forEach((callee, index) => {
            output.push(`${sectionNumber}. ${callee}`);
            
            // Show what this callee calls (one level down)
            const calleeData = functionDefinitions.get(callee);
            if (calleeData) {
                const childCallees = Array.from(calleeData.calls).filter(function_user_defined_check).sort();
                childCallees.forEach((childCallee, childIndex) => {
                    output.push(`    ${String.fromCharCode(97 + childIndex)}. ${childCallee}`);
                });
            }
            
            sectionNumber++;
        });
    }
    
    return output;
}

// Main extractor function
function function_extract() {
    console.log('Extracting function data...');
    
    // Clear previous data
    functionDefinitions.clear();
    allFunctionCalls.clear();
    
    // Scan and analyze all JavaScript files
    const jsFiles = meta_files_scan_js();
    console.log(`Found ${jsFiles.length} JavaScript files to analyze`);
    
    jsFiles.forEach(file => {
        function_analyzer(file);
    });
    
    console.log(`Found ${functionDefinitions.size} function definitions`);
    
    // Build hierarchical function relationship view
    const output = function_hierarchy_build();
    
    // Write to function.txt
    fs.writeFileSync(FUNCTION_PATH, output.join('\n'));
    console.log(`Extracted function data to function.txt with ${output.length} lines`);
}

// Run the extractor
function_extract(); 