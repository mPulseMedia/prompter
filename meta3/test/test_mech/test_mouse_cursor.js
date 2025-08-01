// Mouse tracker injection script
const test_mouse_cursor = `
// Create mouse cursor indicator
const mouseIndicator      = document.createElement('div');
mouseIndicator.id         = 'test-mouse-indicator';
mouseIndicator.innerHTML = \`
    <svg width="24" height="24" style="position: absolute; left: 0; top: 0;">
        <defs>
            <filter id="cursor-shadow">
                <feDropShadow dx="1" dy="1" stdDeviation="1" flood-opacity="0.3"/>
            </filter>
        </defs>
        <path d="M 4 3 L 4 16 L 8.5 12 L 11 17 L 13 16 L 10.5 11 L 15 11 Z" 
              fill="black" 
              stroke="white" 
              stroke-width="0.8" 
              stroke-linejoin="round"
              filter="url(#cursor-shadow)"/>
    </svg>
\`;
mouseIndicator.style.cssText = \`
    position       : fixed;
    width          : 24px;
    height         : 24px;
    pointer-events : none;
    z-index        : 999999;
    transition     : all 0.1s ease;
    transform      : scale(3);
    transform-origin: 4px 3px;
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
        mouseIndicator.style.transform      = 'scale(3.6)';
    }
});

document.addEventListener('mouseout', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.id === 'circle') {
        mouseIndicator.style.transform      = 'scale(3)';
    }
});
`;

module.exports = test_mouse_cursor;