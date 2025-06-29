const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = path.join(__dirname, '../../..');
const INDEX_PATH = path.join(__dirname, '../../src/tool/index.txt');

// Directories to scan
const SCAN_DIRS = [
    'meta/code',
    'meta/src', 
    'meta/html',
    'meta/rule',
    'meta/js',
    'app'
];

// Directories to exclude
const EXCLUDE_DIRS = ['node_modules', '.git', '.DS_Store'];

// Files to exclude
const EXCLUDE_FILES = ['node_modules', '.git', 'function_extract.js', 'web_extract.js', 'index_extract.js'];

// Known folder names (for proper categorization)
const KNOWN_FOLDERS = ['app', 'meta', 'prompt', 'rule', 'tool', 'html', 'code', 'js', 'src', 'layout', 'sync', 'extract'];

// File extensions to include
const INCLUDE_EXTENSIONS = ['.js', '.html', '.txt', '.json', '.css', '.md'];

// Separate collections for each type
const functions = new Set();
const files = new Set();
const folders = new Set();
const cssClasses = new Set();

// Function to extract function names from JavaScript files
function function_names_extract(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Match snake_case function declarations that follow project conventions
        const functionPatterns = [
            // function snake_case_name() 
            /function\s+([a-z_][a-z0-9_]*)\s*\(/g,
            // const snake_case_name = function
            /const\s+([a-z_][a-z0-9_]*)\s*=\s*function/g,
            // const snake_case_name = () =>
            /const\s+([a-z_][a-z0-9_]*)\s*=\s*\([^)]*\)\s*=>/g,
            // let snake_case_name = function
            /let\s+([a-z_][a-z0-9_]*)\s*=\s*function/g,
            // let snake_case_name = () =>
            /let\s+([a-z_][a-z0-9_]*)\s*=\s*\([^)]*\)\s*=>/g,
            // snake_case_name: function(
            /([a-z_][a-z0-9_]*)\s*:\s*function\s*\(/g,
        ];
        
        const foundFunctions = new Set();
        
        for (const pattern of functionPatterns) {
            let match;
            pattern.lastIndex = 0; // Reset regex state
            while ((match = pattern.exec(content)) !== null) {
                const funcName = match[1];
                // Only include snake_case names (must contain underscore or be all lowercase)
                // Exclude very short names and common keywords
                if (funcName && 
                    funcName.length > 2 && 
                    !['if', 'for', 'while', 'switch', 'catch', 'let', 'var', 'const', 'new', 'try'].includes(funcName) &&
                    (funcName.includes('_') || funcName === funcName.toLowerCase())) {
                    foundFunctions.add(funcName);
                }
            }
        }
        
        return Array.from(foundFunctions);
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err.message);
        return [];
    }
}

// Function to extract CSS classes from template/HTML files
function css_class_extract(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const foundClasses = new Set();
        
        // Extract class names from class="" attributes
        const classPattern = /class="([^"]+)"/g;
        let match;
        while ((match = classPattern.exec(content)) !== null) {
            const classes = match[1].split(/\s+/);
            classes.forEach(cls => {
                if (cls && !cls.startsWith('$') && !cls.includes('{')) {
                    foundClasses.add(cls);
                }
            });
        }
        
        // Extract from classList operations
        const classListPattern = /classList\.(add|remove|toggle)\(['"]([^'"]+)['"]\)/g;
        while ((match = classListPattern.exec(content)) !== null) {
            if (match[2]) foundClasses.add(match[2]);
        }
        
        // Extract from className assignments
        const classNamePattern = /className\s*=\s*["']([^"']+)["']/g;
        while ((match = classNamePattern.exec(content)) !== null) {
            const classes = match[1].split(/\s+/);
            classes.forEach(cls => {
                if (cls && !cls.startsWith('$')) {
                    foundClasses.add(cls);
                }
            });
        }
        
        // Extract from getElementById that might be CSS classes (hyphenated)
        const idPattern = /getElementById\(['"]([a-zA-Z0-9_-]+)['"]\)/g;
        while ((match = idPattern.exec(content)) !== null) {
            const id = match[1];
            if (id.includes('-')) {
                foundClasses.add(id);
            }
        }
        
        return Array.from(foundClasses);
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err.message);
        return [];
    }
}

