// Timestamp management for index entries
const fs = require('fs');
const path = require('path');

// Store timestamps in memory
let entry_timestamps = new Map(); // Map<string, {created: number, modified: number}>
const TIMESTAMPS_FILE = path.join(__dirname, '../../data/entry_timestamps.json');

// Load timestamps from file
function timestamps_load() {
    try {
        // Create data directory if it doesn't exist
        const dataDir = path.dirname(TIMESTAMPS_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Load existing timestamps
        if (fs.existsSync(TIMESTAMPS_FILE)) {
            const data = fs.readFileSync(TIMESTAMPS_FILE, 'utf8');
            const parsed = JSON.parse(data);
            entry_timestamps = new Map(Object.entries(parsed));
        }
    } catch (err) {
        console.error('Error loading timestamps:', err);
    }
}

// Save timestamps to file
function timestamps_save() {
    try {
        const dataDir = path.dirname(TIMESTAMPS_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const data = Object.fromEntries(entry_timestamps);
        fs.writeFileSync(TIMESTAMPS_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Error saving timestamps:', err);
    }
}

// Get or create timestamp for an entry
function timestamp_get_or_create(entry_name) {
    if (!entry_timestamps.has(entry_name)) {
        const now = Date.now();
        entry_timestamps.set(entry_name, {
            created: now,
            modified: now
        });
        timestamps_save();
    }
    return entry_timestamps.get(entry_name);
}

// Update modified timestamp for an entry
function timestamp_update_modified(entry_name) {
    const timestamp = timestamp_get_or_create(entry_name);
    timestamp.modified = Date.now();
    timestamps_save();
}

// Get all timestamps
function timestamps_get_all() {
    return entry_timestamps;
}

// Initialize on module load
timestamps_load();

module.exports = {
    timestamps_load,
    timestamps_save,
    timestamp_get_or_create,
    timestamp_update_modified,
    timestamps_get_all
};