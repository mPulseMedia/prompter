const path = require('path');
const { directory_tree_scan } = require('./big_scan');
const { CSS_VARIABLES } = require('./utl_color_constants');

function big_html_generate(txt_content, txt_file_path, last_modified, version = 'v1.1.0') {
    const relative_path = path.relative(process.cwd(), txt_file_path);
    const file_name = path.basename(txt_file_path, '.txt');
    
    // Scan the project directory for JS files and functions
    // Go up 3 levels from current working directory to reach project root
    const project_root = path.resolve(process.cwd(), '../../..');
    const scan_result = directory_tree_scan(project_root);
    const outline_content = outline_content_generate(scan_result);
    
    return `<!DOCTYPE html>
<html>
<head>
<style>
${CSS_VARIABLES}
    
    /* Style for grayed out duplicate first terms */
    .big_term_duplicate {
        color: var(--gray);
    }
    
    body {
        background-color: var(--bg);
        color:            var(--text);
        font-family:      "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Menlo, Consolas, "Courier New", monospace;
        font-size:        18px;
        line-height:      1.5;
        margin:           0;
        padding:          0;
        position:         relative;
    }
    
    /* Fixed header area with solid background */
    .header_area {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background-color: var(--bg);
        border-bottom: 1px solid var(--hover);
        z-index: 1000;
        padding-bottom: 10px;
    }
    
    /* Main content area - pushed down below fixed header */
    #content {
        padding: 20px;
        margin-top: 140px;
    }
    
    /* Outline Control Panel - left justified below nav */
    .outline_controls {
        margin-top: 10px;
        margin-left: 20px;
        display: flex;
        gap: 12px;
        padding: 12px;
        background-color: transparent;
    }
    
    /* Green control buttons */
    .control_button {
        background-color: #2ea043;
        color: white;
        border: none;
        padding: 12px;
        width: 48px;
        height: 48px;
        cursor: pointer;
        border-radius: 10px;
        font-size: 18px;
        font-weight: 600;
        transition: all 0.2s ease;
        font-family: inherit;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
    
    .control_button:hover {
        background-color: #3fb654;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(46, 160, 67, 0.4);
    }
    
    .control_button:active {
        transform: translateY(0);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }
    
    /* Make "All" button slightly wider */
    .control_button:first-child {
        width: auto;
        min-width: 60px;
        padding: 12px 16px;
    }
    
    /* Navigation buttons */
    .button_nav {
        background-color: var(--gray);
        color: white;
        border: none;
        padding: 8px 16px;
        cursor: pointer;
        border-radius: 4px;
        font-size: 16px;
        transition: all 0.2s ease;
        font-family: inherit;
        opacity: 0.7;
    }
    
    .button_nav:hover {
        opacity: 0.9;
    }
    
    .button_nav.style_active {
        background-color: var(--edit-border);
        opacity: 1;
        font-weight: 500;
    }
    
    .nav_controls {
        padding: 20px;
        padding-bottom: 0;
        display: flex;
        gap: 10px;
        align-items: center;
    }
    
    .page_version {
        margin-left: auto;
        color: var(--gray);
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
    }
    
    /* Small green circle indicator for reload notifications */
    .reload_indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: transparent;
        transition: background-color 0.3s ease;
    }
    
    .reload_indicator.active {
        background: var(--green);
    }
    
    /* Outline line styles */
    .outline_line_number {
        cursor: pointer;
        user-select: none;
        color: var(--gray);
        margin-right: 8px;
        min-width: 60px;
        display: inline-block;
    }
    
    .outline_line_number:hover {
        color: var(--text);
    }
    
    /* Content styling with colors */
    .big_folder_name {
        color: var(--folder-blue);
    }
    
    .big_folder_slash {
        color: var(--gray);
    }
    
    .big_file_name {
        color: var(--file-blue);
    }
    
    .big_file_ext {
        color: var(--gray);
    }
    
    .big_function_def_name {
        color: var(--function-def-yellow);
    }
    
    .big_function_paren {
        color: var(--gray);
    }
    
    .big_function_call_name {
        color: var(--function-call-orange);
    }
    
    .big_function_call_arrow {
        color: var(--gray);
    }
    
    /* Stats display */
    .big_stats {
        color: var(--gray);
        margin-bottom: 20px;
        padding: 10px;
        border-bottom: 1px solid #333;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    
    /* Hidden children when collapsed */
    .style_hidden {
        display: none;
    }
    
    /* Method calls container */
    .method_calls {
        transition: opacity 0.2s ease;
    }
    
    .method_calls.hidden {
        display: none !important;
    }
    
    /* Filter button */
    .filter_button {
        background-color: var(--gray);
        color: white;
        border: none;
        padding: 8px 16px;
        cursor: pointer;
        border-radius: 4px;
        font-size: 14px;
        transition: all 0.2s ease;
        font-family: inherit;
        opacity: 0.5;
    }
    
    .filter_button:hover {
        opacity: 0.8;
    }
    
    .filter_button.active {
        opacity: 1;
    }
    
    /* Function lines that can be hidden */
    .function_line {
        transition: opacity 0.2s ease;
    }
    
    .function_line.hidden {
        display: none !important;
    }
    
    /* Search controls */
    .search_controls {
        margin-top: 10px;
        margin-left: 20px;
        display: flex;
        gap: 10px;
        align-items: center;
        padding: 12px;
        background-color: transparent;
    }
    
    .search_input_container {
        position: relative;
        display: inline-block;
    }
    
    .search_input {
        background-color: var(--bg);
        color: var(--text);
        border: 1px solid var(--gray);
        padding: 8px 40px 8px 12px;
        border-radius: 4px;
        font-size: 16px;
        font-family: inherit;
        width: 300px;
        transition: border-color 0.2s ease;
    }
    
    .search_input:focus {
        outline: none;
        border-color: var(--edit-border);
        box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
    }
    
    .search_input::placeholder {
        color: var(--gray);
    }
    
    .search_clear {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: var(--gray);
        font-size: 16px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: none;
    }
    
    .search_clear:hover {
        color: var(--text);
    }
    
    .search_clear.search_clear_visible {
        display: block;
    }
    
    /* Hide search filtered items */
    .search_hidden {
        display: none !important;
    }
    
    /* Hide time filtered items */
    .time_hidden {
        display: none !important;
    }
    
    /* Time filter dropdown */
    .time_filter_select {
        background-color: var(--bg);
        color: var(--text);
        border: 1px solid var(--gray);
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 16px;
        font-family: inherit;
        cursor: pointer;
        width: 150px;
        transition: border-color 0.2s ease;
    }
    
    .time_filter_select:hover {
        border-color: var(--edit-border);
    }
    
    .time_filter_select:focus {
        outline: none;
        border-color: var(--edit-border);
        box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
    }
    
    /* Hide time filtered items */
    .time_hidden {
        display: none !important;
    }
    
    /* Checkbox unchecked state - dark background */
    input[type="checkbox"]:not(:checked) {
        background-color: var(--bg) !important;
    }
</style>
</head>
<body>
    <div class="header_area">
        <div class="nav_controls">
            <button class="button_nav" data-nav="index" title="View Index">Index</button>
            <button class="button_nav" data-nav="big" title="View Function Hierarchy">Big</button>
            <button class="button_nav" data-nav="function" title="View Functions">Function</button>
            <button class="button_nav" data-nav="web" title="View Web Relationships">Web</button>
            <button class="button_nav" data-nav="tree" title="View Function Tree">Tree</button>
            <button class="button_nav" data-nav="debug">Debug</button>
            <button class="button_nav" data-nav="prompt" title="View Prompt">Prompt</button>
            <div class="page_version">
                <span class="reload_indicator" id="reload_indicator"></span>
                ${version}
            </div>
        </div>
        
        <div class="outline_controls">
            <button class="control_button" onclick="outline_expand_all_handle()" title="All">All</button>
            <!-- <button class="control_button" onclick="outline_level_1_handle()" title="Level 1">1</button>
            <button class="control_button" onclick="outline_level_2_handle()" title="Level 2">2</button>
            <button class="control_button" onclick="outline_level_3_handle()" title="Level 3">3</button> -->
            <button class="control_button" onclick="outline_collapse_all()" title="Collapse Level">-</button>
            <button class="control_button" onclick="outline_expand_all()" title="Expand Level">+</button>
        </div>
        
        <div class="search_controls">
            <div class="search_input_container">
                <input type="text" 
                       class="search_input" 
                       id="search_input" 
                       placeholder="Search"
                       autocomplete="off">
                <button class="search_clear" id="search_clear" title="Clear search">X</button>
            </div>
            <div style="display: flex; gap: 15px; margin-left: 20px; align-items: center;">
                <label style="display: flex; align-items: center; gap: 6px; color: var(--function-def-yellow); cursor: pointer;">
                    <input type="checkbox" id="toggle_functions" checked style="
                        accent-color: var(--function-def-yellow);
                        transform: scale(1.2);
                        cursor: pointer;
                    ">
                    <span>function(</span>
                </label>
                <label style="display: flex; align-items: center; gap: 6px; color: var(--function-call-orange); cursor: pointer;">
                    <input type="checkbox" id="toggle_methods" checked style="
                        accent-color: var(--function-call-orange);
                        transform: scale(1.2);
                        cursor: pointer;
                    ">
                    <span>function--></span>
                </label>
            </div>
            <select class="time_filter_select" id="time_filter_select">
                <option value="0" selected>All time</option>
                <option value="1">1 minute</option>
                <option value="5">5 minutes</option>
                <option value="15">15 minutes</option>
                <option value="60">1 hour</option>
                <option value="1440">1 day</option>
                <option value="10080">1 week</option>
            </select>
        </div>
    </div>
    
    <div id="content">
        <div class="big_stats">
            <span>Files: ${Object.keys(scan_result.files).length} | Functions: ${function_total_count(scan_result)} | Last scan: ${new Date(scan_result.last_scan).toLocaleTimeString()}</span>
        </div>
        ${outline_content}
    </div>
    
    <script>
        window.FILE_NAME = '${file_name}';
        window.LAST_MODIFIED = ${last_modified};
    </script>
    <script src="/js/utl_shared_client.js"></script>
    <script src="/js/utl_nav_client.js"></script>
    <script src="/js/outline_client.js"></script>
    <script src="/js/big_client.js"></script>
</body>
</html>`;
}

