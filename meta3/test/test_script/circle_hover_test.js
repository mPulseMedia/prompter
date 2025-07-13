// Circle hover test
async function circle_hover_test(page) {
    console.log('circle_hover_run');
    
    // Find the element
    const element = await page.$('#circle');
    if (!element) {
        return { passed: false, error: 'circle_not_found: #circle' };
    }
    
    // Get initial state
    const initial = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        return window.getComputedStyle(el).backgroundColor;
    }, '#circle');
    
    // Hover over element
    console.log('circle_hover_action: hovering');
    await element.hover();
    await page.waitForFunction(() => true, {timeout: 400}).catch(() => {});
    
    // Check hover state
    const hovered = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        return window.getComputedStyle(el).backgroundColor;
    }, '#circle');
    
    if (initial === hovered) {
        return { passed: false, error: 'circle_no_change: hover state unchanged' };
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

module.exports = circle_hover_test;