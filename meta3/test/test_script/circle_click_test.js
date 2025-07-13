// Circle click test - verifies clicking the circle changes diameter and doesn't break hover
async function circle_click_test(page) {
    console.log('circle_click_run');
    
    // Find the circle element
    const circle = await page.$('#circle');
    if (!circle) {
        return { passed: false, error: 'circle_not_found: #circle element missing' };
    }
    
    // Get initial color and size
    const initialState = await page.evaluate(sel => {
        const elem = document.querySelector(sel);
        const style = window.getComputedStyle(elem);
        return {
            color: style.backgroundColor,
            width: style.width,
            hasExpanded: elem.classList.contains('expanded')
        };
    }, '#circle');
    
    console.log('circle_click_initial_state:', initialState);
    
    // Click the circle
    console.log('circle_click_action: clicking');
    await circle.click();
    
    // Move mouse away from circle to ensure we're not hovering
    await page.mouse.move(0, 0);
    
    // Wait a bit for transition
    await page.waitForFunction(() => true, {timeout: 350}).catch(() => {});
    
    // Verify diameter changed and color hasn't changed from click
    const stateAfterClick = await page.evaluate(sel => {
        const elem = document.querySelector(sel);
        const style = window.getComputedStyle(elem);
        return {
            color: style.backgroundColor,
            width: style.width,
            hasExpanded: elem.classList.contains('expanded')
        };
    }, '#circle');
    
    console.log('circle_click_after_state:', stateAfterClick);
    
    if (stateAfterClick.color !== initialState.color) {
        return { passed: false, error: 'circle_click_changed_color: click should not change color' };
    }
    
    if (!stateAfterClick.hasExpanded) {
        return { passed: false, error: 'circle_click_no_expand_class: expanded class not added' };
    }
    
    if (stateAfterClick.width === initialState.width) {
        return { passed: false, error: 'circle_click_no_size_change: diameter did not change' };
    }
    
    // Test that hover still works after click
    const box = await circle.boundingBox();
    if (!box) {
        return { passed: false, error: 'circle_boundingbox_error: could not get circle dimensions' };
    }
    
    console.log('circle_click_action: testing_hover_after_click');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    
    // Wait for hover effect
    await page.waitForFunction(() => true, {timeout: 100}).catch(() => {});
    
    const hoverColor = await page.evaluate(sel => {
        return window.getComputedStyle(document.querySelector(sel)).backgroundColor;
    }, '#circle');
    
    if (hoverColor === initialState.color) {
        return { passed: false, error: 'circle_hover_broken_after_click: hover no longer works' };
    }
    
    // Move away
    await page.mouse.move(0, 0);
    
    // Click again to verify toggle back to normal size
    console.log('circle_click_action: clicking_again_to_toggle');
    await circle.click();
    
    // Wait for transition
    await page.waitForFunction(() => true, {timeout: 350}).catch(() => {});
    
    // Verify it's back to normal size
    const finalState = await page.evaluate(sel => {
        const elem = document.querySelector(sel);
        const style = window.getComputedStyle(elem);
        return {
            width: style.width,
            hasExpanded: elem.classList.contains('expanded')
        };
    }, '#circle');
    
    if (finalState.hasExpanded) {
        return { passed: false, error: 'circle_click_toggle_failed: expanded class still present after second click' };
    }
    
    if (finalState.width !== initialState.width) {
        return { passed: false, error: 'circle_click_size_not_restored: diameter not back to original' };
    }
    
    return { passed: true, message: 'circle_click_pass: diameter toggles correctly' };
}

module.exports = circle_click_test;