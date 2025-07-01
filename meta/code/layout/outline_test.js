// Test script to debug outline clicking
console.log('=== OUTLINE TEST SCRIPT LOADED ===');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking for outline numbers...');
    
    const outlineNumbers = document.querySelectorAll('.outline_line_number');
    console.log('Found outline numbers:', outlineNumbers.length);
    
    if (outlineNumbers.length === 0) {
        console.error('No outline numbers found!');
        return;
    }
    
    // Add a simple test handler to the first outline number
    if (outlineNumbers[0]) {
        console.log('Adding test handler to first outline number:', outlineNumbers[0].textContent);
        
        outlineNumbers[0].style.border = '2px solid red';
        
        outlineNumbers[0].addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('TEST HANDLER: Outline clicked!', this.textContent);
            alert('Outline clicked: ' + this.textContent);
        });
    }
});

// Also try immediately
setTimeout(() => {
    const outlineNumbers = document.querySelectorAll('.outline_line_number');
    console.log('After timeout - Found outline numbers:', outlineNumbers.length);
    
    if (outlineNumbers.length > 0 && outlineNumbers[0]) {
        outlineNumbers[0].style.backgroundColor = 'yellow';
    }
}, 1000);