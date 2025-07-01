// Debug client - UI for controlling debug groups

// Load debug manager functions from global scope
const DEBUG_GROUPS = window.DEBUG_GROUPS || {
    'all': 'All Debug Messages',
    'basic': 'Basic Operations',
    'ui': 'UI Interactions',
    'function': 'Function Calls',
    'sync': 'Server Sync',
    'filter': 'Filters & Search',
    'nav': 'Navigation',
    'outline': 'Outline Operations',
    'list': 'List Operations',
    'state': 'State Management',
    'perf': 'Performance'
};

// Initialize debug UI
function debug_ui_init() {
    debug_basic('debug_ui_init', 'Initializing debug UI');
    
    // Create main container
    const mainContainer = document.createElement('div');
    mainContainer.style.cssText = `
        display: flex;
        gap: 20px;
        margin: 20px;
        height: calc(100vh - 120px);
        font-family: monospace;
    `;
    
    // Create debug controls container (left side)
    const container = document.createElement('div');
    container.id = 'debug_controls';
    container.style.cssText = `
        flex: 0 0 400px;
        padding: 20px;
        background: #2d2d2d;
        border-radius: 8px;
        overflow-y: auto;
    `;
    
    // Add title
    const title = document.createElement('h2');
    title.textContent = 'Debug Configuration';
    title.style.color = '#fff';
    title.style.marginBottom = '20px';
    container.appendChild(title);
    
    // Create controls for each debug group
    Object.entries(DEBUG_GROUPS).forEach(([group, description]) => {
        const controlDiv = document.createElement('div');
        controlDiv.style.cssText = `
            margin: 10px 0;
            padding: 10px;
            background: #1e1e1e;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;
        
        // Group label
        const label = document.createElement('label');
        label.style.cssText = `
            color: #fff;
            cursor: pointer;
            flex: 1;
            display: flex;
            align-items: center;
        `;
        
        // Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `debug_${group}`;
        checkbox.checked = debug_is_enabled(group);
        checkbox.style.cssText = `
            width: 20px;
            height: 20px;
            margin-right: 15px;
            cursor: pointer;
        `;
        
        // Group name and description
        const textDiv = document.createElement('div');
        textDiv.innerHTML = `
            <div style="font-weight: bold; color: ${getGroupColor(group)};">
                ${group.toUpperCase()}
            </div>
            <div style="font-size: 12px; color: #888; margin-top: 2px;">
                ${description}
            </div>
        `;
        
        label.appendChild(checkbox);
        label.appendChild(textDiv);
        controlDiv.appendChild(label);
        
        // Status indicator
        const status = document.createElement('div');
        status.id = `debug_status_${group}`;
        status.style.cssText = `
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: ${checkbox.checked ? '#4CAF50' : '#666'};
            transition: background 0.3s;
        `;
        controlDiv.appendChild(status);
        
        // Event handler
        checkbox.addEventListener('change', function() {
            debug_group_set(group, this.checked);
            status.style.background = this.checked ? '#4CAF50' : '#666';
            
            // Update all checkboxes if 'all' was toggled
            if (group === 'all') {
                updateAllCheckboxes(this.checked);
            }
            
            // Show notification
            showDebugNotification(`${group.toUpperCase()} debugging ${this.checked ? 'enabled' : 'disabled'}`);
        });
        
        container.appendChild(controlDiv);
    });
    
    // Add button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 10px;
        margin-top: 20px;
    `;
    
    // Add test button
    const testButton = document.createElement('button');
    testButton.textContent = 'Test Debug Output';
    testButton.style.cssText = `
        flex: 1;
        padding: 10px 20px;
        background: #007ACC;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-family: monospace;
    `;
    testButton.addEventListener('click', testDebugOutput);
    
    // Add stress test button
    const stressButton = document.createElement('button');
    stressButton.textContent = 'Stress Test';
    stressButton.style.cssText = `
        flex: 1;
        padding: 10px 20px;
        background: #28a745;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-family: monospace;
    `;
    stressButton.addEventListener('click', () => {
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const groups = Object.keys(DEBUG_GROUPS).filter(g => g !== 'all');
                const randomGroup = groups[Math.floor(Math.random() * groups.length)];
                debug_log(randomGroup, 'stressTest', `Stress test message ${i + 1}`, {
                    iteration: i + 1,
                    timestamp: Date.now(),
                    random: Math.random()
                });
            }, i * 50);
        }
        showDebugNotification('Generating 50 test messages...');
    });
    
    buttonContainer.appendChild(testButton);
    buttonContainer.appendChild(stressButton);
    container.appendChild(buttonContainer);
    
    // Add instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = `
        margin-top: 20px;
        padding: 15px;
        background: #1e1e1e;
        border-radius: 4px;
        color: #888;
        font-size: 12px;
        line-height: 1.5;
    `;
    instructions.innerHTML = `
        <strong>Instructions:</strong><br>
        • Enable debug groups to see detailed console output<br>
        • Open browser console (F12) to view debug messages<br>
        • Debug settings are saved in localStorage<br>
        • Use 'ALL' to quickly enable/disable all groups
    `;
    container.appendChild(instructions);
    
    // Create log viewer container (right side)
    const logContainer = document.createElement('div');
    logContainer.id = 'debug_log_viewer';
    logContainer.style.cssText = `
        flex: 1;
        background: #1e1e1e;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    `;
    
    // Add log viewer header
    const logHeader = document.createElement('div');
    logHeader.style.cssText = `
        padding: 15px 20px;
        background: #2d2d2d;
        border-bottom: 1px solid #3e3e3e;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    
    const logTitle = document.createElement('h3');
    logTitle.textContent = 'Debug Log Output';
    logTitle.style.cssText = 'margin: 0; color: #fff;';
    
    const logControls = document.createElement('div');
    logControls.style.cssText = 'display: flex; gap: 10px;';
    
    // Add filter dropdown
    const filterSelect = document.createElement('select');
    filterSelect.id = 'log_filter_select';
    filterSelect.style.cssText = `
        padding: 5px 10px;
        background: #1e1e1e;
        color: #fff;
        border: 1px solid #3e3e3e;
        border-radius: 4px;
        cursor: pointer;
    `;
    
    const allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = 'All Groups';
    filterSelect.appendChild(allOption);
    
    Object.entries(DEBUG_GROUPS).forEach(([group, description]) => {
        if (group !== 'all') {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group.toUpperCase();
            filterSelect.appendChild(option);
        }
    });
    
    // Add clear button
    const clearButton = document.createElement('button');
    clearButton.textContent = 'Clear Log';
    clearButton.style.cssText = `
        padding: 5px 15px;
        background: #d73a49;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-family: monospace;
    `;
    clearButton.addEventListener('click', () => {
        debug_messages_clear();
        updateLogDisplay();
    });
    
    logControls.appendChild(filterSelect);
    logControls.appendChild(clearButton);
    logHeader.appendChild(logTitle);
    logHeader.appendChild(logControls);
    
    // Add log content area
    const logContent = document.createElement('div');
    logContent.id = 'debug_log_content';
    logContent.style.cssText = `
        flex: 1;
        padding: 10px;
        overflow-y: auto;
        font-size: 12px;
        line-height: 1.5;
    `;
    
    logContainer.appendChild(logHeader);
    logContainer.appendChild(logContent);
    
    // Add status bar
    const statusBar = document.createElement('div');
    statusBar.id = 'debug_status_bar';
    statusBar.style.cssText = `
        padding: 10px 20px;
        background: #2d2d2d;
        border-top: 1px solid #3e3e3e;
        color: #888;
        font-size: 12px;
    `;
    statusBar.textContent = 'Waiting for debug messages...';
    logContainer.appendChild(statusBar);
    
    // Insert into page
    const content = document.getElementById('list_content') || document.body;
    content.innerHTML = '';
    mainContainer.appendChild(container);
    mainContainer.appendChild(logContainer);
    content.appendChild(mainContainer);
    
    // Function to update log display
    function updateLogDisplay() {
        const selectedGroup = filterSelect.value;
        const messages = debug_messages_get(selectedGroup, 200);
        
        logContent.innerHTML = '';
        
        if (messages.length === 0) {
            logContent.innerHTML = '<div style="color: #666; text-align: center; margin-top: 20px;">No debug messages</div>';
            statusBar.textContent = 'No messages to display';
            return;
        }
        
        messages.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.style.cssText = `
                margin-bottom: 8px;
                padding: 5px 10px;
                background: rgba(255,255,255,0.03);
                border-left: 3px solid ${getGroupColor(msg.group)};
                word-wrap: break-word;
            `;
            
            const msgText = document.createElement('pre');
            msgText.style.cssText = `
                margin: 0;
                color: #ddd;
                white-space: pre-wrap;
            `;
            msgText.textContent = msg.fullText;
            msgDiv.appendChild(msgText);
            
            logContent.appendChild(msgDiv);
        });
        
        // Auto-scroll to bottom
        logContent.scrollTop = logContent.scrollHeight;
        
        // Update status
        statusBar.textContent = `Showing ${messages.length} messages${selectedGroup !== 'all' ? ` (${selectedGroup})` : ''}`;
    }
    
    // Set up message listener
    window.debug_message_listener = function(msg) {
        if (msg.type === 'clear') {
            updateLogDisplay();
        } else {
            // Update display if the new message matches current filter
            const selectedGroup = filterSelect.value;
            if (selectedGroup === 'all' || msg.group === selectedGroup) {
                updateLogDisplay();
            }
        }
    };
    
    // Filter change handler
    filterSelect.addEventListener('change', updateLogDisplay);
    
    // Initial display update
    updateLogDisplay();
    
    // Update display periodically to catch any missed messages
    setInterval(updateLogDisplay, 1000);
}

// Get color for debug group
function getGroupColor(group) {
    const colors = {
        'all': '#FFD700',
        'basic': '#4CAF50',
        'ui': '#2196F3',
        'function': '#FF9800',
        'sync': '#9C27B0',
        'filter': '#00BCD4',
        'nav': '#CDDC39',
        'outline': '#795548',
        'list': '#607D8B',
        'state': '#E91E63',
        'perf': '#F44336'
    };
    return colors[group] || '#888';
}

// Update all checkboxes when 'all' is toggled
function updateAllCheckboxes(checked) {
    Object.keys(DEBUG_GROUPS).forEach(group => {
        if (group !== 'all') {
            const checkbox = document.getElementById(`debug_${group}`);
            const status = document.getElementById(`debug_status_${group}`);
            if (checkbox) {
                checkbox.checked = checked;
                status.style.background = checked ? '#4CAF50' : '#666';
            }
        }
    });
}

// Show debug notification
function showDebugNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: #333;
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Test debug output
function testDebugOutput() {
    console.log('=== DEBUG TEST OUTPUT ===');
    
    debug_basic('testDebugOutput', 'Testing basic debug');
    debug_ui('testDebugOutput', 'Testing UI debug', {element: 'button', action: 'click'});
    debug_function('testDebugOutput', 'Testing function debug', {args: [1, 2, 3], return: 6});
    debug_sync('testDebugOutput', 'Testing sync debug', {status: 'connected', latency: '15ms'});
    debug_filter('testDebugOutput', 'Testing filter debug', {filter: 'function', count: 42});
    debug_nav('testDebugOutput', 'Testing nav debug', {from: 'index', to: 'debug'});
    
    debug_perf_start('test_operation');
    setTimeout(() => {
        debug_perf_end('test_operation', 'testDebugOutput');
    }, 100);
    
    console.log('=== END DEBUG TEST ===');
    showDebugNotification('Debug test complete - check console');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', debug_ui_init);
} else {
    debug_ui_init();
}