// Template for generating debug HTML page
const { CSS_VARIABLES } = require('./utl_color_constants');

/**
 * Generate HTML content for debug page
 * @param {string} config_key - Configuration key (e.g., 'debug_file')
 * @param {number} modification_time - Last modification timestamp
 * @param {string} version - Current version string
 * @returns {string} Complete HTML document
 */
function debug_html_generate(config_key, modification_time, version = 'v1.0.0') {
    return `<!DOCTYPE html>
<html>
<head>
<style>
${CSS_VARIABLES}
    
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

    /* Navigation controls */
    .nav_controls {
        padding: 20px;
        padding-bottom: 0;
        display: flex;
        gap: 10px;
        align-items: center;
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

    /* Page version */
    .page_version {
        margin-left: auto;
        color: var(--gray);
        font-size: 12px;
    }

    /* Debug specific styles */
    #list_content {
        padding: 20px;
        margin-top: 60px;  /* Space for nav controls */
    }
</style>
</head>
<body>
    <div class="header_area">
        <div class="nav_controls">
            <button class="button_nav" data-nav="index">Index</button>
            <button class="button_nav" data-nav="big">Big</button>
            <button class="button_nav" data-nav="function">Function</button>
            <button class="button_nav" data-nav="web">Web</button>
            <button class="button_nav" data-nav="tree">Tree</button>
            <button class="button_nav" data-nav="debug">Debug</button>
            <button class="button_nav" data-nav="prompt">Prompt</button>
            <div class="page_version">${version}</div>
        </div>
    </div>
    
    <div id="list_content"></div>
    
    <script>
        window.FILE_NAME = '${config_key}';
        window.LAST_MODIFIED = ${modification_time};
    </script>
    <script src="/js/utl_shared_client.js"></script>
    <script src="/js/utl_nav_client.js"></script>
    <script src="/js/debug_client.js"></script>
</body>
</html>`;
}

module.exports = { debug_html_generate };