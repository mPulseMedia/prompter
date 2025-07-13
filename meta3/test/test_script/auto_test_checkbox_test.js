// Auto-test checkbox test
async function auto_test_checkbox_test(page) {
    console.log('auto_test_checkbox_run');
    
    // First, ensure auto-test is disabled to prevent interference
    await page.evaluate(() => {
        if (window.testInterval) {
            clearInterval(window.testInterval);
            window.testInterval = null;
        }
    });
    
    // Find the auto-test checkbox
    const autoTestCheckbox = await page.$('#auto-test-checkbox');
    if (!autoTestCheckbox) {
        return { passed: false, error: 'auto_test_checkbox_not_found: #auto-test-checkbox' };
    }
    
    // Check initial checkbox state (should be unchecked unless localStorage has it)
    const initialChecked = await page.evaluate(sel => {
        return document.querySelector(sel).checked;
    }, '#auto-test-checkbox');
    
    console.log('auto_test_checkbox_initial_state:', initialChecked ? 'checked' : 'unchecked');
    
    // If it's already checked from localStorage, uncheck it first
    if (initialChecked) {
        await autoTestCheckbox.click();
        await page.waitForFunction(() => true, {timeout: 100}).catch(() => {});
    }
    
    // Verify it's unchecked
    const uncheckedState = await page.evaluate(sel => {
        return document.querySelector(sel).checked;
    }, '#auto-test-checkbox');
    
    if (uncheckedState) {
        return { passed: false, error: 'auto_test_checkbox_uncheck_failed: checkbox still checked after click' };
    }
    
    // Click the checkbox to enable auto-test
    console.log('auto_test_checkbox_action: checking');
    await autoTestCheckbox.click();
    await page.waitForFunction(() => true, {timeout: 100}).catch(() => {});
    
    // Verify it's checked
    const checkedState = await page.evaluate(sel => {
        return document.querySelector(sel).checked;
    }, '#auto-test-checkbox');
    
    if (!checkedState) {
        return { passed: false, error: 'auto_test_checkbox_check_failed: checkbox not checked after click' };
    }
    
    // Verify localStorage was set (test windows use 'test_' prefix)
    const localStorageValue = await page.evaluate(() => {
        const storageKey = window.location.search.includes('test-mode') ? 'test_autoTest' : 'autoTest';
        return localStorage.getItem(storageKey);
    });
    
    if (localStorageValue !== 'true') {
        return { passed: false, error: 'auto_test_localstorage_not_set: expected "true", got "' + localStorageValue + '"' };
    }
    
    // Test unchecking
    console.log('auto_test_checkbox_action: unchecking');
    await autoTestCheckbox.click();
    await page.waitForFunction(() => true, {timeout: 100}).catch(() => {});
    
    // Verify it's unchecked
    const finalUncheckedState = await page.evaluate(sel => {
        return document.querySelector(sel).checked;
    }, '#auto-test-checkbox');
    
    if (finalUncheckedState) {
        return { passed: false, error: 'auto_test_checkbox_final_uncheck_failed: checkbox still checked' };
    }
    
    // Verify localStorage was updated (test windows use 'test_' prefix)
    const finalLocalStorageValue = await page.evaluate(() => {
        const storageKey = window.location.search.includes('test-mode') ? 'test_autoTest' : 'autoTest';
        return localStorage.getItem(storageKey);
    });
    
    if (finalLocalStorageValue !== 'false') {
        return { passed: false, error: 'auto_test_localstorage_not_updated: expected "false", got "' + finalLocalStorageValue + '"' };
    }
    
    return { passed: true, message: 'auto_test_checkbox_pass' };
}

module.exports = auto_test_checkbox_test;