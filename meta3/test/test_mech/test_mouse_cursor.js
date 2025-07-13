// Mouse tracker injection script
const test_mouse_cursor = `
// Create mouse cursor indicator
const mouseIndicator      = document.createElement('div');
mouseIndicator.id         = 'test-mouse-indicator';
mouseIndicator.style.cssText = \`
    position       : fixed;
    width          : 0;
    height         : 0;
    border-style   : solid;
    border-width   : 0 8px 18px 0;
    border-color   : transparent #000000 transparent transparent;
    transform      : rotate(-45deg);
    pointer-events : none;
    z-index        : 999999;
    transition     : all 0.1s ease;
    filter         : drop-shadow(2px 3px 4px rgba(0,0,0,0.4));
    transform-origin: 0 0;
\`;
document.body.appendChild(mouseIndicator);

// Create click indicator
const clickIndicator      = document.createElement('div');
clickIndicator.id         = 'test-click-indicator';
clickIndicator.style.cssText = \`
    position       : fixed;
    width          : 40px;
    height         : 40px;
    border         : 3px solid #4a90e2;
    border-radius  : 50%;
    pointer-events : none;
    z-index        : 999998;
    opacity        : 0;
    transition     : all 0.3s ease;
\`;
document.body.appendChild(clickIndicator);

// Track mouse movement
document.addEventListener('mousemove', (e) => {
    mouseIndicator.style.left = e.clientX + 'px';
    mouseIndicator.style.top  = e.clientY + 'px';
});

// Show click animation
document.addEventListener('mousedown', (e) => {
    clickIndicator.style.left      = (e.clientX - 20) + 'px';
    clickIndicator.style.top       = (e.clientY - 20) + 'px';
    clickIndicator.style.opacity   = '1';
    clickIndicator.style.transform = 'scale(1)';
    
    setTimeout(() => {
        clickIndicator.style.opacity   = '0';
        clickIndicator.style.transform = 'scale(2)';
    }, 100);
});

// Add hover effect
document.addEventListener('mouseover', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.id === 'circle') {
        mouseIndicator.style.transform      = 'rotate(-45deg) scale(1.1)';
    }
});

document.addEventListener('mouseout', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.id === 'circle') {
        mouseIndicator.style.transform      = 'rotate(-45deg) scale(1)';
    }
});
`;

module.exports = test_mouse_cursor;