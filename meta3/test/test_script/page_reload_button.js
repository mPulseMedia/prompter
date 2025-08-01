// Page reload button test (manual reload only)
async function page_reload_test(page) {
    console.log('page_reload_run');
    
    // First, ensure auto-reload is disabled to prevent interference
    await page.evaluate(() => {
        if (window.reloadInterval) {
            clearInterval(window.reloadInterval);
            window.reloadInterval = null;
        }
        // Also ensure checkbox is unchecked
        const checkbox = document.querySelector('#auto-reload-checkbox');
        if (checkbox && checkbox.checked) {
            checkbox.click();
        }
    });
    
    // Find the reload button
    const reloadButton = await page.$('#reload-button');
    if (!reloadButton) {
        return { passed: false, error: 'reload_button_not_found: #reload-button' };
    }
    
    // Add a marker to detect page reload
    await page.evaluate(() => {
        window.testMarker = 'before_reload';
    });
    
    // Set up a promise to wait for navigation
    const navigationPromise = page.waitForNavigation();
    
    // Click the reload button
    console.log('page_reload_action: clicking_reload_button');
    await reloadButton.click();
    
    // Wait for the page to reload
    try {
        await navigationPromise;
        console.log('page_reload_navigation: completed');
        
        // After reload, clear localStorage again to prevent auto-features
        await page.evaluate(() => {
            localStorage.clear();
            console.log('page_reload: cleared localStorage after reload');
        });
        
        // Wait a bit for the page to stabilize
        await page.waitForFunction(() => true, {timeout: 500}).catch(() => {});
    } catch (error) {
        return { passed: false, error: 'page_reload_navigation_failed: ' + error.message };
    }
    
    // Check if the page actually reloaded by verifying our marker is gone
    const markerAfterReload = await page.evaluate(() => {
        return window.testMarker;
    });
    
    if (markerAfterReload === 'before_reload') {
        return { passed: false, error: 'page_reload_failed: marker still present after reload' };
    }
    
    // Verify the reload button still exists after reload
    const reloadButtonAfter = await page.$('#reload-button');
    if (!reloadButtonAfter) {
        return { passed: false, error: 'reload_button_missing_after_reload' };
    }
    
    return { passed: true, message: 'page_reload_pass: manual reload button works correctly' };
}

module.exports = page_reload_test;