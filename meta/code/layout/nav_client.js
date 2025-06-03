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
    'start_file': { button: 'prompt', url: '/prompt/01_start.html' },
    '01_start': { button: 'prompt', url: '/prompt/01_start.html' }
};

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    nav_init();
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
    const buttons = navControls.querySelectorAll('.nav_btn');
    buttons.forEach(btn => {
        const buttonType = btn.getAttribute('data-nav');
        if (buttonType === currentButton) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
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
            targetUrl = '/prompt/01_start.html';
            break;
    }
    
    if (targetUrl) {
        // Navigate to the new page
        window.location.href = `http://localhost:3002${targetUrl}`;
    }
}

// Export for use in templates if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { nav_init, nav_button_click };
} 