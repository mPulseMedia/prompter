// ============================================
// EDIT PROTECTION SYSTEM
// ============================================
// Purpose: Prevent accidental edits to wrong files
// This creates a protective wrapper around file edits
// ============================================

class EditProtection {
    constructor() {
        this.recent_files = [];
        this.expected_edits = new Map();
        this.verification_rules = {
            // Rule: If editing test_hierarchy.html, verify it contains test-related content
            'test_hierarchy.html': {
                must_contain: ['Testing Hierarchical Click Events', 'test_names_panel'],
                must_not_contain: ['sync_server', 'outline_client'],
                description: 'Test hierarchy visualization page'
            },
            // Rule: If editing outline files, verify outline-specific content
            'outline_client.js': {
                must_contain: ['outline_state', 'outline_click', 'OUTLINE CLIENT'],
                must_not_contain: ['test_hierarchy', 'sync_server'],
                description: 'Outline expand/collapse functionality'
            },
            // Rule: If editing big_client, verify codename analysis content
            'big_client.js': {
                must_contain: ['big_data', 'codename_analysis'],
                must_not_contain: ['test_hierarchy', 'outline_click'],
                description: 'Codename analysis and big data display'
            }
        };
    }

    // Register an expected edit before making it
    register_expected_edit(file_path, edit_type, description) {
        const edit_id = Date.now().toString();
        this.expected_edits.set(edit_id, {
            file_path,
            edit_type,
            description,
            timestamp: new Date().toISOString(),
            completed: false
        });
        
        console.log(`EDIT_PROTECTION: Registered edit ${edit_id} for ${file_path}`);
        console.log(`Description: ${description}`);
        
        return edit_id;
    }

    // Verify file content before editing
    verify_file_content(file_path, content_sample) {
        const filename = file_path.split('/').pop();
        const rules = this.verification_rules[filename];
        
        if (!rules) {
            console.warn(`EDIT_PROTECTION: No rules defined for ${filename}`);
            return { verified: true, warnings: ['No specific rules for this file'] };
        }
        
        const issues = [];
        
        // Check must_contain rules
        for (const required of rules.must_contain) {
            if (!content_sample.includes(required)) {
                issues.push(`Missing expected content: "${required}"`);
            }
        }
        
        // Check must_not_contain rules
        for (const forbidden of rules.must_not_contain) {
            if (content_sample.includes(forbidden)) {
                issues.push(`Contains unexpected content: "${forbidden}"`);
            }
        }
        
        if (issues.length > 0) {
            console.error('EDIT_PROTECTION: Verification failed!');
            console.error('File:', file_path);
            console.error('Expected:', rules.description);
            console.error('Issues:', issues);
            
            return {
                verified: false,
                issues,
                expected_file: rules.description
            };
        }
        
        console.log(`EDIT_PROTECTION: File verified - ${rules.description}`);
        return { verified: true };
    }

    // Create a safety checkpoint
    create_checkpoint(file_path, content) {
        const checkpoint = {
            file_path,
            timestamp: new Date().toISOString(),
            content_length: content.length,
            content_preview: content.substring(0, 200),
            content_hash: this.hash_content(content)
        };
        
        // Keep last 10 files
        this.recent_files.unshift(checkpoint);
        if (this.recent_files.length > 10) {
            this.recent_files.pop();
        }
        
        return checkpoint;
    }

    // Simple hash for content verification
    hash_content(content) {
        let hash = 0;
        const sample = content.substring(0, 1000); // Hash first 1000 chars
        for (let i = 0; i < sample.length; i++) {
            hash = ((hash << 5) - hash) + sample.charCodeAt(i);
            hash = hash & hash;
        }
        return hash.toString(16);
    }

    // Get recent file history
    get_recent_files() {
        return this.recent_files.map(f => ({
            path: f.file_path,
            time: f.timestamp,
            preview: f.content_preview.substring(0, 50) + '...'
        }));
    }

    // Confirm an edit was completed
    confirm_edit(edit_id) {
        const edit = this.expected_edits.get(edit_id);
        if (edit) {
            edit.completed = true;
            console.log(`EDIT_PROTECTION: Edit ${edit_id} confirmed`);
        }
    }
}

// Create singleton instance
const edit_protection = new EditProtection();

// Helper function for quick verification
function verify_before_edit(file_path, content_sample, expected_type) {
    console.log('='.repeat(50));
    console.log('VERIFY_BEFORE_EDIT: Starting verification');
    console.log('File:', file_path);
    console.log('Expected type:', expected_type);
    
    // Check if this looks like the right file
    const filename = file_path.split('/').pop().toLowerCase();
    if (expected_type && !filename.includes(expected_type.toLowerCase())) {
        console.error('VERIFY_BEFORE_EDIT: Filename mismatch!');
        console.error(`Expected type: ${expected_type}`);
        console.error(`Actual file: ${filename}`);
        return false;
    }
    
    // Verify content if available
    if (content_sample) {
        const result = edit_protection.verify_file_content(file_path, content_sample);
        if (!result.verified) {
            console.error('VERIFY_BEFORE_EDIT: Content verification failed!');
            return false;
        }
    }
    
    console.log('VERIFY_BEFORE_EDIT: Verification passed ✓');
    console.log('='.repeat(50));
    return true;
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        EditProtection,
        edit_protection,
        verify_before_edit
    };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.EditProtection = EditProtection;
    window.edit_protection = edit_protection;
    window.verify_before_edit = verify_before_edit;
}