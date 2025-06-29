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
    return `v${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Increment version
 * @param {string} type - 'major', 'minor', or 'patch'
 * @param {string} description - Description of the change
 * @returns {string} New version string
 */
function version_increment(type = 'patch', description = 'Update') {
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
    
    // Add to history
    const new_version = version_format(version_data);
    version_data.history.push({
        version: new_version,
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
    console.log(`Version updated to ${new_version}: ${description}`);
    
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
    version_history,
    version_initialize
};