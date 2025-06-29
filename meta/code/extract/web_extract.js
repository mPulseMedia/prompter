const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '../../..');
const WEB_PATH = path.join(__dirname, '../../src/tool/web.txt');

// Directories to scan for JavaScript files
const SCAN_DIRS = [
    'meta/code/sync',
    'meta/code/layout',
    'meta/code/extract',
    'app'
];

// Files to exclude
const EXCLUDE_FILES = ['node_modules', '.git', 'function_extract.js', 'web_extract.js', 'index_extract.js'];

// Store function relationships
const functionMap = new Map(); // functionName -> { definedIn: file, calledBy: Map<file, Set<context>>, calls: Set }

// Parse JavaScript file to extract function definitions and relationships
function web_analyzer(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath);
        const lines = content.split('\n');
        
        // Track current context (function or event handler)
        let currentContext = null;
        let contextStack = [];
        
        lines.forEach((line, lineIndex) => {
            const trimmedLine = line.trim();
            
            // Extract function definitions with snake_case names
            const funcDefMatch = trimmedLine.match(/(?:function\s+([a-z_][a-z0-9_]*)|const\s+([a-z_][a-z0-9_]*)\s*=\s*(?:function|\([^)]*\)\s*=>))/);
            if (funcDefMatch) {
                const functionName = funcDefMatch[1] || funcDefMatch[2];
                if (functionName) {
                    currentContext = functionName;
                    
                    if (!functionMap.has(functionName)) {
                        functionMap.set(functionName, {
                            definedIn: fileName,
                            calledBy: new Map(),
                            calls: new Set()
                        });
                    }
                }
            }
            
            // Track event handlers as contexts
            const eventMatch = line.match(/addEventListener\s*\(\s*['"](\w+)['"]/);
            if (eventMatch) {
                const eventType = eventMatch[1];
                const elementMatch = line.match(/getElementById\s*\(\s*['"]([^'"]+)['"]\s*\)|(\w+)\.addEventListener/);
                const element = elementMatch ? (elementMatch[1] || elementMatch[2]) : 'element';
                currentContext = `${element}.addEventListener('${eventType}')`;
            }
            
            // Track forEach and other iteration contexts
            const forEachMatch = line.match(/\.forEach\s*\(\s*(?:\([^)]*\)|[^=]+)\s*=>/);
            if (forEachMatch) {
                const varMatch = line.match(/(\w+)\.forEach/);
                const varName = varMatch ? varMatch[1] : 'array';
                currentContext = `forEach (${varName})`;
            }
            
            // Extract function calls
            const callPattern = /([a-z_][a-z0-9_]*)\s*\(/g;
            let match;
            while ((match = callPattern.exec(line)) !== null) {
                const calledFunction = match[1];
                
                // Skip language keywords and common methods
                const skipWords = ['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 
                                 'console', 'require', 'parseInt', 'setTimeout', 'setInterval',
                                 'forEach', 'map', 'filter', 'reduce', 'push', 'pop', 'shift',
                                 'indexOf', 'includes', 'split', 'join', 'replace', 'match',
                                 'substring', 'substr', 'slice', 'trim', 'toString', 'path'];
                
                if (!skipWords.includes(calledFunction) && calledFunction.includes('_')) {
                    // Initialize function entry if not exists
                    if (!functionMap.has(calledFunction)) {
                        functionMap.set(calledFunction, {
                            definedIn: null,
                            calledBy: new Map(),
                            calls: new Set()
                        });
                    }
                    
                    // Record who calls this function
                    const funcData = functionMap.get(calledFunction);
                    if (!funcData.calledBy.has(fileName)) {
                        funcData.calledBy.set(fileName, new Set());
                    }
                    
                    // Add context to the call
                    const contextStr = currentContext || 'global';
                    funcData.calledBy.get(fileName).add(contextStr);
                    
                    // If we're in a function context, record what it calls
                    if (currentContext && functionMap.has(currentContext)) {
                        functionMap.get(currentContext).calls.add(calledFunction);
                    }
                }
            }
            
            // Update context based on scope (simple brace counting)
            if (line.includes('{')) contextStack.push(currentContext);
            if (line.includes('}') && contextStack.length > 0) {
                contextStack.pop();
                currentContext = contextStack[contextStack.length - 1] || null;
            }
        });
        
    } catch (error) {
        console.error(`Error analyzing ${filePath}:`, error.message);
    }
}

// Build web format output
function web_build() {
    const output = [];
    const sortedFunctions = Array.from(functionMap.keys()).sort();
    let functionIndex = 1;
    
    sortedFunctions.forEach(functionName => {
        const funcData = functionMap.get(functionName);
        
        // Skip functions that are neither defined nor called
        if (!funcData.definedIn && funcData.calledBy.size === 0) return;
        
        // Function header
        output.push(`${functionIndex}. ${functionName}`);
        
        // Show where it's called from
        let subIndex = 'a';
        for (const [file, contexts] of funcData.calledBy.entries()) {
            for (const context of contexts) {
                output.push(`\t${subIndex}. ${context} in ${file}`);
                subIndex = String.fromCharCode(subIndex.charCodeAt(0) + 1);
            }
        }
        
        // Show what it calls (if any)
        if (funcData.calls.size > 0) {
            output.push(`\t${subIndex}. calls >`);
            const callsList = Array.from(funcData.calls).sort();
            callsList.forEach((calledFunc, index) => {
                output.push(`\t\t${index + 1}. ${calledFunc}`);
            });
        }
        
        functionIndex++;
    });
    
    return output;
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

// Main extractor function
function web_extract() {
    console.log('Extracting web data...');
    
    // Clear previous data
    functionMap.clear();
    
    // Scan and analyze all JavaScript files
    const jsFiles = meta_files_scan_js();
    console.log(`Found ${jsFiles.length} JavaScript files to analyze`);
    
    jsFiles.forEach(file => {
        web_analyzer(file);
    });
    
    console.log(`Found ${functionMap.size} functions with relationships`);
    
    // Build output
    const output = web_build();
    
    // Write to web.txt
    fs.writeFileSync(WEB_PATH, output.join('\n'));
    console.log(`Extracted web data to web.txt with ${output.length} lines`);
}

// Run the extractor
web_extract(); 