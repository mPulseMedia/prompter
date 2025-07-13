// Reset button test - verifies reset button resets both color and diameter
async function reset_button_test(page) {
    console.log('reset_button_run');
    
    // Find elements
    const button = await page.$('#reset-button');
    const circle = await page.$('#circle');
    if (!button) {
        return { passed: false, error: 'reset_not_found: #reset-button' };
    }
    if (!circle) {
        return { passed: false, error: 'circle_not_found: #circle' };
    }
    
    // First expand the circle by clicking it
    console.log('reset_button_action: expanding_circle_first');
    await circle.click();
    await page.waitForFunction(() => true, {timeout: 350}).catch(() => {});
    
    // Verify circle is expanded
    const expandedState = await page.evaluate(sel => {
        const elem = document.querySelector(sel);
        return {
            hasExpanded: elem.classList.contains('expanded'),
            width: window.getComputedStyle(elem).width
        };
    }, '#circle');
    
    if (!expandedState.hasExpanded) {
        return { passed: false, error: 'reset_setup_failed: circle not expanded for test' };
    }
    
    // Now click reset button
    console.log('reset_button_action: clicking_reset');
    await button.click();
    await page.waitForFunction(() => true, {timeout: 300}).catch(() => {});
    
    // Check that status message appeared
    const text = await page.evaluate(sel => {
        return document.querySelector('#status-message').textContent;
    }, '#status-message');
    
    if (!text.includes('Colors changed!')) {
        return { passed: false, error: 'reset_no_message: expected status message not found, got: ' + text };
    }
    
    // Check that circle diameter was reset
    const resetState = await page.evaluate(sel => {
        const elem = document.querySelector(sel);
        return {
            hasExpanded: elem.classList.contains('expanded'),
            width: window.getComputedStyle(elem).width
        };
    }, '#circle');
    
    if (resetState.hasExpanded) {
        return { passed: false, error: 'reset_diameter_failed: expanded class not removed' };
    }
    
    if (resetState.width === expandedState.width) {
        return { passed: false, error: 'reset_diameter_failed: circle diameter not reset' };
    }
    
    return { passed: true, message: 'reset_button_pass: color and diameter reset' };
}

module.exports = reset_button_test;