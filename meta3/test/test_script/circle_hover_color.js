// Circle hover test
async function circle_hover_color(page) {
    console.log('circle_hover_run');
    
    // Find the element
    const element = await page.$('#circle');
    if (!element) {
        return { passed: false, error: 'circle_not_found: #circle' };
    }
    
    // Ensure circle is in clean state (not expanded, not being hovered)
    await page.evaluate(() => {
        const circle = document.querySelector('#circle');
        circle.classList.remove('expanded'); // Remove any expanded state
    });
    
    // Move mouse away from circle first to ensure clean start
    await page.mouse.move(0, 0);
    await page.waitForFunction(() => true, {timeout: 200}).catch(() => {});
    
    // Get initial state
    const initial = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        return window.getComputedStyle(el).backgroundColor;
    }, '#circle');
    
    console.log('circle_hover_initial_color:', initial);
    
    // Hover over element
    console.log('circle_hover_action: hovering');
    await element.hover();
    await page.waitForFunction(() => true, {timeout: 400}).catch(() => {});
    
    // Check hover state
    const hovered = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        return window.getComputedStyle(el).backgroundColor;
    }, '#circle');
    
    console.log('circle_hover_after_color:', hovered);
    
    if (initial === hovered) {
        return { passed: false, error: 'circle_no_change: hover state unchanged - initial: ' + initial + ', hovered: ' + hovered };
    }
    
    // Move away
    console.log('circle_hover_action: moving_away');
    await page.mouse.move(0, 0);
    await page.waitForFunction(() => true, {timeout: 400}).catch(() => {});
    
    // Check restored state
    const restored = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        return window.getComputedStyle(el).backgroundColor;
    }, '#circle');
    
    if (restored !== initial) {
        return { passed: false, error: 'circle_not_restored: color remains after hover' };
    }
    
    return { passed: true, message: 'circle_hover_pass' };
}

module.exports = circle_hover_color;