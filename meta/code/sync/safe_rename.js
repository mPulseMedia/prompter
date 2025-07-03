#!/usr/bin/env node

// Safe rename utility for files and functions
const fs = require('fs');
const path = require('path');
const { safe_rename, execute_updates } = require('./dependency_mapper');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
    console.log(`
🔧 Safe Rename Utility

Usage: node safe_rename.js <old_name> <new_name> [--execute]

Examples:
  node safe_rename.js color_constants.js utl_color_constants.js --execute
  node safe_rename.js nav_client.js utl_nav_client.js --analyze
  
Options:
  --execute   Actually perform the rename and updates
  --analyze   Just show what would be changed (default)
`);
    process.exit(1);
}

const old_name = args[0];
const new_name = args[1];
const should_execute = args.includes('--execute');

console.log(`\n🔍 Safe Rename Analysis: ${old_name} → ${new_name}\n`);

// Run the analysis
const result = safe_rename(old_name, new_name);

if (result.safe) {
    console.log(`✅ Safe to rename - no references found`);
    
    if (should_execute) {
        // Just rename the file
        const layout_dir = path.resolve(__dirname, '../layout');
        const old_path = path.join(layout_dir, old_name);
        const new_path = path.join(layout_dir, new_name);
        
        if (fs.existsSync(old_path)) {
            fs.renameSync(old_path, new_path);
            console.log(`✅ File renamed: ${old_name} → ${new_name}`);
        } else {
            console.log(`❌ File not found: ${old_path}`);
        }
    }
} else {
    console.log(`\n📋 Update Plan:`);
    result.update_plan.forEach((update, i) => {
        console.log(`  ${i + 1}. ${update.file}:`);
        console.log(`     ${update.type}: ${update.old_text} → ${update.new_text}`);
    });
    
    if (should_execute) {
        console.log(`\n🔄 Executing updates...`);
        
        // Rename the file first
        const layout_dir = path.resolve(__dirname, '../layout');
        const old_path = path.join(layout_dir, old_name);
        const new_path = path.join(layout_dir, new_name);
        
        if (fs.existsSync(old_path)) {
            fs.renameSync(old_path, new_path);
            console.log(`✅ File renamed: ${old_name} → ${new_name}`);
        }
        
        // Then update all references
        execute_updates(result.update_plan);
        
        console.log(`\n✅ Rename completed successfully!`);
        console.log(`💡 Don't forget to restart the server to apply changes`);
    } else {
        console.log(`\n💡 Add --execute to perform the rename`);
        console.log(`💡 Add --analyze to just see this analysis (default)`);
    }
}

console.log('');