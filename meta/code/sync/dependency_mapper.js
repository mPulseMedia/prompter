// Dependency mapping and safe rename utilities
const fs = require('fs');
const path = require('path');

// Scan all files for dependencies and references
function dependency_scan(base_path = '../layout') {
    const dependencies = new Map();
    const references = new Map();
    
    const layout_dir = path.resolve(__dirname, base_path);
    const sync_dir = __dirname;
    
    // Scan both layout and sync directories
    [layout_dir, sync_dir].forEach(dir => {
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
        
        files.forEach(file => {
            const file_path = path.join(dir, file);
            const content = fs.readFileSync(file_path, 'utf8');
            
            // Find require statements
            const require_matches = content.match(/require\(['"]([^'"]+)['"]\)/g);
            if (require_matches) {
                require_matches.forEach(match => {
                    const dep = match.match(/require\(['"]([^'"]+)['"]\)/)[1];
                    if (dep.startsWith('./') || dep.startsWith('../')) {
                        const key = file;
                        if (!dependencies.has(key)) dependencies.set(key, []);
                        dependencies.get(key).push(dep);
                    }
                });
            }
            
            // Find script src references
            const script_matches = content.match(/src=["'][^"']*\.js["']/g);
            if (script_matches) {
                script_matches.forEach(match => {
                    const src = match.match(/src=["']([^"']+)["']/)[1];
                    if (src.includes('.js')) {
                        const key = file;
                        if (!references.has(key)) references.set(key, []);
                        references.get(key).push(src);
                    }
                });
            }
        });
    });
    
    return { dependencies, references };
}

// Get all files that reference a specific file
function find_references_to(target_file) {
    const { dependencies, references } = dependency_scan();
    const referencing_files = [];
    
    // Check require statements
    for (const [file, deps] of dependencies) {
        deps.forEach(dep => {
            const dep_file = path.basename(dep, '.js') + '.js';
            if (dep_file === target_file || dep.includes(target_file)) {
                referencing_files.push({
                    file,
                    type: 'require',
                    reference: dep
                });
            }
        });
    }
    
    // Check script src references
    for (const [file, refs] of references) {
        refs.forEach(ref => {
            const ref_file = path.basename(ref, '.js') + '.js';
            if (ref_file === target_file || ref.includes(target_file.replace('.js', ''))) {
                referencing_files.push({
                    file,
                    type: 'script',
                    reference: ref
                });
            }
        });
    }
    
    return referencing_files;
}

// Safe rename function that updates all references
function safe_rename(old_name, new_name, base_path = '../layout') {
    console.log(`🔍 Analyzing dependencies for renaming ${old_name} → ${new_name}...`);
    
    const references = find_references_to(old_name);
    
    if (references.length === 0) {
        console.log(`✅ No references found to ${old_name}, safe to rename`);
        return { safe: true, updates: [] };
    }
    
    console.log(`📋 Found ${references.length} references that need updating:`);
    references.forEach(ref => {
        console.log(`  - ${ref.file}: ${ref.type} → ${ref.reference}`);
    });
    
    return {
        safe: false,
        updates: references,
        update_plan: generate_update_plan(old_name, new_name, references)
    };
}

// Generate update plan for file rename
function generate_update_plan(old_name, new_name, references) {
    const updates = [];
    
    references.forEach(ref => {
        if (ref.type === 'require') {
            const old_require = ref.reference;
            const new_require = old_require.replace(
                path.basename(old_name, '.js'), 
                path.basename(new_name, '.js')
            );
            updates.push({
                file: ref.file,
                type: 'require',
                old_text: `require('${old_require}')`,
                new_text: `require('${new_require}')`
            });
        } else if (ref.type === 'script') {
            const old_src = ref.reference;
            const new_src = old_src.replace(
                path.basename(old_name, '.js'), 
                path.basename(new_name, '.js')
            );
            updates.push({
                file: ref.file,
                type: 'script',
                old_text: `src="${old_src}"`,
                new_text: `src="${new_src}"`
            });
        }
    });
    
    return updates;
}

// Execute the update plan
function execute_updates(update_plan, base_path = '../layout') {
    const layout_dir = path.resolve(__dirname, base_path);
    const sync_dir = __dirname;
    
    update_plan.forEach(update => {
        // Try layout directory first, then sync
        let file_path = path.join(layout_dir, update.file);
        if (!fs.existsSync(file_path)) {
            file_path = path.join(sync_dir, update.file);
        }
        
        if (!fs.existsSync(file_path)) {
            console.log(`❌ File not found: ${update.file}`);
            return;
        }
        
        let content = fs.readFileSync(file_path, 'utf8');
        const updated_content = content.replace(update.old_text, update.new_text);
        
        if (content !== updated_content) {
            fs.writeFileSync(file_path, updated_content, 'utf8');
            console.log(`✅ Updated ${update.file}: ${update.type}`);
        } else {
            console.log(`⚠️  No changes made to ${update.file} - text not found`);
        }
    });
}

module.exports = {
    dependency_scan,
    find_references_to,
    safe_rename,
    execute_updates
};