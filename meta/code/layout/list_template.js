// Template for generating list HTML pages

/**
 * Generate HTML content for list files (00_index and similar lists)
 * @param {string} li_elements - The generated <li> elements as HTML string
 * @param {string} config_key - Configuration key (e.g., '00_index')
 * @param {number} modification_time - Last modification timestamp
 * @returns {string} Complete HTML document
 */
function list_html_generate(li_elements, config_key, modification_time) {
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
    
    ul {
        counter-reset: item;
        padding-left:  30px;  /* Increased to align text start position with outline format */
        margin:        0;
        line-height:   1.5;
    }
    li {
        counter-increment: item;
        cursor:            pointer;
        padding:           2px 4px;
        padding-left:      4px;  /* Reduced from 8px, text will start at 20+30+4=54px matching outline */
        margin:            0;
        list-style-type:   none;
        position:          relative;
        color:             var(--text);
        transition:        background-color 0.15s ease;
        line-height:       inherit;
    }
    li.duplicate {
        color: var(--gray-dark);
    }
    li::before {
        content:  counter(item) ". ";
        position: absolute;
        left:     -25px;
        color:    var(--gray);
    }
    li:hover {
        background-color: var(--hover);
    }
    li.editing {
        /* No visual difference in edit mode - seamless editing */
        outline: none;
    }
    
    /* Split term styling */
    .list_term_duplicate {
        color: var(--gray-dark);
    }
    .list_term_unique {
        color: var(--text);
    }
    
    /* Two-column layout */
    .list_label_new {
        display: inline-block;
    }
    .list_label_old {
        color: #0a0a0a;  /* Almost black on dark background */
        font-family: inherit;
        display: inline-block;
        user-select: none;           /* Prevent text selection */
        -webkit-user-select: none;   /* Safari */
        -moz-user-select: none;      /* Firefox */
        -ms-user-select: none;       /* IE/Edge */
        pointer-events: none;        /* Make completely non-interactive */
        opacity: 0.3;               /* Make it even less visible */
    }
    
    /* Filter buttons in top right */
    .list_filter_controls {
        position: fixed;
        top: 20px;
        right: 20px;
        display: flex;
        gap: 10px;
        z-index: 1000;
    }
    
    .list_filter_btn {
        background-color: var(--green);
        color: white;
        border: none;
        padding: 8px 16px;
        cursor: pointer;
        border-radius: 4px;
        font-size: 16px;
        transition: opacity 0.2s ease;
        font-family: inherit;
    }
    
    .list_filter_btn:hover {
        opacity: 0.9;
    }
    
    .list_filter_btn.style_inactive {
        background-color: var(--gray);
        opacity: 0.7;
    }
    
    /* Hide filtered items */
    li.style_hidden {
        display: none;
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
    
    /* Push filter controls down when nav is present */
    .nav_controls + .list_filter_controls {
        top: 70px;
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
    
    <div class="list_filter_controls">
        <button class="list_filter_btn" id="functions-filter" data-filter="function" title="Toggle Functions">Functions</button>
        <button class="list_filter_btn" id="files-folders-filter" data-filter="files-folders" title="Toggle Files and Folders">Files and Folders</button>
        <button class="list_filter_btn" id="css-filter" data-filter="css" title="Toggle CSS Classes">CSS</button>
    </div>
    
    <ul id="list_content">
${li_elements}
    </ul>
    <script>
        // Configuration for the external script
        window.FILE_NAME = '${config_key}';
        window.LAST_MODIFIED = ${modification_time};
    </script>
    <script src="/js/nav_client.js"></script>
    <script src="/js/list_client.js"></script>
</body>
</html>`;
}

module.exports = { list_html_generate }; 