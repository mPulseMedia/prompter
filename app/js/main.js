// Get DOM elements
const window_container = document.querySelector('.window_container');
const circle_container = document.querySelector('.circle_container');

// Track mouse position for background color effect
let is_hovering_circle = false;

// Handle circle hover
circle_container.addEventListener('mouseenter', () => {
    is_hovering_circle = true;
});

circle_container.addEventListener('mouseleave', () => {
    is_hovering_circle = false;
    window_container.style.backgroundColor = '#333';
});

// Update background color based on mouse X position
window_container.addEventListener('mousemove', (e) => {
    if (is_hovering_circle) {
        const hue = (e.clientX / window.innerWidth) * 360;
        window_container.style.backgroundColor = `hsl(${hue}, 100%, 60%)`;
    }
});

// Handle circle click for random movement
circle_container.addEventListener('click', () => {
    const current_x = parseInt(getComputedStyle(circle_container).left) || 0;
    const current_y = parseInt(getComputedStyle(circle_container).top) || 0;
    
    // Calculate random direction (-1 or 1)
    const direction_x = Math.random() < 0.5 ? -1 : 1;
    const direction_y = Math.random() < 0.5 ? -1 : 1;
    
    // Calculate new position
    const new_x = current_x + (50 * direction_x);
    const new_y = current_y + (50 * direction_y);
    
    // Get container bounds
    const container = circle_container.parentElement;
    const container_rect = container.getBoundingClientRect();
    const circle_rect = circle_container.getBoundingClientRect();
    
    // Ensure circle stays within bounds
    const max_x = container_rect.width - circle_rect.width;
    const max_y = container_rect.height - circle_rect.height;
    
    // Apply movement with bounds checking
    circle_container.style.left = `${Math.max(0, Math.min(new_x, max_x))}px`;
    circle_container.style.top = `${Math.max(0, Math.min(new_y, max_y))}px`;
}); 