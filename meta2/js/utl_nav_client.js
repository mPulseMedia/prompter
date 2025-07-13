// Navigation functionality for meta HTML pages

// Map config keys to their navigation button names and URLs
const nav_config_map = {
    // Index pages
    'index': { button: 'index', url: '/html/index.html' },
    '00_index': { button: 'index', url: '/html/index.html' },
    'index_file': { button: 'index', url: '/html/index.html' },
    
    // Function pages
    'function': { button: 'function', url: '/html/function.html' },
    'functions_file': { button: 'function', url: '/html/function.html' },
    '02_function': { button: 'function', url: '/html/function.html' },
    
    // Web pages
    'web': { button: 'web', url: '/html/web.html' },
    'web_file': { button: 'web', url: '/html/web.html' },
    
    // Prompt pages
    'prompt': { button: 'prompt', url: '/html/prompt.html' },
    'start_file': { button: 'prompt', url: '/html/prompt.html' },
    '01_start': { button: 'prompt', url: '/html/prompt.html' },
    
    // Tree pages
    'tree': { button: 'tree', url: '/html/tree.html' },
    'tree_file': { button: 'tree', url: '/html/tree.html' },
    
    // Debug pages
    'debug': { button: 'debug', url: '/html/debug.html' },
    'debug_file': { button: 'debug', url: '/html/debug.html' },
    
    // Big pages
    'big': { button: 'big', url: '/html/big.html' },
    'big_file': { button: 'big', url: '/html/big.html' },
    
    // Sequence pages
    'sequence': { button: 'sequence', url: '/html/sequence.html' },
    'sequence_file': { button: 'sequence', url: '/html/sequence.html' }
};

// Define debug functions if not available
if (typeof debug_basic === 'undefined') {
    window.debug_basic = function() {};
    window.debug_nav = function() {};
    window.debug_ui = function() {};
    window.debug_sync = function() {};
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    debug_basic('nav_client', 'DOM loaded, initializing navigation');
    nav_init();
    version_websocket_init();
});

// Initialize navigation buttons
function nav_init() {
    debug_nav('nav_init', 'Starting navigation initialization');
    
    const navControls = document.querySelector('.nav_controls');
    if (!navControls) {
        debug_nav('nav_init', 'No nav controls found');
        return;
    }
    
    // Get current page from window.FILE_NAME
    const currentFile = window.FILE_NAME || '';
    const currentConfig = nav_config_map[currentFile];
    const currentButton = currentConfig ? currentConfig.button : 'index';
    
    debug_nav('nav_init', 'Current navigation state', {
        currentFile: currentFile,
        currentButton: currentButton,
        currentConfig: currentConfig
    });
    
    // Update active state
    const buttons = navControls.querySelectorAll('.button_nav');
    debug_nav('nav_init', `Found ${buttons.length} navigation buttons`);
    
    buttons.forEach(btn => {
        const buttonType = btn.getAttribute('data-nav');
        if (buttonType === currentButton) {
            btn.classList.add('style_active');
            debug_nav('nav_init', `Set ${buttonType} button as active`);
        } else {
            btn.classList.remove('style_active');
        }
        
        // Add click handler
        btn.addEventListener('click', () => {
            debug_ui('nav_button', `Button clicked: ${buttonType}`);
            nav_button_click(buttonType);
        });
    });
}

// Handle navigation button clicks
function nav_button_click(buttonType) {
    debug_nav('nav_button_click', `Processing navigation to ${buttonType}`);
    
    // Find the URL for the clicked button
    let targetUrl = null;
    
    switch(buttonType) {
        case 'index':
            targetUrl = '/html/index.html';
            break;
        case 'function':
            targetUrl = '/html/function.html';
            break;
        case 'web':
            targetUrl = '/html/web.html';
            break;
        case 'prompt':
            targetUrl = '/html/prompt.html';
            break;
        case 'tree':
            targetUrl = '/html/tree.html';
            break;
        case 'debug':
            targetUrl = '/html/debug.html';
            break;
        case 'big':
            targetUrl = '/html/big.html';
            break;
        case 'sequence':
            targetUrl = '/html/sequence.html';
            break;
    }
    
    if (targetUrl) {
        debug_nav('nav_button_click', `Navigating to ${targetUrl}`);
        // Navigate to the new page
        // For meta2, use relative navigation
        const currentPath = window.location.pathname;
        const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
        window.location.href = basePath + targetUrl.replace('/html/', '/');
    } else {
        debug_nav('nav_button_click', `No target URL found for ${buttonType}`);
    }
}

// Initialize WebSocket for version updates
function version_websocket_init() {
    // WebSocket disabled for meta2 (static files only)
    return;
    
    debug_sync('version_websocket_init', 'Initializing version WebSocket');
    const ws = new WebSocket('ws://localhost:3002');
    
    ws.addEventListener('open', () => {
        console.log('WebSocket connected for version updates');
        debug_sync('version_websocket_init', 'WebSocket connected successfully');
    });
    
    ws.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data);
            
            // Handle version update messages
            if (data.type === 'version_update') {
                version_display_update(data.version, data.details);
            }
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    });
    
    ws.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        debug_sync('version_websocket_init', 'WebSocket error', {error: error.message || error});
    });
    
    ws.addEventListener('close', () => {
        console.log('WebSocket disconnected, attempting reconnect...');
        // Reconnect after 2 seconds
        setTimeout(version_websocket_init, 2000);
    });
}

// Update version display
function version_display_update(version, details) {
    debug_ui('version_display_update', 'Updating version display', {version, details});
    
    const versionElement = document.querySelector('.page_version');
    if (versionElement) {
        versionElement.textContent = version;
        
        // Log details to console for monitoring
        if (details) {
            console.log(`Version Update Details:
- Page: ${details.page}
- HTML lines changed: ${details.html_lines_changed}
- Source file lines: ${details.source_lines}
- Time: ${details.timestamp}`);
        }
        
        // Add a brief highlight effect
        versionElement.style.transition = 'all 0.3s ease';
        versionElement.style.backgroundColor = '#2ea043';
        versionElement.style.opacity = '1';
        
        // Add tooltip with details
        if (details) {
            versionElement.title = `Last update: ${details.page} (${details.html_lines_changed} lines) at ${details.timestamp}`;
        }
        
        setTimeout(() => {
            versionElement.style.backgroundColor = '';
            versionElement.style.opacity = '';
        }, 1000);
    }
}

// Export for use in templates if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { nav_init, nav_button_click };
} 