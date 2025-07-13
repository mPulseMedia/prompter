// Test results update test - verifies test results refresh every 5 seconds
async function test_results_update_test(page) {
    console.log('test_results_update_run');
    
    // Find test list
    const testList = await page.$('#test-list');
    if (!testList) {
        return { passed: false, error: 'test_list_not_found: #test-list element missing' };
    }
    
    // Get initial test list content
    const initialContent = await page.evaluate(sel => {
        const element = document.querySelector(sel);
        return {
            html: element.innerHTML,
            testCount: element.querySelectorAll('.test-name-item').length
        };
    }, '#test-list');
    
    console.log('test_results_initial_count:', initialContent.testCount);
    
    // If no tests loaded yet, wait for them
    if (initialContent.testCount === 0) {
        console.log('test_results_update_action: waiting_for_initial_load');
        await page.waitForFunction(
            sel => document.querySelectorAll(sel + ' .test-name-item').length > 0,
            { timeout: 10000 },
            '#test-list'
        ).catch(() => {});
    }
    
    // Inject a marker to detect updates
    await page.evaluate(() => {
        window.testResultsUpdateMarker = Date.now();
        window.testResultsUpdateCount = 0;
        
        // Intercept fetch calls to detect test results updates
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            if (args[0] && args[0].includes('/api/test')) {
                window.testResultsUpdateCount++;
                console.log('test_results_update_detected:', window.testResultsUpdateCount);
            }
            return originalFetch.apply(this, args);
        };
    });
    
    console.log('test_results_update_action: waiting_for_auto_refresh (5s)');
    
    // Wait for at least one auto-refresh (5 seconds + buffer)
    await page.waitForFunction(
        () => window.testResultsUpdateCount >= 1,
        { timeout: 7000 }
    ).catch(err => {
        console.log('test_results_update_timeout:', err.message);
        return false;
    });
    
    // Check if updates occurred
    const updateInfo = await page.evaluate(() => {
        return {
            updateCount: window.testResultsUpdateCount,
            markerTime: window.testResultsUpdateMarker,
            currentTime: Date.now()
        };
    });
    
    console.log('test_results_update_count:', updateInfo.updateCount);
    
    if (updateInfo.updateCount === 0) {
        return { passed: false, error: 'test_results_no_auto_update: loadTests not called after 7 seconds' };
    }
    
    // Verify test list still populated
    const finalTestCount = await page.evaluate(sel => {
        return document.querySelectorAll(sel + ' .test-name-item').length;
    }, '#test-list');
    
    if (finalTestCount === 0) {
        return { passed: false, error: 'test_results_disappeared: test list empty after update' };
    }
    
    return { passed: true, message: 'test_results_update_pass: auto-refresh working' };
}

module.exports = test_results_update_test;