// Reset hover state test - verifies reset works while hovering
async function reset_hover_state_test(page) {
    console.log('reset_hover_state_run');
    
    // Find elements
    const circle = await page.$('#circle');
    const resetButton = await page.$('#reset-button');
    
    if (!circle) {
        return { passed: false, error: 'circle_not_found: #circle element missing' };
    }
    if (!resetButton) {
        return { passed: false, error: 'reset_button_not_found: #reset-button element missing' };
    }
    
    // Get circle dimensions
    const box = await circle.boundingBox();
    if (!box) {
        return { passed: false, error: 'circle_boundingbox_error: could not get circle dimensions' };
    }
    
    // Hover over circle
    console.log('reset_hover_state_action: hovering_over_circle');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForFunction(() => true, {timeout: 100}).catch(() => {});
    
    // Get hover color
    const hoverColor = await page.evaluate(sel => {
        return window.getComputedStyle(document.querySelector(sel)).backgroundColor;
    }, '#circle');
    
    // Click reset while still hovering
    console.log('reset_hover_state_action: clicking_reset_while_hovering');
    await resetButton.click();
    await page.waitForFunction(() => true, {timeout: 100}).catch(() => {});
    
    // Color should return to blue even though we're still hovering
    const colorAfterReset = await page.evaluate(sel => {
        return window.getComputedStyle(document.querySelector(sel)).backgroundColor;
    }, '#circle');
    
    // Verify it's blue (initial color)
    if (colorAfterReset === hoverColor) {
        return { passed: false, error: 'reset_while_hovering_failed: color did not reset' };
    }
    
    // Move mouse slightly to re-trigger hover
    await page.mouse.move(box.x + box.width / 2 + 1, box.y + box.height / 2);
    await page.waitForFunction(() => true, {timeout: 100}).catch(() => {});
    
    // Should be red again
    const reHoverColor = await page.evaluate(sel => {
        return window.getComputedStyle(document.querySelector(sel)).backgroundColor;
    }, '#circle');
    
    if (reHoverColor === colorAfterReset) {
        return { passed: false, error: 'hover_not_working_after_reset: hover effect broken' };
    }
    
    // Move away to clean up
    await page.mouse.move(0, 0);
    
    return { passed: true, message: 'reset_hover_state_pass' };
}

module.exports = reset_hover_state_test;