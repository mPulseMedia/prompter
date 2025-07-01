// Simple directory scanner for Big page
const fs = require('fs');
const path = require('path');

function scan_directory_tree(base_path) {
    const result = {
        files: {},
        last_scan: Date.now()
    };
    
    function scan_recursive(dir_path, relative_path = '') {
        try {
            const items = fs.readdirSync(dir_path);
            
            for (const item of items) {
                const full_path = path.join(dir_path, item);
                const item_relative = relative_path ? path.join(relative_path, item) : item;
                
                try {
                    const stat = fs.statSync(full_path);
                    
                    if (stat.isDirectory()) {
                        // Skip certain directories
                        if (['node_modules', '.git', '.DS_Store'].includes(item) || item.startsWith('.')) {
                            continue;
                        }
                        scan_recursive(full_path, item_relative);
                    } else if (item.endsWith('.js')) {
                        // Process JavaScript files
                        const content = fs.readFileSync(full_path, 'utf8');
                        const functions = extract_functions(content);
                        
                        result.files[item_relative] = {
                            functions: functions,
                            size: stat.size
                        };
                    }
                } catch (e) {
                    // Skip files that can't be read
                    console.log(`Skipping ${full_path}: ${e.message}`);
                }
            }
        } catch (e) {
            console.log(`Cannot read directory ${dir_path}: ${e.message}`);
        }
    }
    
    scan_recursive(base_path);
    return result;
}

function extract_functions(content) {
    const functions = [];
    const lines = content.split('\n');
    
    // First pass: find all function definitions
    const patterns = [
        // function name() {}
        /^\s*function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/,
        // const name = function() {}
        /^\s*(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function/,
        // const name = () => {}
        /^\s*(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>/,
        // async function name() {}
        /^\s*async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/,
        // name() { (method shorthand)
        /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*{/,
        // async name() {
        /^\s*async\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*{/
    ];
    
    const function_map = new Map();
    
    lines.forEach((line, index) => {
        for (const pattern of patterns) {
            const match = line.match(pattern);
            if (match && match[1]) {
                const name = match[1];
                // Skip obvious non-function matches
                if (!['if', 'for', 'while', 'switch', 'catch'].includes(name)) {
                    function_map.set(name, {
                        name: name,
                        line: index + 1,
                        start_line: index,
                        calls: []
                    });
                    break; // Only match first pattern per line
                }
            }
        }
    });
    
    // Second pass: extract function calls for each function
    const function_names = Array.from(function_map.keys());
    
    if (function_names.length > 0) {
        // Find function boundaries using brace counting
        const function_positions = Array.from(function_map.values()).sort((a, b) => a.start_line - b.start_line);
        
        for (let i = 0; i < function_positions.length; i++) {
            const func = function_positions[i];
            const start_line = func.start_line;
            let end_line = lines.length;
            
            // Find the end of this function by counting braces
            let brace_count = 0;
            let found_start = false;
            
            for (let j = start_line; j < lines.length; j++) {
                const line = lines[j];
                
                // Count braces
                for (const char of line) {
                    if (char === '{') {
                        brace_count++;
                        found_start = true;
                    } else if (char === '}') {
                        brace_count--;
                        if (found_start && brace_count === 0) {
                            end_line = j + 1;
                            break;
                        }
                    }
                }
                
                if (end_line !== lines.length) break;
            }
            
            // If we couldn't find the end, use the next function's start
            if (end_line === lines.length && i < function_positions.length - 1) {
                end_line = function_positions[i + 1].start_line;
            }
            
            // Extract function body
            const func_body = lines.slice(start_line, end_line).join('\n');
            
            // Find all function calls within this function
            const calls = new Set();
            
            // Pattern to match function calls - more comprehensive
            const call_pattern = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
            let match;
            
            while ((match = call_pattern.exec(func_body)) !== null) {
                const called_name = match[1];
                
                // Check if it's one of our defined functions and not a language keyword
                if (function_names.includes(called_name) && 
                    called_name !== func.name && 
                    !['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 
                     'typeof', 'instanceof', 'new', 'console', 'require', 'parseInt', 
                     'parseFloat', 'setTimeout', 'setInterval', 'Array', 'Object', 
                     'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON',
                     'Promise', 'async', 'await', 'export', 'import', 'from',
                     'class', 'extends', 'super', 'constructor', 'static',
                     'get', 'set', 'try', 'finally', 'throw', 'Error',
                     'parseInt', 'parseFloat', 'isNaN', 'isFinite',
                     'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent'].includes(called_name)) {
                    calls.add(called_name);
                }
            }
            
            func.calls = Array.from(calls).sort();
            functions.push(func);
        }
    }
    
    // Sort functions alphabetically by name
    return functions.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { scan_directory_tree };