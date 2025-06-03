const fs = require('fs');
const path = require('path');

// Function to check if a string is likely a CSS class name
function css_class_name_is(name) {
    // CSS class names typically contain hyphens or underscores
    // Exclude common JS properties and variables
    const jsKeywords = [
        'FILE_NAME', 'LAST_MODIFIED', 'exports', 'module', 'require',
        'console', 'window', 'document', 'length', 'innerHTML', 'textContent',
        'clientX', 'clientY', 'offsetNode', 'href', 'url', 'key', 'value',
        'message', 'method', 'display', 'color', 'button', 'js', 'txt',
        'html_path', 'txt_path', 'file_name', 'line_number', 'last_modified',
        'nonCssLines', '([^'
    ];
    
    // Exclude if it's a known JS keyword
    if (jsKeywords.includes(name)) return false;
    
    // Exclude if it starts with css_ (old entries to remove)
    if (name.startsWith('css_')) return false;
    
    // Include if it contains hyphens (common in CSS)
    if (name.includes('-')) return true;
    
    // Include if it has underscores and looks like a CSS pattern
    if (name.includes('_') && (name.includes('part') || name.includes('btn') || 
        name.includes('control') || name.includes('filter'))) return true;
    
    // Include specific known CSS classes
    const knownCssClasses = ['active', 'hidden', 'editing', 'off', 'duplicate'];
    if (knownCssClasses.includes(name)) return true;
    
    return false;
}

// Function to extract CSS classes from content
function css_class_extract(content) {
    const cssClasses = new Set();
    
    // Extract class names from class="" attributes
    const classRegex = /class="([^"]+)"/g;
    let classMatch;
    while ((classMatch = classRegex.exec(content)) !== null) {
        const classes = classMatch[1].split(/\s+/);
        classes.forEach(cls => {
            if (cls && css_class_name_is(cls)) {
                cssClasses.add(cls);
            }
        });
    }
    
    // Extract class names from CSS definitions (. followed by class name)
    const cssRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)\s*[\{:,\s]/g;
    let cssMatch;
    while ((cssMatch = cssRegex.exec(content)) !== null) {
        if (css_class_name_is(cssMatch[1])) {
            cssClasses.add(cssMatch[1]);
        }
    }
    
    // Extract class names from classList operations
    const classListRegex = /classList\.(add|remove|toggle|contains)\(['"]([^'"]+)['"]\)/g;
    let classListMatch;
    while ((classListMatch = classListRegex.exec(content)) !== null) {
        if (css_class_name_is(classListMatch[2])) {
            cssClasses.add(classListMatch[2]);
        }
    }
    
    return cssClasses;
}

// Function to scan directory recursively
function css_directory_scan(dirPath, allClasses) {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            css_directory_scan(filePath, allClasses);
        } else if (file.endsWith('.js')) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const classes = css_class_extract(content);
                classes.forEach(cls => allClasses.add(cls));
            } catch (err) {
                console.error(`Error reading ${filePath}:`, err.message);
            }
        }
    });
}

// Main function to clean and update index
function css_index_clean() {
    // Read current index.txt
    const indexPath = path.join(__dirname, '../../src/tool/index.txt');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const lines = indexContent.split('\n');
    
    // Filter out all CSS-related entries (both with and without css_ prefix)
    const cleanedLines = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const firstColumn = line.split('\t')[0];
            // Remove lines that start with css_ or are CSS class names
            if (!firstColumn.startsWith('css_') && !css_class_name_is(firstColumn)) {
                cleanedLines.push(lines[i]);
            }
        }
    }
    
    // Write back cleaned index
    fs.writeFileSync(indexPath, cleanedLines.join('\n'));
    console.log(`Cleaned index.txt - removed all CSS entries`);
}

// Main function
function css_index_update() {
    // First clean the index
    css_index_clean();
    
    const allClasses = new Set();
    
    // Scan the meta/code directory
    const codeDir = path.join(__dirname, '..');
    console.log('Scanning directory:', codeDir);
    css_directory_scan(codeDir, allClasses);
    
    // Read current index.txt
    const indexPath = path.join(__dirname, '../../src/tool/index.txt');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const lines = indexContent.split('\n').filter(line => line.trim());
    
    // Add CSS class entries (without any prefix)
    const sortedClasses = Array.from(allClasses).sort();
    console.log(`Found ${sortedClasses.length} CSS classes:`, sortedClasses);
    
    // Combine all entries and sort
    const allEntries = [...lines, ...sortedClasses];
    allEntries.sort((a, b) => {
        const aName = a.split('\t')[0].toLowerCase();
        const bName = b.split('\t')[0].toLowerCase();
        return aName.localeCompare(bName);
    });
    
    // Write back to index.txt
    fs.writeFileSync(indexPath, allEntries.join('\n'));
    console.log(`Updated ${indexPath} with ${sortedClasses.length} CSS class entries`);
}

// Run the update
css_index_update(); 