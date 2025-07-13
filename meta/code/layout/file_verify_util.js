// ============================================
// FILE VERIFICATION UTILITY
// ============================================
// Purpose: Prevent accidental edits to wrong files
// Usage: Call file_verify_check() before any file edit
// ============================================

const file_verify_patterns = {
    test_hierarchy: {
        path_contains: ['test_hierarchy'],
        content_markers: ['Testing Hierarchical Click Events', 'test_names_panel', 'scrollToTest'],
        file_type: '.html'
    },
    sync_server: {
        path_contains: ['sync_server', 'sync/server'],
        content_markers: ['sync_server', 'file_watcher', 'port 3002'],
        file_type: '.js'
    },
    outline_client: {
        path_contains: ['outline_client'],
        content_markers: ['outline_state', 'outline_click', 'OUTLINE CLIENT'],
        file_type: '.js'
    },
    big_client: {
        path_contains: ['big_client'],
        content_markers: ['big_data', 'big_scan', 'codename_analysis'],
        file_type: '.js'
    }
};

// Verify file before editing
function file_verify_check(file_path, content_preview, expected_type) {
    console.log('FILE_VERIFY: Checking file:', file_path);
    
    // Extract filename
    const filename = file_path.split('/').pop().toLowerCase();
    
    // Find matching pattern
    let matched_pattern = null;
    for (const [key, pattern] of Object.entries(file_verify_patterns)) {
        // Check if this might be the file type we're looking for
        if (expected_type && key.includes(expected_type)) {
            // Verify path contains expected keywords
            const path_match = pattern.path_contains.some(keyword => 
                file_path.toLowerCase().includes(keyword)
            );
            
            // Verify file extension
            const ext_match = file_path.endsWith(pattern.file_type);
            
            if (path_match && ext_match) {
                matched_pattern = { key, pattern };
                break;
            }
        }
    }
    
    if (!matched_pattern) {
        console.warn('FILE_VERIFY: No pattern matched for file:', file_path);
        return {
            verified: false,
            reason: 'No matching pattern found',
            suggestions: Object.keys(file_verify_patterns)
        };
    }
    
    // Verify content markers if provided
    if (content_preview && matched_pattern.pattern.content_markers) {
        const markers_found = matched_pattern.pattern.content_markers.filter(marker =>
            content_preview.includes(marker)
        );
        
        if (markers_found.length === 0) {
            console.error('FILE_VERIFY: Content markers not found!');
            return {
                verified: false,
                reason: 'Expected content markers missing',
                expected_markers: matched_pattern.pattern.content_markers,
                file_type: matched_pattern.key
            };
        }
    }
    
    console.log('FILE_VERIFY: File verified as:', matched_pattern.key);
    return {
        verified: true,
        file_type: matched_pattern.key,
        path: file_path
    };
}

// Helper to create verification checkpoint
function file_verify_create_checkpoint(file_path, file_type, content_sample) {
    const checkpoint = {
        timestamp: new Date().toISOString(),
        file_path: file_path,
        file_type: file_type,
        content_hash: content_sample ? simple_hash(content_sample.substring(0, 500)) : null,
        verified: true
    };
    
    // Store in memory for this session
    if (!window.file_verify_checkpoints) {
        window.file_verify_checkpoints = [];
    }
    window.file_verify_checkpoints.push(checkpoint);
    
    return checkpoint;
}

// Simple hash function for content verification
function simple_hash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        file_verify_check,
        file_verify_create_checkpoint,
        file_verify_patterns
    };
}