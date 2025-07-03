// Simple version management for the Meta system
const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.join(__dirname, '../../data/version.json');

/**
 * Load current version data
 * @returns {Object} Version data with current version and history
 */
function version_load() {
    try {
        if (fs.existsSync(VERSION_FILE)) {
            const data = fs.readFileSync(VERSION_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Version load error:', error.message);
    }
    
    // Default version structure
    return {
        major: 1,
        minor: 0,
        patch: 0,
        history: [],
        last_update: Date.now()
    };
}

/**
 * Save version data
 * @param {Object} version_data - Version data to save
 */
function version_save(version_data) {
    try {
        const dir = path.dirname(VERSION_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        version_data.last_update = Date.now();
        fs.writeFileSync(VERSION_FILE, JSON.stringify(version_data, null, 2));
    } catch (error) {
        console.log('Version save error:', error.message);
    }
}

/**
 * Format version as string
 * @param {Object} version - Version object with major, minor, patch
 * @returns {string} Formatted version string
 */
function version_format(version) {
    const major = version.major.toString().padStart(2, '0');
    const minor = version.minor.toString().padStart(2, '0');
    const patch = version.patch.toString().padStart(2, '0');
    return `v${major}.${minor}.${patch}`;
}

/**
 * Generate a version name based on changes
 * @param {string} file_name - Name of file being modified
 * @param {string} new_text - New text content
 * @returns {string} Generated version name
 */
function version_name_generate(file_name, new_text = '') {
    // Extract function names from new text
    const function_matches = new_text.match(/function\s+([a-zA-Z_][a-zA-Z0-9_]*)/g) || [];
    const arrow_matches = new_text.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*=.*=>/g) || [];
    
    const functions = [
        ...function_matches.map(m => m.replace('function ', '')),
        ...arrow_matches.map(m => m.split('=')[0].trim())
    ];
    
    // Look for other meaningful content patterns
    const button_patterns = new_text.match(/button.*onclick="([^"]+)"/g) || [];
    const class_patterns = new_text.match(/class="([^"]+)"/g) || [];
    const control_patterns = new_text.match(/(outline|control|button|nav)_([a-zA-Z_]+)/g) || [];
    
    if (functions.length === 1) {
        // Single function: use function name
        return functions[0];
    } else if (button_patterns.length > 0 || control_patterns.length > 0) {
        // UI changes: extract meaningful action
        if (new_text.includes('outline_expand') || new_text.includes('expand_all')) {
            return 'outline_controls';
        } else if (new_text.includes('outline_level') || new_text.includes('Level')) {
            return 'outline_levels';
        } else if (new_text.includes('button') && new_text.includes('nav')) {
            return 'nav_buttons';
        } else if (new_text.includes('reload') || new_text.includes('indicator')) {
            return 'reload_indicator';
        } else {
            return 'ui_controls';
        }
    } else if (functions.length > 1) {
        // Multiple functions: use file name but be more specific
        const base = file_name.replace(/\.(js|txt|html)$/, '');
        if (base.includes('template')) {
            return base.replace('_template', '_ui');
        }
        return base;
    } else {
        // No functions: extract codename root from file, but be more specific
        const base = file_name.replace(/\.(js|txt|html)$/, '');
        if (base.includes('_')) {
            const parts = base.split('_');
            if (parts.length >= 2) {
                return parts[0] + '_' + parts[1]; // Use first two parts
            }
            return parts[0];
        }
        return base;
    }
}

/**
 * Increment version
 * @param {string} type - 'major', 'minor', or 'patch'
 * @param {string} description - Description of the change
 * @param {string} file_name - Name of file being modified
 * @param {string} new_text - New text content for name generation
 * @returns {string} New version string
 */
function version_increment(type = 'patch', description = 'Update', file_name = '', new_text = '') {
    const version_data = version_load();
    
    // Increment the appropriate version component
    switch (type) {
        case 'major':
            version_data.major += 1;
            version_data.minor = 0;
            version_data.patch = 0;
            break;
        case 'minor':
            version_data.minor += 1;
            version_data.patch = 0;
            break;
        case 'patch':
        default:
            version_data.patch += 1;
            break;
    }
    
    // Generate version name
    const version_name = version_name_generate(file_name, new_text);
    
    // Add to history
    const new_version = version_format(version_data);
    version_data.history.push({
        version: new_version,
        name: version_name,
        type: type,
        description: description,
        timestamp: Date.now(),
        date: new Date().toLocaleString()
    });
    
    // Keep only last 50 history entries
    if (version_data.history.length > 50) {
        version_data.history = version_data.history.slice(-50);
    }
    
    version_save(version_data);
    console.log(`Version updated to ${new_version} "${version_name}": ${description}`);
    
    return new_version;
}

/**
 * Get current version string
 * @returns {string} Current version
 */
function version_current() {
    const version_data = version_load();
    return version_format(version_data);
}

/**
 * Get current version with name
 * @returns {Object} Current version with name
 */
function version_current_with_name() {
    const version_data = version_load();
    const latest = version_data.history[version_data.history.length - 1];
    
    return {
        version: version_format(version_data),
        name: latest?.name || 'Initial',
        full_display: latest?.name ? `${latest.name} ${version_format(version_data)}` : version_format(version_data)
    };
}

/**
 * Get version history
 * @param {number} count - Number of recent entries to return
 * @returns {Array} Recent version history
 */
function version_history(count = 10) {
    const version_data = version_load();
    return version_data.history.slice(-count).reverse();
}

/**
 * Initialize version system if needed
 * @returns {string} Current version
 */
function version_initialize() {
    const version_data = version_load();
    if (version_data.history.length === 0) {
        version_data.history.push({
            version: version_format(version_data),
            type: 'initial',
            description: 'Initial version',
            timestamp: Date.now(),
            date: new Date().toLocaleString()
        });
        version_save(version_data);
    }
    return version_format(version_data);
}

module.exports = {
    version_load,
    version_save,
    version_format,
    version_increment,
    version_current,
    version_current_with_name,
    version_history,
    version_initialize,
    version_name_generate
};