// Recursively scan directory
function directory_scanner(dirPath, baseDir = '') {
    try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            // Skip excluded items
            if (EXCLUDE_DIRS.includes(item)) continue;
            
            const fullPath = path.join(dirPath, item);
            const relativePath = path.join(baseDir, item);
            const stats = fs.statSync(fullPath);
            
            if (stats.isDirectory()) {
                // Add to folders collection - add the folder name itself
                folders.add(item);
                
                // Also add parent folder names from the relative path
                // This ensures we capture folders like 'rule', 'other', etc.
                const pathParts = relativePath.split(path.sep);
                pathParts.forEach(part => {
                    if (part && !EXCLUDE_DIRS.includes(part)) {
                        folders.add(part);
                    }
                });
                
                // Recursively scan subdirectory
                directory_scanner(fullPath, relativePath);
            } else if (stats.isFile()) {
                const ext = path.extname(item);
                
                // Add file name to files collection
                if (INCLUDE_EXTENSIONS.includes(ext)) {
                    files.add(item);
                    
                    // Extract functions from JavaScript files
                    if (ext === '.js') {
                        const foundFunctions = function_names_extract(fullPath);
                        foundFunctions.forEach(func => functions.add(func));
                    }
                    
                    // Extract CSS classes from JS/HTML files
                    if (ext === '.js' || ext === '.html') {
                        const foundClasses = css_class_extract(fullPath);
                        foundClasses.forEach(cls => cssClasses.add(cls));
                    }
                }
            }
        }
    } catch (err) {
        console.error(`Error scanning ${dirPath}:`, err.message);
    }
}

// Main function
function index_extract() {
    console.log('Extracting index data...');
    
    // Clear collections
    functions.clear();
    files.clear();
    folders.clear();
    cssClasses.clear();
    
    // Add root-level folders that should always be included
    folders.add('app');
    folders.add('meta');
    folders.add('prompt');
    
    // Scan each configured directory
    for (const dir of SCAN_DIRS) {
        const fullPath = path.join(PROJECT_ROOT, dir);
        if (fs.existsSync(fullPath)) {
            console.log(`Scanning ${dir}...`);
            
            // Add the folder components from the scan directory itself
            const dirParts = dir.split('/');
            dirParts.forEach(part => {
                if (part && !EXCLUDE_DIRS.includes(part)) {
                    folders.add(part);
                }
            });
            
            directory_scanner(fullPath);
        }
    }
    
    // Remove camelCase entries from functions (keep only snake_case)
    const snakeCaseFunctions = new Set();
    functions.forEach(func => {
        // Only keep snake_case or all lowercase functions
        if (func.includes('_') || func === func.toLowerCase()) {
            snakeCaseFunctions.add(func);
        }
    });
    
    // Replace functions set with filtered version
    functions.clear();
    snakeCaseFunctions.forEach(func => functions.add(func));
    
    // Add some common built-in JavaScript properties/methods that are relevant
    const builtins = ['length', 'innerHTML', 'textContent', 'href', 'url', 'key', 
                      'display', 'color', 'message', 'method', 'exports', 'require',
                      'module', 'console', 'document', 'window'];
    builtins.forEach(item => functions.add(item));
    
    // Combine all entries
    const allEntries = new Set([...functions, ...files, ...folders, ...cssClasses]);
    
    // Convert to sorted array and filter
    const sortedEntries = Array.from(allEntries)
        .filter(entry => {
            // Remove empty, single-char entries, and regex patterns
            if (!entry || !entry.trim() || entry.length <= 1) return false;
            // Remove regex patterns that were mistakenly captured
            if (entry.includes('(') || entry.includes('[') || entry.includes('^')) return false;
            return true;
        })
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    
    // Write to index.txt
    const content = sortedEntries.join('\n');
    fs.writeFileSync(INDEX_PATH, content);
    
    // Note: No longer updating sync_server.js - using dynamic extraction instead
    
    console.log(`\nExtracted ${sortedEntries.length} index entries:`);
    console.log(`  Functions: ${functions.size}`);
    console.log(`  Files: ${files.size}`);
    console.log(`  Folders: ${folders.size}`);
    console.log(`  CSS classes: ${cssClasses.size}`);
    
    // Show samples
    console.log('\nSample entries:');
    console.log('Functions:', Array.from(functions).slice(0, 5).join(', '));
    console.log('Files:', Array.from(files).slice(0, 5).join(', '));
    console.log('Folders:', Array.from(folders).slice(0, 5).join(', '));
    console.log('CSS classes:', Array.from(cssClasses).slice(0, 5).join(', '));
}

// Run the extractor
index_extract(); 