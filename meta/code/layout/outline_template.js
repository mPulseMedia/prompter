// Template for generating start file HTML page

/**
 * Generate HTML for outline format pages (start, function, web)
 * @param {string} div_elements - The generated <div> elements as HTML string
 * @param {string} config_key - Configuration key (e.g., 'start_file')
 * @param {number} modification_time - Last modification timestamp
 * @returns {string} Complete HTML document
 */
function outline_html_generate(div_elements, config_key, modification_time) {
    return `<!DOCTYPE html>
<html>
<head>
<style>
    :root {
        --bg:          #1e1e1e;
        --text:        #ffffff;
        --gray:        #6e7681;
        --gray-dark:   #4e5561;  /* Mid-level dark gray for duplicates */
        --hover:       #2d2d2d;
        --edit-border: #007AFF;
        --green:       #2ea043;
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
    
    /* Control buttons in top right */
    .controls {
        position: fixed;
        top: 70px;
        right: 20px;
        display: flex;
        gap: 10px;
        z-index: 1000;
    }
    
    .button_tool {
        background-color: var(--gray);
        color: white;
        border: none;
        padding: 8px 16px;
        cursor: pointer;
        border-radius: 4px;
        font-size: 16px;
        transition: opacity 0.2s ease;
        font-family: inherit;
        opacity: 0.7;
    }
    
    .button_tool:hover {
        opacity: 0.9;
    }
    
    .outline_expand_icon {
        display: inline-block;
        width: 0;
        height: 0;
        border-style: solid;
        border-width: 5px 5px 0 5px;
        border-color: white transparent transparent transparent;
        vertical-align: middle;
    }
    
    .outline_collapse_icon {
        display: inline-block;
        width: 0;
        height: 0;
        border-style: solid;
        border-width: 0 5px 5px 5px;
        border-color: transparent transparent white transparent;
        vertical-align: middle;
    }
    
    /* Navigation controls */
    .nav_controls {
        position: fixed;
        top: 20px;
        right: 20px;
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
    
    /* Push controls down when nav is present */
    .nav_controls + .controls {
        top: 70px;
    }
    
    /* Outline specific styles */
    .outline_line_number {
        min-width: 30px;
        flex-shrink: 0;
        cursor: pointer;
        user-select: none;
        margin-right: 4px;
        text-align: right;
    }
    
    .list_edit_text {
        flex: 1;
    }
    
    .list_editing_mode {
        /* No visual difference in edit mode - seamless editing */
        outline: none;
    }
</style>
</head>
<body>
    <div class="nav_controls">
        <button class="button_nav" data-nav="index" title="View Index">Index</button>
        <button class="button_nav" data-nav="function" title="View Functions">Function</button>
        <button class="button_nav" data-nav="web" title="View Web Relationships">Web</button>
        <button class="button_nav" data-nav="prompt" title="View Prompt">Prompt</button>
    </div>
    
    <div class="controls">
        <button class="button_tool outline_collapse_icon" id="collapse-all-btn" title="Collapse All"></button>
        <button class="button_tool" id="expand-level-2-btn" title="Expand to Level 2">2</button>
        <button class="button_tool outline_expand_icon" id="expand-all-btn" title="Expand All"></button>
    </div>
    
    <div id="content">
${div_elements}
    </div>
    <script>
        // Configuration for the external script
        window.FILE_NAME = '${config_key}';
        window.LAST_MODIFIED = ${modification_time};
    </script>
    <script src="/js/nav_client.js"></script>
    <script src="/js/outline_client.js"></script>
</body>
</html>`;
}

module.exports = { outline_html_generate }; 