// Reset button test
async function reset_button_test(page) {
    console.log('reset_button_run');
    
    // Find the button
    const button = await page.$('#reset-button');
    if (!button) {
        return { passed: false, error: 'reset_not_found: #reset-button' };
    }
    
    // Click the button
    console.log('reset_button_action: clicking');
    await button.click();
    await page.waitForFunction(() => true, {timeout: 300}).catch(() => {});
    
    // Check expected result
    const text = await page.evaluate(sel => {
        return document.querySelector('#status-message').textContent;
    }, '#status-message');
    
    if (!text.includes('Color reset!')) {
        return { passed: false, error: 'reset_no_message: expected text not found' };
    }
    
    return { passed: true, message: 'reset_button_pass' };
}

module.exports = reset_button_test;