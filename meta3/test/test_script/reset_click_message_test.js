// Reset click message test - verifies reset button shows status message
async function reset_click_message_test(page) {
    console.log('reset_click_message_run');
    
    // Find elements
    const resetButton = await page.$('#reset-button');
    const statusMessage = await page.$('#status-message');
    
    if (!resetButton) {
        return { passed: false, error: 'reset_button_not_found: #reset-button element missing' };
    }
    if (!statusMessage) {
        return { passed: false, error: 'status_message_not_found: #status-message element missing' };
    }
    
    // Get initial status message
    const initialMessage = await page.evaluate(sel => {
        return document.querySelector(sel).textContent;
    }, '#status-message');
    
    console.log('status_message_initial:', initialMessage || 'empty');
    
    // Click reset button to trigger status message
    console.log('status_message_action: clicking_reset');
    await resetButton.click();
    
    // Wait a bit for message to appear
    await page.waitForFunction(() => true, {timeout: 100}).catch(() => {});
    
    // Check if message appeared
    const messageAfterClick = await page.evaluate(sel => {
        return document.querySelector(sel).textContent;
    }, '#status-message');
    
    if (!messageAfterClick || messageAfterClick === '') {
        return { passed: false, error: 'status_message_not_shown: no message after reset click' };
    }
    
    if (!messageAfterClick.includes('Colors changed!')) {
        return { passed: false, error: 'status_message_wrong_text: expected "Colors changed!", got "' + messageAfterClick + '"' };
    }
    
    console.log('status_message_shown:', messageAfterClick);
    
    // Wait for message to disappear (should be 2 seconds)
    console.log('status_message_action: waiting_for_auto_clear');
    await page.waitForFunction(
        sel => document.querySelector(sel).textContent === '',
        { timeout: 3000 },
        '#status-message'
    ).catch(err => {
        console.log('status_message_timeout:', err.message);
    });
    
    // Verify message cleared
    const finalMessage = await page.evaluate(sel => {
        return document.querySelector(sel).textContent;
    }, '#status-message');
    
    if (finalMessage !== '') {
        return { passed: false, error: 'status_message_not_cleared: message still showing after timeout' };
    }
    
    return { passed: true, message: 'reset_click_message_pass' };
}

module.exports = reset_click_message_test;