function outline_content_generate(scan_result) {
    // Build hierarchical structure
    const tree = folder_tree_build(scan_result.files);
    
    let html = '';
    let outline_counter = 1;
    
    // Render the tree recursively
    html = tree_node_render(tree, '', outline_counter, 0, []);
    
    return html;
}

function folder_tree_build(files) {
    const tree = {
        name: '.',
        type: 'folder',
        children: {},
        files: []
    };
    
    // Build the tree structure
    for (const [file_path, file_info] of Object.entries(files)) {
        const parts = file_path.split(path.sep);
        let current = tree;
        
        // Navigate/create folder structure
        for (let i = 0; i < parts.length - 1; i++) {
            const folder_name = parts[i];
            if (!current.children[folder_name]) {
                current.children[folder_name] = {
                    name: folder_name,
                    type: 'folder',
                    children: {},
                    files: []
                };
            }
            current = current.children[folder_name];
        }
        
        // Add file to current folder
        const file_name = parts[parts.length - 1];
        current.files.push({
            name: file_name,
            path: file_path,
            functions: file_info.functions,
            modified: file_info.modified,
            created: file_info.created
        });
    }
    
    return tree;
}

function tree_node_render(node, parent_outline, counter, indent_level, previousNames = []) {
    let html = '';
    let local_counter = counter;
    
    // Sort children: folders first, then files
    const sorted_folders = Object.keys(node.children).sort((a, b) => a.localeCompare(b));
    const sorted_files = node.files.sort((a, b) => a.name.localeCompare(b.name));
    
    // Determine if we should use numbers or letters based on indent level
    // Even levels (0, 2, 4...) use numbers, odd levels use letters
    const use_letters = indent_level % 2 === 1;
    
    // Track only the immediately previous name at this level for duplicate detection
    let previousName = null;
    
    // Render folders
    for (let i = 0; i < sorted_folders.length; i++) {
        const folder_name = sorted_folders[i];
        const folder = node.children[folder_name];
        const outline_num = use_letters ? 
            `${String.fromCharCode(97 + local_counter - 1)}.` : 
            `${local_counter}.`;
        const indent = indent_level * 60;
        
        let displayName = folder_name;
        previousName = folder_name;
        
        // Folder div - default to expanded (data-collapsed="false")
        html += `<div style="margin-left: ${indent}px; display: flex;" data-indent="${indent_level}" data-collapsed="false">`;
        html += `<span class="outline_line_number" style="min-width: 30px; flex-shrink: 0; cursor: pointer; user-select: none; margin-right: 4px; text-align: right;" data-original="${outline_num}">${outline_num}</span>`;
        html += `<span class="list_edit_text"><span class="big_folder_name">${displayName}</span><span class="big_folder_slash">/</span></span>`;
        html += `</div>`;
        
        // Render folder contents recursively
        html += tree_node_render(folder, outline_num, 1, indent_level + 1, []);
        
        local_counter++;
    }
    
    // Render files
    for (let i = 0; i < sorted_files.length; i++) {
        const file = sorted_files[i];
        const outline_num = use_letters ? 
            `${String.fromCharCode(97 + local_counter - 1)}.` : 
            `${local_counter}.`;
        const indent = indent_level * 60;
        
        const [basename, ext] = file.name.includes('.') ? 
            [file.name.substring(0, file.name.lastIndexOf('.')), file.name.substring(file.name.lastIndexOf('.'))] :
            [file.name, ''];
        
        let displayBasename = basename;
        previousName = file.name;
        
        // File div - default to expanded (data-collapsed="false")
        const modified_attr = file.modified ? ` data-modified="${Math.round(file.modified)}"` : '';
        const created_attr = file.created ? ` data-created="${Math.round(file.created)}"` : '';
        html += `<div style="margin-left: ${indent}px; display: flex;" data-indent="${indent_level}" data-collapsed="false"${modified_attr}${created_attr}>`;
        html += `<span class="outline_line_number" style="min-width: 30px; flex-shrink: 0; cursor: pointer; user-select: none; margin-right: 4px; text-align: right;" data-original="${outline_num}">${outline_num}</span>`;
        html += `<span class="list_edit_text"><span class="big_file_name">${displayBasename}</span><span class="big_file_ext">${ext}</span></span>`;
        html += `</div>`;
        
        // Render functions (always use the opposite of the parent level)
        if (file.functions && file.functions.length > 0) {
            const func_use_letters = (indent_level + 1) % 2 === 1;
            let previousFuncName = null;
            
            for (let j = 0; j < file.functions.length; j++) {
                const func = file.functions[j];
                const func_outline = func_use_letters ? 
                    `${String.fromCharCode(97 + j)}.` : 
                    `${j + 1}.`;
                const func_indent = (indent_level + 1) * 60;
                
                let displayFuncName = func.name;
                previousFuncName = func.name;
                
                html += `<div class="function_line" style="margin-left: ${func_indent}px; display: flex;" data-indent="${indent_level + 1}" data-collapsed="false">`;
                html += `<span class="outline_line_number" style="min-width: 30px; flex-shrink: 0; cursor: pointer; user-select: none; margin-right: 4px; text-align: right;" data-original="${func_outline}">${func_outline}</span>`;
                html += `<span class="list_edit_text"><span class="big_function_def_name">${displayFuncName}</span><span class="big_function_paren">(</span></span>`;
                html += `</div>`;
                
                // Render method calls if any
                if (func.calls && func.calls.length > 0) {
                    const method_indent = (indent_level + 2) * 60;
                    const method_use_letters = (indent_level + 2) % 2 === 1;
                    let previousMethodName = null;
                    
                    func.calls.forEach((called_func, index) => {
                        const method_outline = method_use_letters ? 
                            `${String.fromCharCode(97 + index)}.` : 
                            `${index + 1}.`;
                        
                        let displayMethodName = called_func;
                        previousMethodName = called_func;
                        
                        html += `<div class="method_calls" style="margin-left: ${method_indent}px; display: flex;" data-indent="${indent_level + 2}">`;
                        html += `<span style="min-width: 30px; flex-shrink: 0; margin-right: 4px; text-align: right; color: var(--gray);">${method_outline}</span>`;
                        html += `<span class="list_edit_text"><span class="big_function_call_name">${displayMethodName}</span><span class="big_function_call_arrow"> -></span></span>`;
                        html += `</div>`;
                    });
                }
            }
        }
        
        local_counter++;
    }
    
    return html;
}

// Removed old outline number functions - no longer needed with new tree structure

function function_total_count(scan_result) {
    let total = 0;
    for (const file_info of Object.values(scan_result.files)) {
        total += file_info.functions.length;
    }
    return total;
}

module.exports = { big_html_generate };