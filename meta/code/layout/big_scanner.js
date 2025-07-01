(function() {
    'use strict';
    
    window.big_scan_all_files = async function() {
        const start_time = Date.now();
        const result = {
            files: {},
            calls: {},
            last_scan: start_time
        };
        
        try {
            // Get list of all JS files from server
            const response = await fetch('/api/list_js_files');
            const file_list = await response.json();
            
            // Process each file
            for (const file_path of file_list.files) {
                const file_data = await scan_file(file_path);
                if (file_data) {
                    result.files[file_path] = file_data;
                    
                    // Track function calls
                    for (const call of file_data.calls || []) {
                        result.calls[call] = (result.calls[call] || 0) + 1;
                    }
                }
            }
            
            // Dispatch completion event
            window.dispatchEvent(new CustomEvent('big_scan_complete', {
                detail: result
            }));
            
        } catch (error) {
            console.error('Failed to scan files:', error);
            window.dispatchEvent(new CustomEvent('big_scan_error', {
                detail: { error: error.message }
            }));
        }
    };
    
    async function scan_file(file_path) {
        try {
            const response = await fetch(`/api/read_file?path=${encodeURIComponent(file_path)}`);
            const content = await response.text();
            
            return parse_javascript(content, file_path);
        } catch (error) {
            console.error(`Failed to scan ${file_path}:`, error);
            return null;
        }
    }
    
    function parse_javascript(content, file_path) {
        const functions = [];
        const calls = [];
        
        // Regular expressions for function detection
        const patterns = [
            // Function declarations: function name() {}
            /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
            
            // Function expressions: const name = function() {}
            /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*function\s*\(/g,
            
            // Arrow functions: const name = () => {}
            /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*\([^)]*\)\s*=>/g,
            
            // Arrow functions with single param: const name = param => {}
            /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*=>/g,
            
            // Method definitions in objects: name() {} or name: function() {}
            /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*function\s*\(/g,
            /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(\s*[^)]*\)\s*{/g,
            
            // Async functions
            /async\s+function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
            /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*async\s*\([^)]*\)\s*=>/g,
            /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*async\s+function\s*\(/g
        ];
        
        // Track line numbers
        const lines = content.split('\n');
        let current_line = 0;
        
        // Find all function definitions
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const name = match[1];
                if (name && !is_keyword(name)) {
                    // Calculate line number
                    const position = match.index;
                    const line_num = find_line_number(content, position);
                    
                    // Check if already added (avoid duplicates)
                    const exists = functions.some(f => f.name === name && f.line === line_num);
                    if (!exists) {
                        functions.push({
                            name: name,
                            line: line_num,
                            position: position
                        });
                    }
                }
            }
        }
        
        // Sort functions by position (top to bottom)
        functions.sort((a, b) => a.position - b.position);
        
        // Find function calls
        const call_pattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
        let call_match;
        while ((call_match = call_pattern.exec(content)) !== null) {
            const name = call_match[1];
            if (name && !is_keyword(name) && !is_builtin(name)) {
                calls.push(name);
            }
        }
        
        return {
            functions: functions,
            calls: [...new Set(calls)] // Remove duplicates
        };
    }
    
    function find_line_number(content, position) {
        const before = content.substring(0, position);
        return before.split('\n').length;
    }
    
    function is_keyword(name) {
        const keywords = [
            'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break',
            'continue', 'return', 'try', 'catch', 'finally', 'throw', 'new',
            'delete', 'typeof', 'instanceof', 'in', 'void', 'this', 'super',
            'class', 'extends', 'import', 'export', 'default', 'async', 'await',
            'yield', 'const', 'let', 'var', 'function', 'debugger', 'with'
        ];
        return keywords.includes(name);
    }
    
    function is_builtin(name) {
        const builtins = [
            'console', 'alert', 'parseInt', 'parseFloat', 'isNaN', 'isFinite',
            'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
            'addEventListener', 'removeEventListener', 'querySelector',
            'querySelectorAll', 'getElementById', 'getElementsByClassName',
            'createElement', 'appendChild', 'removeChild', 'insertBefore',
            'replaceChild', 'JSON', 'Math', 'Date', 'Array', 'Object',
            'String', 'Number', 'Boolean', 'Promise', 'fetch', 'require',
            'module', 'exports', 'process', 'Buffer', '__dirname', '__filename'
        ];
        return builtins.includes(name);
    }
})();