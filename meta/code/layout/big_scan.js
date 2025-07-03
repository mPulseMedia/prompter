// Simple directory scanner for Big page
const fs = require('fs');
const path = require('path');

function directory_tree_scan(base_path) {
    const result = {
        files: {},
        last_scan: Date.now()
    };
    
    function directory_scan_recursive(dir_path, relative_path = '') {
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
                        directory_scan_recursive(full_path, item_relative);
                    } else if (item.endsWith('.js')) {
                        // Process JavaScript files
                        const content = fs.readFileSync(full_path, 'utf8');
                        const functions = function_extract_all(content);
                        
                        const raw_data_structures = data_structure_extract_all(content, functions);
                        
                        // Consolidate data structures to avoid duplicates
                        const consolidated_data_structures = consolidate_data_structures(raw_data_structures);
                        
                        result.files[item_relative] = {
                            functions: functions,
                            data_structures: consolidated_data_structures,
                            size: stat.size,
                            modified: stat.mtimeMs,
                            created: stat.ctimeMs
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
    
    directory_scan_recursive(base_path);
    return result;
}

function function_extract_all(content) {
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
            func.end_line = end_line;
            functions.push(func);
        }
    }
    
    // Sort functions alphabetically by name
    return functions.sort((a, b) => a.name.localeCompare(b.name));
}

function data_structure_extract_all(content, functions) {
    const data_structures = [];
    const lines = content.split('\n');
    
    // Data structure names we're looking for (from the analysis)
    const target_structures = [
        'storage_file_config',
        'reload_modification_get',
        'reload_mode_auto',
        'websocket_connections',
        'version_data',
        'timestamp_data',
        'debug_config',
        'filter_state',
        'dependency_map'
    ];
    
    // Helper function to find which function contains a given line
    function find_containing_function(line_num) {
        if (!functions || functions.length === 0) return null;
        
        // Find the function that contains this line
        for (const func of functions) {
            // Use actual function boundaries if available
            const start = func.start_line || func.line - 1;
            const end = func.end_line || func.line + 50;
            
            if (start <= line_num && line_num <= end) {
                return func.name;
            }
        }
        return null;
    }
    
    lines.forEach((line, index) => {
        // Check for data structure creation patterns
        target_structures.forEach(struct_name => {
            // Pattern 1: const struct_name = { or [
            const create_pattern1 = new RegExp(`^\\s*(?:const|let|var)\\s+${struct_name}\\s*=\\s*[{\\[]`);
            // Pattern 2: struct_name = { (assignment)
            const create_pattern2 = new RegExp(`^\\s*${struct_name}\\s*=\\s*[{\\[]`);
            // Pattern 3: Object property definition in storage_file_config
            const create_pattern3 = new RegExp(`^\\s*storage_file_config\\[['"\`]\\w+['"\`]\\]\\s*=\\s*{`);
            
            if (create_pattern1.test(line) || create_pattern2.test(line) || create_pattern3.test(line)) {
                const containing_function = find_containing_function(index + 1);
                data_structures.push({
                    name: struct_name,
                    type: 'creation',
                    line: index + 1,
                    content: line.trim(),
                    function: containing_function
                });
            }
            
            // Check for data structure references (accessing or modifying)
            // Only count meaningful references, not just mentions
            // Pattern 1: struct_name.property or struct_name[key]
            const ref_pattern1 = new RegExp(`\\b${struct_name}\\s*[.\\[]`);
            // Pattern 2: Object.keys(struct_name) or similar
            const ref_pattern2 = new RegExp(`\\b(?:Object\\.\\w+|JSON\\.\\w+)\\s*\\(\\s*${struct_name}`);
            // Pattern 3: function parameter or return
            const ref_pattern3 = new RegExp(`(?:return|=>)\\s+${struct_name}\\b`);
            // Pattern 4: Modifying the structure
            const ref_pattern4 = new RegExp(`\\b${struct_name}\\s*=\\s*(?!\\{|\\[)`);
            
            if ((ref_pattern1.test(line) || ref_pattern2.test(line) || ref_pattern3.test(line) || ref_pattern4.test(line)) && 
                !create_pattern1.test(line) && !create_pattern2.test(line) && !create_pattern3.test(line)) {
                // Make sure it's not also a creation line and not in a comment
                if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
                    const containing_function = find_containing_function(index + 1);
                    data_structures.push({
                        name: struct_name,
                        type: 'reference',
                        line: index + 1,
                        content: line.trim(),
                        function: containing_function
                    });
                }
            }
        });
        
        // Also check for version.json and timestamps.json file operations
        // Only count as data structure reference if it's actually being read/written
        if ((line.includes('version.json') || line.includes('VERSION_FILE')) && 
            (line.includes('readFileSync') || line.includes('writeFileSync') || line.includes('JSON.parse') || line.includes('JSON.stringify'))) {
            const containing_function = find_containing_function(index + 1);
            data_structures.push({
                name: 'version_data',
                type: line.includes('writeFileSync') ? 'creation' : 'reference',
                line: index + 1,
                content: line.trim(),
                function: containing_function
            });
        }
        
        if ((line.includes('timestamps.json') || line.includes('TIMESTAMPS_FILE')) &&
            (line.includes('readFileSync') || line.includes('writeFileSync') || line.includes('JSON.parse') || line.includes('JSON.stringify'))) {
            const containing_function = find_containing_function(index + 1);
            data_structures.push({
                name: 'timestamp_data',
                type: line.includes('writeFileSync') ? 'creation' : 'reference',
                line: index + 1,
                content: line.trim(),
                function: containing_function
            });
        }
    });
    
    return data_structures;
}

function consolidate_data_structures(data_structures) {
    // Group by name, type, and function to consolidate duplicates
    const consolidated = new Map();
    
    data_structures.forEach(ds => {
        // Create a key that includes name, type, and containing function
        const key = `${ds.name}_${ds.type}_${ds.function || 'module'}`;
        
        if (!consolidated.has(key)) {
            // First occurrence - keep it with its line number
            consolidated.set(key, {
                name: ds.name,
                type: ds.type,
                line: ds.line,
                function: ds.function,
                lines: [ds.line]  // Track all line numbers for this occurrence
            });
        } else {
            // Subsequent occurrence - just add the line number
            const existing = consolidated.get(key);
            existing.lines.push(ds.line);
            // Update to show the first line where it appears
            if (ds.line < existing.line) {
                existing.line = ds.line;
            }
        }
    });
    
    // Convert back to array and sort by line number
    return Array.from(consolidated.values()).sort((a, b) => a.line - b.line);
}

module.exports = { directory_tree_scan };