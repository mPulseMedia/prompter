// Sequence page client-side functionality
(function() {
    'use strict';
    
    // Wait for DOM to be ready
    function init() {
        console.log('Sequence page initializing...');
        
        // Set up page selector
        const page_select = document.getElementById('page_select');
        if (page_select) {
            // Load saved selection or default to 'sequence'
            const saved_page = localStorage.getItem('sequence_selected_page') || 'sequence';
            page_select.value = saved_page;
            sequence_show(saved_page);
            
            // Handle page selection
            page_select.addEventListener('change', function() {
                const selected_page = this.value;
                
                // Hide all sequences
                const all_sequences = document.querySelectorAll('.sequence_container');
                all_sequences.forEach(seq => seq.classList.remove('active'));
                
                // Hide empty state
                const empty_state = document.getElementById('empty_state');
                if (empty_state) {
                    empty_state.style.display = 'none';
                }
                
                // Show selected sequence
                if (selected_page) {
                    sequence_show(selected_page);
                    localStorage.setItem('sequence_selected_page', selected_page);
                    
                    // Just show the static sequence, no live tracking
                } else {
                    // Show empty state
                    if (empty_state) {
                        empty_state.style.display = 'block';
                    }
                    localStorage.removeItem('sequence_selected_page');
                }
            });
        }
        
        // Remove live tracking features for now
    }
    
    function sequence_show(page_name) {
        const sequence_container = document.getElementById(`sequence_${page_name}`);
        if (sequence_container) {
            sequence_container.classList.add('active');
            
            // Animate the sequence items
            const items = sequence_container.querySelectorAll('.sequence_item');
            items.forEach((item, index) => {
                item.style.opacity = '0';
                item.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    item.style.opacity = '1';
                    item.style.transform = 'translateX(0)';
                }, index * 50);
            });
        }
    }
    
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();