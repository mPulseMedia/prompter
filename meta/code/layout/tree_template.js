// Template for generating tree HTML page

/**
 * Generate HTML for tree page showing function relationships
 * @param {string} div_elements - The generated <div> elements as HTML string
 * @param {string} config_key - Configuration key (e.g., 'tree')
 * @param {number} modification_time - Last modification timestamp
 * @param {string} version - Current version string
 * @returns {string} Complete HTML document
 */
function tree_html_generate(div_elements, config_key, modification_time, version = 'v1.0.0') {
    return `<!DOCTYPE html>
<html>
<head>
<style>
    :root {
        --bg:          #1e1e1e;
        --text:        #ffffff;
        --gray:        #6e7681;
        --gray-dark:   #4e5561;
        --hover:       #2d2d2d;
        --edit-border: #007AFF;
        --green:       #2ea043;
        
        /* Cursor.ai syntax colors */
        --function-yellow: #dcdcaa;
        --file-blue:       #9cdcfe;
        --css-pink:        #ce9178;
        --comment-gray:    #8a8a8a;
    }
    
    body {
        background-color: var(--bg);
        color:            var(--text);
        font-family:      "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Menlo, Consolas, "Courier New", monospace;
        font-size:        18px;
        line-height:      1.5;
        margin:           0;
        padding:          20px;
        position:         relative;
    }
    
    /* Navigation controls - left justified */
    .nav_controls {
        position: fixed;
        top: 20px;
        left: 20px;
        display: flex;
        gap: 10px;
        z-index: 1001;
    }
    
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
    
    /* Version display in upper right */
    .version_display {
        position: fixed;
        top: 20px;
        right: 20px;
        color: var(--gray);
        font-size: 14px;
        font-family: inherit;
        z-index: 1001;
        opacity: 0.7;
    }
    
    /* Tree controls */
    .tree_controls {
        position: fixed;
        top: 70px;
        left: 20px;
        display: flex;
        gap: 10px;
        align-items: center;
        z-index: 1000;
        background-color: rgba(30, 30, 30, 0.95);
        padding: 12px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    
    .tree_function_select {
        background-color: var(--bg);
        color: var(--text);
        border: 1px solid var(--gray);
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 16px;
        font-family: inherit;
        cursor: pointer;
        min-width: 200px;
        transition: border-color 0.2s ease;
    }
    
    .tree_function_select:hover {
        border-color: var(--edit-border);
    }
    
    .tree_function_select:focus {
        outline: none;
        border-color: var(--edit-border);
        box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
    }
    
    .tree_controls label {
        color: var(--text);
        font-size: 14px;
        margin-right: 8px;
    }
    
    /* Tree content */
    #tree_content {
        margin-top: 140px;
        padding: 20px;
    }
    
    .tree_section {
        margin-bottom: 30px;
    }
    
    .tree_section_title {
        color: var(--function-yellow);
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 15px;
        border-bottom: 2px solid var(--function-yellow);
        padding-bottom: 5px;
    }
    
    .tree_function_item {
        margin: 8px 0;
        padding: 8px 12px;
        background-color: rgba(110, 118, 129, 0.1);
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .tree_function_item:hover {
        background-color: var(--hover);
        border-left: 3px solid var(--function-yellow);
        padding-left: 9px;
    }
    
    .tree_function_name {
        color: var(--function-yellow);
        font-weight: 500;
    }
    
    .tree_function_details {
        color: var(--gray);
        font-size: 14px;
    }
    
    /* Indentation for nested relationships */
    .tree_indent_1 { margin-left: 20px; }
    .tree_indent_2 { margin-left: 40px; }
    .tree_indent_3 { margin-left: 60px; }
    
    /* Empty state */
    .tree_empty_state {
        text-align: center;
        color: var(--gray);
        font-style: italic;
        margin-top: 50px;
        padding: 40px;
        border: 2px dashed var(--gray-dark);
        border-radius: 8px;
    }
    
    /* Loading state */
    .tree_loading {
        text-align: center;
        color: var(--gray);
        margin-top: 50px;
    }
</style>
</head>
<body>
    <div class="nav_controls">
        <button class="button_nav" data-nav="index" title="View Index">Index</button>
        <button class="button_nav" data-nav="function" title="View Functions">Function</button>
        <button class="button_nav" data-nav="web" title="View Web Relationships">Web</button>
        <button class="button_nav" data-nav="tree" title="View Function Tree">Tree</button>
        <button class="button_nav" data-nav="prompt" title="View Prompt">Prompt</button>
    </div>
    
    <div class="version_display">${version}</div>
    
    <div class="tree_controls">
        <label for="tree_function_select">Function:</label>
        <select class="tree_function_select" id="tree_function_select">
            <option value="">Select a function...</option>
        </select>
    </div>
    
    <div id="tree_content">
        <div class="tree_loading" id="tree_loading">
            Loading function data...
        </div>
        
        <div id="tree_display" style="display: none;">
            <div class="tree_section" id="tree_calls_section">
                <div class="tree_section_title">Calls (functions this function calls)</div>
                <div id="tree_calls_list"></div>
            </div>
            
            <div class="tree_section" id="tree_called_by_section">
                <div class="tree_section_title">Called By (functions that call this function)</div>
                <div id="tree_called_by_list"></div>
            </div>
        </div>
        
        <div class="tree_empty_state" id="tree_empty_state" style="display: none;">
            <h3>Select a function to view its relationships</h3>
            <p>Choose a function from the dropdown above to see what it calls and what calls it.</p>
        </div>
    </div>
    
    <script>
        // Configuration for the external script
        window.FILE_NAME = '${config_key}';
        window.LAST_MODIFIED = ${modification_time};
    </script>
    <script src="/js/shared_client.js"></script>
    <script src="/js/nav_client.js"></script>
    <script src="/js/tree_client.js"></script>
</body>
</html>`;
}

module.exports = { tree_html_generate };