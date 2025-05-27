// Get DOM elements
const window_cont       = document.querySelector('.window_cont');
const circle_cont       = document.querySelector('.circle_cont');

// Track mouse position for background color
let mouse_x            = 0;

// Handle circle hover effects
circle_cont.addEventListener('mouseenter', () => {
    window_cont.classList.add('circle_hover');
});

circle_cont.addEventListener('mousemove', (e) => {
    mouse_x            = e.clientX;
    const hue          = (mouse_x / window.innerWidth) * 360;
    window_cont.style.backgroundColor = `hsl(${hue}, 100%, 60%)`;
});

circle_cont.addEventListener('mouseleave', () => {
    window_cont.classList.remove('circle_hover');
    window_cont.style.backgroundColor = '#333';
});

// Handle circle click movement
circle_cont.addEventListener('click', () => {
    const circle_move_x      = parseInt(getComputedStyle(circle_cont).left) || 0;
    const circle_move_y      = parseInt(getComputedStyle(circle_cont).top) || 0;
    
    // Calculate random direction
    const circle_move_angle  = Math.random() * Math.PI * 2;
    const circle_move_dist   = 50;
    
    // Calculate new position
    const circle_move_target_x = circle_move_x + Math.cos(circle_move_angle) * circle_move_dist;
    const circle_move_target_y = circle_move_y + Math.sin(circle_move_angle) * circle_move_dist;
    
    // Get container bounds
    const page_cont          = document.querySelector('.page_cont');
    const page_bounds        = page_cont.getBoundingClientRect();
    const circle_bounds      = circle_cont.getBoundingClientRect();
    
    // Ensure circle stays within bounds
    const circle_move_max_x  = page_bounds.width - circle_bounds.width;
    const circle_move_max_y  = page_bounds.height - circle_bounds.height;
    
    // Apply movement with bounds checking
    circle_cont.style.position = 'relative';
    circle_cont.style.left     = `${Math.max(0, Math.min(circle_move_target_x, circle_move_max_x))}px`;
    circle_cont.style.top      = `${Math.max(0, Math.min(circle_move_target_y, circle_move_max_y))}px`;
}); 