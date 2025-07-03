// Tree page client functionality

console.log('Tree client JavaScript loaded');

// Global state
let tree_function_data = new Map(); // Map<function_name, {calls: [], called_by: []}>
let tree_current_function = null;

// Initialize tree page
function tree_init() {
    tree_function_load();
    tree_dropdown_setup();
}

// Load function data from index page
async function tree_function_load() {
    try {
        console.log('Loading function data from index...');
        
        // Fetch the index page to get function list
        const response = await fetch('/tool/index.html');
        const html = await response.text();
        
        // Parse HTML to extract function data
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Find all function list items
        const functionItems = doc.querySelectorAll('li[data-type="function"]');
        
        console.log(`Found ${functionItems.length} functions in index`);
        
        // Extract function names
        const functions = [];
        functionItems.forEach(item => {
            const fullText = item.getAttribute('data-fulltext');
            if (fullText) {
                functions.push(fullText);
            }
        });
        
        // Initialize function data map
        functions.forEach(func => {
            tree_function_data.set(func, {
                calls: [],
                called_by: []
            });
        });
        
        // Populate dropdown
        tree_dropdown_populate(functions);
        
        // Hide loading, show empty state
        document.getElementById('tree_loading').style.display = 'none';
        document.getElementById('tree_empty_state').style.display = 'block';
        
        console.log('Function data loaded successfully');
        
    } catch (error) {
        console.error('Error loading function data:', error);
        document.getElementById('tree_loading').textContent = 'Error loading function data';
    }
}

// Populate function dropdown
function tree_dropdown_populate(functions) {
    const select = document.getElementById('tree_function_select');
    if (!select) return;
    
    // Clear existing options except the first one
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    // Sort functions alphabetically
    functions.sort();
    
    // Add function options
    functions.forEach(func => {
        const option = document.createElement('option');
        option.value = func;
        option.textContent = func;
        select.appendChild(option);
    });
    
    console.log(`Populated dropdown with ${functions.length} functions`);
}

// Setup dropdown event listener
function tree_dropdown_setup() {
    const select = document.getElementById('tree_function_select');
    if (!select) return;
    
    select.addEventListener('change', function() {
        const selectedFunction = this.value;
        if (selectedFunction) {
            tree_function_display(selectedFunction);
        } else {
            tree_display_hide();
        }
    });
}

// Display function relationships
function tree_function_display(functionName) {
    console.log(`Displaying relationships for: ${functionName}`);
    
    tree_current_function = functionName;
    
    // Hide empty state, show display
    document.getElementById('tree_empty_state').style.display = 'none';
    document.getElementById('tree_display').style.display = 'block';
    
    // For now, create mock data based on function name patterns
    // In a real implementation, this would come from actual code analysis
    const mockData = tree_mock_data_generate(functionName);
    
    // Display calls
    tree_calls_display(mockData.calls);
    
    // Display called_by
    tree_called_by_display(mockData.called_by);
}

// Generate mock relationship data
function tree_mock_data_generate(functionName) {
    const allFunctions = Array.from(tree_function_data.keys());
    
    // Generate plausible relationships based on naming patterns
    const calls = [];
    const called_by = [];
    
    // Functions this function might call (based on naming patterns)
    if (functionName.includes('_init')) {
        calls.push('document.addEventListener');
        calls.push('element_setup');
    }
    
    if (functionName.includes('_setup')) {
        calls.push('element_find');
        calls.push('event_listener_add');
    }
    
    if (functionName.includes('_display')) {
        calls.push('element_update');
        calls.push('content_generate');
    }
    
    if (functionName.includes('_load')) {
        calls.push('fetch');
        calls.push('data_parse');
    }
    
    // Functions that might call this function
    if (functionName.includes('_update')) {
        called_by.push('event_handler');
        called_by.push('refresh_function');
    }
    
    if (functionName.includes('_generate')) {
        called_by.push('display_function');
        called_by.push('render_function');
    }
    
    // Add some related functions from the actual function list
    const nameParts = functionName.split('_');
    const basePattern = nameParts[0];
    
    allFunctions.forEach(func => {
        if (func !== functionName && func.startsWith(basePattern)) {
            if (Math.random() < 0.3) { // 30% chance
                if (Math.random() < 0.5) {
                    calls.push(func);
                } else {
                    called_by.push(func);
                }
            }
        }
    });
    
    return { calls: calls.slice(0, 5), called_by: called_by.slice(0, 5) };
}

// Display functions this function calls
function tree_calls_display(calls) {
    const container = document.getElementById('tree_calls_list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (calls.length === 0) {
        container.innerHTML = '<div class="tree_function_item"><span class="tree_function_details">No function calls found</span></div>';
        return;
    }
    
    calls.forEach(func => {
        const item = document.createElement('div');
        item.className = 'tree_function_item';
        
        const isExternalFunction = !tree_function_data.has(func);
        
        item.innerHTML = `
            <span class="tree_function_name">${func}</span>
            <span class="tree_function_details">${isExternalFunction ? '(external)' : '(internal)'}</span>
        `;
        
        // Add click handler for internal functions
        if (!isExternalFunction) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                tree_function_navigate(func);
            });
        }
        
        container.appendChild(item);
    });
}

// Display functions that call this function
function tree_called_by_display(called_by) {
    const container = document.getElementById('tree_called_by_list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (called_by.length === 0) {
        container.innerHTML = '<div class="tree_function_item"><span class="tree_function_details">No calling functions found</span></div>';
        return;
    }
    
    called_by.forEach(func => {
        const item = document.createElement('div');
        item.className = 'tree_function_item';
        
        const isExternalFunction = !tree_function_data.has(func);
        
        item.innerHTML = `
            <span class="tree_function_name">${func}</span>
            <span class="tree_function_details">${isExternalFunction ? '(external)' : '(internal)'}</span>
        `;
        
        // Add click handler for internal functions
        if (!isExternalFunction) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                tree_function_navigate(func);
            });
        }
        
        container.appendChild(item);
    });
}


// Navigate to another function
function tree_function_navigate(functionName) {
    const select = document.getElementById('tree_function_select');
    if (select) {
        select.value = functionName;
        tree_function_display(functionName);
    }
}

// Hide tree display
function tree_display_hide() {
    document.getElementById('tree_display').style.display = 'none';
    document.getElementById('tree_empty_state').style.display = 'block';
    tree_current_function = null;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tree_init);
} else {
    tree_init();
}

// Export functions for debugging
window.tree_debug = {
    function_data: tree_function_data,
    current_function: () => tree_current_function,
    navigate: tree_function_navigate,
    display: tree_function_display
};