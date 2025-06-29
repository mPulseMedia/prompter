// Template for generating list HTML pages

/**
 * Generate HTML content for list files (00_index and similar lists)
 * @param {string} li_elements - The generated <li> elements as HTML string
 * @param {string} config_key - Configuration key (e.g., '00_index')
 * @param {number} modification_time - Last modification timestamp
 * @param {string} version - Current version string
 * @returns {string} Complete HTML document
 */
function list_html_generate(li_elements, config_key, modification_time, version = 'v1.0.0') {
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
        
        /* Cursor.ai syntax colors */
        --function-yellow: #dcdcaa;  /* Function name yellow */
        --file-blue:       #9cdcfe;  /* Variable/file light blue */
        --css-pink:        #ce9178;  /* String/class pinkish */
        --comment-gray:    #8a8a8a;  /* Lighter gray for comments */
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
        cursor: pointer;
    }
    
    /* Expandable function items */
    li[data-type="function"] {
        cursor: pointer;
        position: relative;
    }
    
    li[data-type="function"].expanded::before {
        content: counter(item) "> ";
    }
    
    /* Visual feedback for hovering over function numbers */
    li[data-type="function"]:hover::before {
        color: var(--function-yellow);
    }
    
    /* Function relationship outline */
    .function_relationships {
        margin-left: 30px;
        margin-top: 8px;
        margin-bottom: 8px;
        font-size: 14px;
        display: none;
    }
    
    li.expanded .function_relationships {
        display: block;
    }
    
    .function_outline_item {
        margin: 4px 0;
        color: var(--text);
        display: flex;
        align-items: baseline;
    }
    
    .function_outline_number {
        color: var(--gray);
        margin-right: 8px;
        min-width: 20px;
    }
    
    .function_outline_item.indent1 {
        margin-left: 20px;
    }
    
    .function_outline_item.indent2 {
        margin-left: 40px;
    }
    
    .function_relationship_type {
        color: var(--comment-gray);
        font-style: italic;
    }
    
    .function_reference {
        color: var(--function-yellow);
    }
    
    .exogenous_reference {
        color: var(--gray);
        font-style: italic;
    }
    li:hover {
        background-color: var(--hover);
    }
    li.editing {
        /* No visual difference in edit mode - seamless editing */
        outline: none;
    }
    
    /* Split term styling - duplicate parts always gray */
    .list_term_duplicate {
        color: var(--gray) !important;  /* Always gray, override parent color */
    }
    .list_term_unique {
        /* Color inherited from parent li based on data-type */
    }
    
    /* Item type colors - apply to whole item or unique part */
    li[data-type="function"]:not(:has(.list_term_duplicate)),
    li[data-type="function"] > span.list_term_unique {
        color: var(--function-yellow);
    }
    li[data-type="file"]:not(:has(.list_term_duplicate)),
    li[data-type="file"] > span.list_term_unique,
    li[data-type="folder"]:not(:has(.list_term_duplicate)),
    li[data-type="folder"] > span.list_term_unique {
        color: var(--file-blue);
    }
    li[data-type="css"]:not(:has(.list_term_duplicate)),
    li[data-type="css"] > span.list_term_unique {
        color: var(--css-pink);
    }
    li[data-type="comment"]:not(:has(.list_term_duplicate)),
    li[data-type="comment"] > span.list_term_unique {
        color: var(--comment-gray);
    }
    
    /* Type indicators (extensions, slashes, parentheses) always darker gray */
    li span[style*="color: #6e7681"] {
        color: var(--gray) !important;
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
    
    /* Filter checkboxes - left justified below nav */
    .list_filter_controls {
        position: fixed;
        top: 70px;  /* Below nav controls */
        left: 20px;
        display: flex;
        gap: 20px;
        z-index: 1000;
    }
    
    .filter_checkbox_container {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 16px;
        font-family: inherit;
    }
    
    .filter_checkbox {
        appearance: none;
        -webkit-appearance: none;
        width: 20px;
        height: 20px;
        border: 2px solid;
        border-radius: 4px;
        cursor: pointer;
        position: relative;
        transition: all 0.2s ease;
    }
    
    /* Simple X styling with two lines */
    .filter_checkbox:checked::before,
    .filter_checkbox:checked::after {
        content: '';
        position: absolute;
        width: 12px;
        height: 2px;
        background-color: currentColor;
        top: 50%;
        left: 50%;
    }
    
    .filter_checkbox:checked::before {
        transform: translate(-50%, -50%) rotate(45deg);
    }
    
    .filter_checkbox:checked::after {
        transform: translate(-50%, -50%) rotate(-45deg);
    }
    
    /* Individual checkbox colors */
    #filter_files_folders {
        border-color: var(--file-blue);
        background-color: transparent;
    }
    #filter_files_folders:checked {
        background-color: var(--file-blue);
        border-color: var(--file-blue);
    }
    #filter_files_folders:checked::after {
        color: #1e1e1e;
    }
    .filter_checkbox_container:has(#filter_files_folders) .filter_label {
        color: var(--file-blue);
    }
    
    #filter_functions {
        border-color: var(--function-yellow);
        background-color: transparent;
    }
    #filter_functions:checked {
        background-color: var(--function-yellow);
        border-color: var(--function-yellow);
    }
    #filter_functions:checked::after {
        color: #1e1e1e;
    }
    .filter_checkbox_container:has(#filter_functions) .filter_label {
        color: var(--function-yellow);
    }
    
    #filter_css {
        border-color: var(--css-pink);
        background-color: transparent;
    }
    #filter_css:checked {
        background-color: var(--css-pink);
        border-color: var(--css-pink);
    }
    #filter_css:checked::after {
        color: white;
    }
    .filter_checkbox_container:has(#filter_css) .filter_label {
        color: var(--css-pink);
    }
    
    #filter_comments {
        border-color: var(--comment-gray);
        background-color: transparent;
    }
    #filter_comments:checked {
        background-color: var(--comment-gray);
        border-color: var(--comment-gray);
    }
    #filter_comments:checked::after {
        color: #1e1e1e;
    }
    .filter_checkbox_container:has(#filter_comments) .filter_label {
        color: var(--comment-gray);
    }
    
    .filter_checkbox:hover {
        opacity: 0.8;
    }
    
    /* Hide filtered items */
    li.style_hidden {
        display: none;
    }
    
    /* Hide time-filtered items */
    li.style_time_hidden {
        display: none;
    }
    
    /* Search and time filter controls - side by side on left */
    .search_controls {
        position: fixed;
        top: 120px;  /* Below type filter buttons */
        left: 20px;
        z-index: 1000;
        display: flex;
        gap: 10px;
        align-items: center;
    }
    
    .search_input_container {
        position: relative;
        display: inline-block;
    }
    
    .search_input {
        background-color: var(--bg);
        color: var(--text);
        border: 1px solid var(--gray);
        padding: 8px 40px 8px 12px;  /* Extra padding on right for clear button */
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
        display: none;  /* Hidden by default */
        align-items: center;
        justify-content: center;
        transition: color 0.2s ease;
        line-height: 1;
    }
    
    .search_clear:hover {
        color: var(--text);
    }
    
    .search_clear.search_clear_visible {
        display: flex;
    }
    
    /* Time filter dropdown - same size as search */
    .time_filter_select {
        background-color: var(--bg);
        color: var(--text);
        border: 1px solid var(--gray);
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 16px;
        font-family: inherit;
        cursor: pointer;
        width: 150px;  /* Fixed width to match search proportion */
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
    
    /* Radio button styling for time type */
    .time_type_radio_group {
        display: flex;
        gap: 15px;
        align-items: center;
    }
    
    .time_type_radio_container {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 16px;
        font-family: inherit;
        color: var(--text);
    }
    
    .time_type_radio {
        appearance: none;
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        border: 2px solid var(--gray);
        border-radius: 50%;
        cursor: pointer;
        position: relative;
        transition: all 0.2s ease;
    }
    
    .time_type_radio:checked {
        border-color: var(--edit-border);
        background-color: var(--edit-border);
    }
    
    .time_type_radio:checked::after {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background-color: white;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }
    
    .time_type_radio:hover {
        border-color: var(--edit-border);
    }
    
    .time_type_label {
        user-select: none;
    }
    
    /* Time indicator styling */
    li.time_recent {
        border-left: 3px solid var(--green);
        padding-left: 8px;
    }
    
    li.time_modified_recent {
        border-left: 3px solid var(--edit-border);
        padding-left: 8px;
    }
    
    /* Hide search-filtered items */
    li.search_hidden {
        display: none;
    }
    
    /* Push content down - reduced spacing with new layout */
    #list_content {
        margin-top: 170px;  /* Account for three control rows */
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
    
    <div class="list_filter_controls">
        <label class="filter_checkbox_container">
            <input type="checkbox" class="filter_checkbox" id="filter_files_folders" data-filter="files-folders" checked>
            <span class="filter_label">Files & Folders</span>
        </label>
        <label class="filter_checkbox_container">
            <input type="checkbox" class="filter_checkbox" id="filter_functions" data-filter="function" checked>
            <span class="filter_label">Functions</span>
        </label>
        <label class="filter_checkbox_container">
            <input type="checkbox" class="filter_checkbox" id="filter_css" data-filter="css" checked>
            <span class="filter_label">CSS Classes</span>
        </label>
        <label class="filter_checkbox_container">
            <input type="checkbox" class="filter_checkbox" id="filter_comments" data-filter="comment" checked>
            <span class="filter_label">Comments</span>
        </label>
    </div>
    
    <div class="search_controls">
        <div class="search_input_container">
            <input type="text" class="search_input" id="search_input" placeholder="">
            <button class="search_clear" id="search_clear">X</button>
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
        <div class="time_type_radio_group">
            <label class="time_type_radio_container">
                <input type="radio" name="time_type" value="created" id="time_type_created" class="time_type_radio">
                <span class="time_type_label">Created</span>
            </label>
            <label class="time_type_radio_container">
                <input type="radio" name="time_type" value="modified" id="time_type_modified" class="time_type_radio" checked>
                <span class="time_type_label">Modified</span>
            </label>
        </div>
    </div>
    
    <ul id="list_content">
${li_elements}
    </ul>
    <script>
        // Configuration for the external script
        window.FILE_NAME = '${config_key}';
        window.LAST_MODIFIED = ${modification_time};
    </script>
    <script src="/js/shared_client.js"></script>
    <script src="/js/nav_client.js"></script>
    <script src="/js/simple_filters.js"></script>
    <script src="/js/time_filter_client.js"></script>
</body>
</html>`;
}

module.exports = { list_html_generate }; 