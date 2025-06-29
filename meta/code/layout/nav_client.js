// Navigation functionality for meta HTML pages

// Map config keys to their navigation button names and URLs
const nav_config_map = {
    // Index pages
    'index': { button: 'index', url: '/tool/index.html' },
    '00_index': { button: 'index', url: '/tool/index.html' },
    'index_file': { button: 'index', url: '/tool/index.html' },
    
    // Function pages
    'function': { button: 'function', url: '/tool/function.html' },
    'functions_file': { button: 'function', url: '/tool/function.html' },
    '02_function': { button: 'function', url: '/tool/function.html' },
    
    // Web pages
    'web': { button: 'web', url: '/tool/web.html' },
    'web_file': { button: 'web', url: '/tool/web.html' },
    
    // Prompt pages
    'prompt': { button: 'prompt', url: '/tool/prompt.html' },
    'start_file': { button: 'prompt', url: '/tool/prompt.html' },
    '01_start': { button: 'prompt', url: '/tool/prompt.html' },
    
    // Tree pages
    'tree': { button: 'tree', url: '/tool/tree.html' },
    'tree_file': { button: 'tree', url: '/tool/tree.html' }
};

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    nav_init();
    version_websocket_init();
});

// Initialize navigation buttons
function nav_init() {
    const navControls = document.querySelector('.nav_controls');
    if (!navControls) return;
    
    // Get current page from window.FILE_NAME
    const currentFile = window.FILE_NAME || '';
    const currentConfig = nav_config_map[currentFile];
    const currentButton = currentConfig ? currentConfig.button : 'index';
    
    // Update active state
    const buttons = navControls.querySelectorAll('.button_nav');
    buttons.forEach(btn => {
        const buttonType = btn.getAttribute('data-nav');
        if (buttonType === currentButton) {
            btn.classList.add('style_active');
        } else {
            btn.classList.remove('style_active');
        }
        
        // Add click handler
        btn.addEventListener('click', () => nav_button_click(buttonType));
    });
}

// Handle navigation button clicks
function nav_button_click(buttonType) {
    // Find the URL for the clicked button
    let targetUrl = null;
    
    switch(buttonType) {
        case 'index':
            targetUrl = '/tool/index.html';
            break;
        case 'function':
            targetUrl = '/tool/function.html';
            break;
        case 'web':
            targetUrl = '/tool/web.html';
            break;
        case 'prompt':
            targetUrl = '/tool/prompt.html';
            break;
        case 'tree':
            targetUrl = '/tool/tree.html';
            break;
    }
    
    if (targetUrl) {
        // Navigate to the new page
        window.location.href = `http://localhost:3002${targetUrl}`;
    }
}

// Initialize WebSocket for version updates
function version_websocket_init() {
    const ws = new WebSocket('ws://localhost:3002');
    
    ws.addEventListener('open', () => {
        console.log('WebSocket connected for version updates');
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
    });
    
    ws.addEventListener('close', () => {
        console.log('WebSocket disconnected, attempting reconnect...');
        // Reconnect after 2 seconds
        setTimeout(version_websocket_init, 2000);
    });
}

// Update version display
function version_display_update(version, details) {
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