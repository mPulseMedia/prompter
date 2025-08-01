// Double-click button test
async function double_click_test(page) {
    console.log('double_click_run');
    
    // Find the element
    const element = await page.$('#double-click-button');
    if (!element) {
        return { passed: false, error: 'double_click_button_not_found: #double-click-button' };
    }
    
    // Get initial text
    const initialText = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        return el.textContent;
    }, '#double-click-button');
    
    if (initialText !== 'Double Click Me!') {
        return { passed: false, error: 'double_click_initial_text_wrong: expected "Double Click Me!"' };
    }
    
    // Double-click the button
    console.log('double_click_action: double_clicking');
    await element.click({ clickCount: 2 });
    
    // Wait a bit for the text to change
    await page.waitForFunction(() => true, {timeout: 100}).catch(() => {});
    
    // Check if text changed
    const afterText = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        return el.textContent;
    }, '#double-click-button');
    
    if (afterText === initialText) {
        return { passed: false, error: 'double_click_no_change: text did not change after double-click' };
    }
    
    // Verify it shows "Clicked 1 times!"
    if (afterText !== 'Clicked 1 times!') {
        return { passed: false, error: `double_click_wrong_text: expected "Clicked 1 times!", got "${afterText}"` };
    }
    
    // Double-click again
    console.log('double_click_action: double_clicking_again');
    await element.click({ clickCount: 2 });
    await page.waitForFunction(() => true, {timeout: 100}).catch(() => {});
    
    // Check if counter incremented
    const secondText = await page.evaluate(sel => {
        const el = document.querySelector(sel);
        return el.textContent;
    }, '#double-click-button');
    
    if (secondText !== 'Clicked 2 times!') {
        return { passed: false, error: `double_click_counter_fail: expected "Clicked 2 times!", got "${secondText}"` };
    }
    
    return { passed: true, message: 'double_click_pass' };
}

module.exports = double_click_test;