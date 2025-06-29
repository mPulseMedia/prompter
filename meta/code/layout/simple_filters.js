// SIMPLE WORKING FILTERS - NO FANCY STUFF
console.log('SIMPLE FILTERS LOADING!');

// Global state
let filterState = {
    search: '',
    functions: true,
    files: true,
    css: true,
    comments: true
};

// Apply all filters
function applyAllFilters() {
    console.log('APPLYING FILTERS:', filterState);
    
    const items = document.querySelectorAll('#list_content li');
    let visibleCount = 0;
    
    items.forEach(item => {
        const text = item.getAttribute('data-fulltext') || '';
        const type = item.getAttribute('data-type') || '';
        
        // Check search
        const matchesSearch = filterState.search === '' || text.toLowerCase().includes(filterState.search.toLowerCase());
        
        // Check type filters
        let matchesType = false;
        if (type === 'function' && filterState.functions) matchesType = true;
        if ((type === 'file' || type === 'folder') && filterState.files) matchesType = true;
        if (type === 'css' && filterState.css) matchesType = true;
        if (type === 'comment' && filterState.comments) matchesType = true;
        
        // Show/hide item
        if (matchesSearch && matchesType) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    console.log('VISIBLE ITEMS:', visibleCount);
    
    // Update clear button
    const clearBtn = document.getElementById('search_clear');
    if (clearBtn) {
        if (filterState.search) {
            clearBtn.style.display = 'flex';
        } else {
            clearBtn.style.display = 'none';
        }
    }
}

// Setup when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('SETTING UP SIMPLE FILTERS!');
    
    // Search input
    const searchInput = document.getElementById('search_input');
    if (searchInput) {
        console.log('Found search input!');
        searchInput.addEventListener('input', function() {
            console.log('SEARCH INPUT CHANGED:', this.value);
            filterState.search = this.value;
            applyAllFilters();
        });
    }
    
    // Clear button
    const clearBtn = document.getElementById('search_clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            console.log('CLEAR BUTTON CLICKED!');
            filterState.search = '';
            if (searchInput) searchInput.value = '';
            applyAllFilters();
        });
    }
    
    // Checkboxes
    const functionsBox = document.getElementById('filter_functions');
    if (functionsBox) {
        console.log('Found functions checkbox!');
        functionsBox.addEventListener('change', function() {
            console.log('FUNCTIONS CHECKBOX CHANGED:', this.checked);
            filterState.functions = this.checked;
            applyAllFilters();
        });
    }
    
    const filesBox = document.getElementById('filter_files_folders');
    if (filesBox) {
        console.log('Found files checkbox!');
        filesBox.addEventListener('change', function() {
            console.log('FILES CHECKBOX CHANGED:', this.checked);
            filterState.files = this.checked;
            applyAllFilters();
        });
    }
    
    const cssBox = document.getElementById('filter_css');
    if (cssBox) {
        console.log('Found CSS checkbox!');
        cssBox.addEventListener('change', function() {
            console.log('CSS CHECKBOX CHANGED:', this.checked);
            filterState.css = this.checked;
            applyAllFilters();
        });
    }
    
    const commentsBox = document.getElementById('filter_comments');
    if (commentsBox) {
        console.log('Found comments checkbox!');
        commentsBox.addEventListener('change', function() {
            console.log('COMMENTS CHECKBOX CHANGED:', this.checked);
            filterState.comments = this.checked;
            applyAllFilters();
        });
    }
    
    console.log('SIMPLE FILTERS SETUP COMPLETE!');
});

console.log('SIMPLE FILTERS SCRIPT LOADED!');