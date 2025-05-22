// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get elements
    const circle    = document.querySelector('.circle_container');
    const window    = document.querySelector('.window_container');
    const heading   = document.querySelector('.heading');
    const page      = document.querySelector('.page_container');

    // Get random angle in radians
    const get_angle = () => Math.random() * Math.PI * 2;

    // Move circle in random direction
    const move_circle = () => {
        const angle     = get_angle();
        const distance  = 50; // 50 pixels as specified
        
        // Get current position
        const transform = window.getComputedStyle(circle).transform;
        const matrix    = new DOMMatrix(transform);
        const pos_x     = matrix.m41;
        const pos_y     = matrix.m42;
        
        // Calculate new position
        const new_x     = pos_x + Math.cos(angle) * distance;
        const new_y     = pos_y + Math.sin(angle) * distance;
        
        // Get container bounds
        const page_rect = page.getBoundingClientRect();
        const circle_rect = circle.getBoundingClientRect();
        
        // Calculate boundaries
        const min_x     = -page_rect.width / 2 + circle_rect.width / 2;
        const max_x     = page_rect.width / 2 - circle_rect.width / 2;
        const min_y     = -page_rect.height / 2 + circle_rect.height / 2;
        const max_y     = page_rect.height / 2 - circle_rect.height / 2;
        
        // Clamp position within bounds
        const final_x   = Math.max(min_x, Math.min(max_x, new_x));
        const final_y   = Math.max(min_y, Math.min(max_y, new_y));
        
        // Apply new position
        circle.style.transform = `translate(${final_x}px, ${final_y}px) scale(1)`;
    };

    // Add click event listener
    circle.addEventListener('click', () => {
        // Toggle heading text
        heading.textContent = heading.textContent === 'Hello World' ? 'Goodbye World' : 'Hello World';
        // Move circle randomly
        move_circle();
    });

    // Add hover event listeners
    circle.addEventListener('mouseenter', () => {
        const transform = window.getComputedStyle(circle).transform;
        const matrix    = new DOMMatrix(transform);
        const pos_x     = matrix.m41;
        const pos_y     = matrix.m42;
        circle.style.transform = `translate(${pos_x}px, ${pos_y}px) scale(2) rotate(5deg)`;
    });

    circle.addEventListener('mouseleave', () => {
        const transform = window.getComputedStyle(circle).transform;
        const matrix    = new DOMMatrix(transform);
        const pos_x     = matrix.m41;
        const pos_y     = matrix.m42;
        circle.style.transform = `translate(${pos_x}px, ${pos_y}px) scale(1) rotate(0deg)`;
    });
}); 