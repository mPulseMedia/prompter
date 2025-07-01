// Template for generating start file HTML page

/**
 * Generate HTML for outline format pages (start, function, web)
 * @param {string} div_elements - The generated <div> elements as HTML string
 * @param {string} config_key - Configuration key (e.g., 'start_file')
 * @param {number} modification_time - Last modification timestamp
 * @param {string} version - Current version string
 * @returns {string} Complete HTML document
 */
function outline_html_generate(div_elements, config_key, modification_time, version = 'v1.0.0') {
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
        margin-top: 140px;  /* Space for nav (50px) + controls (70px) + padding */
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
    
    /* Button text styling */
    .control_button {
        font-size: 18px;
        line-height: 1;
    }
    
    /* Make "All" button slightly wider */
    .control_button:last-child {
        width: auto;
        min-width: 60px;
        padding: 12px 16px;
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
    
    
    /* Navigation controls - left justified */
    .nav_controls {
        padding: 20px;
        padding-bottom: 0;
        display: flex;
        gap: 10px;
        align-items: center;
    }
    
    /* Page version */
    .page_version {
        margin-left: auto;
        color: var(--gray);
        font-size: 12px;
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
    <div class="header_area">
        <div class="nav_controls">
        <button class="button_nav" data-nav="index" title="View Index">Index</button>
        <button class="button_nav" data-nav="big" title="View Function Hierarchy">Big</button>
        <button class="button_nav" data-nav="function" title="View Functions">Function</button>
        <button class="button_nav" data-nav="web" title="View Web Relationships">Web</button>
        <button class="button_nav" data-nav="tree" title="View Function Tree">Tree</button>
        <button class="button_nav" data-nav="debug">Debug</button>
        <button class="button_nav" data-nav="prompt" title="View Prompt">Prompt</button>
        <div class="page_version">${version}</div>
        </div>
        
        <!-- Outline Control Buttons -->
        <div class="outline_controls">
        <button class="control_button" id="button_expand_level_1" title="Show Level 1 Only">1</button>
        <button class="control_button" id="button_expand_level_2" title="Show Levels 1-2">2</button>
        <button class="control_button" id="button_expand_all" title="Show All Levels">All</button>
        </div>
    </div>
    
    <div id="content">
${div_elements}
    </div>
    <script>
        // Configuration for the external script
        window.FILE_NAME = '${config_key}';
        window.LAST_MODIFIED = ${modification_time};
    </script>
    <script src="/js/shared_client.js"></script>
    <script src="/js/nav_client.js"></script>
    <script src="/js/outline_client.js"></script>
</body>
</html>`;
}

module.exports = { outline_html_generate }; 