// Auto-reload checkbox test that verifies page actually reloads
async function auto_reload_test(page) {
    console.log('auto_reload_run');
    
    // Find the auto-reload checkbox
    const autoReloadCheckbox = await page.$('#auto-reload-checkbox');
    if (!autoReloadCheckbox) {
        return { passed: false, error: 'auto_reload_checkbox_not_found: #auto-reload-checkbox' };
    }
    
    // Check initial state
    const initialChecked = await page.evaluate(sel => {
        return document.querySelector(sel).checked;
    }, '#auto-reload-checkbox');
    
    console.log('auto_reload_initial_state:', initialChecked ? 'checked' : 'unchecked');
    
    // If already checked, uncheck it first
    if (initialChecked) {
        await autoReloadCheckbox.click();
        await page.waitForFunction(() => true, {timeout: 100}).catch(() => {});
    }
    
    // Add a marker to detect reload and store test progress
    await page.evaluate(() => {
        window.autoReloadTestMarker = Date.now();
        sessionStorage.setItem('autoReloadTestInProgress', 'true');
        sessionStorage.setItem('autoReloadTestStartTime', Date.now().toString());
        console.log('auto_reload_test_marker_set:', window.autoReloadTestMarker);
    });
    
    // Click the checkbox to enable auto-reload
    console.log('auto_reload_action: enabling_auto_reload');
    await autoReloadCheckbox.click();
    
    // Wait a moment for the timer to start
    await page.waitForFunction(() => true, {timeout: 500}).catch(() => {});
    
    // Set up navigation listener after enabling auto-reload
    const navigationPromise = page.waitForNavigation({ 
        waitUntil: 'domcontentloaded',
        timeout: 25000 // 25 seconds (auto-reload is set to 20s)
    });
    
    // Verify checkbox is checked
    const isChecked = await page.evaluate(sel => {
        return document.querySelector(sel).checked;
    }, '#auto-reload-checkbox');
    
    if (!isChecked) {
        return { passed: false, error: 'auto_reload_checkbox_not_checked: checkbox did not get checked' };
    }
    
    console.log('auto_reload_waiting: waiting_for_page_reload (up to 25s)');
    
    // Add visual indicator that we're waiting
    await page.evaluate(() => {
        const indicator = document.createElement('div');
        indicator.id = 'reload-test-indicator';
        indicator.textContent = 'WAITING FOR AUTO-RELOAD...';
        indicator.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #f85149;
            color: white;
            padding: 20px;
            font-size: 24px;
            font-weight: bold;
            border-radius: 10px;
            z-index: 9999;
        `;
        document.body.appendChild(indicator);
    });
    
    // Wait for the page to actually reload
    try {
        await navigationPromise;
        console.log('auto_reload_navigation: page_reloaded_successfully');
    } catch (error) {
        // Clean up before failing
        await page.evaluate(() => {
            const checkbox = document.querySelector('#auto-reload-checkbox');
            if (checkbox && checkbox.checked) {
                checkbox.click();
            }
            sessionStorage.removeItem('autoReloadTestInProgress');
            sessionStorage.removeItem('autoReloadTestStartTime');
        });
        return { passed: false, error: 'auto_reload_failed: page did not reload within 25 seconds' };
    }
    
    // After reload, check if our test was in progress
    const testWasInProgress = await page.evaluate(() => {
        const inProgress = sessionStorage.getItem('autoReloadTestInProgress');
        const startTime = sessionStorage.getItem('autoReloadTestStartTime');
        
        // Clean up session storage
        sessionStorage.removeItem('autoReloadTestInProgress');
        sessionStorage.removeItem('autoReloadTestStartTime');
        
        // Verify the marker is gone (page actually reloaded)
        const markerGone = typeof window.autoReloadTestMarker === 'undefined';
        
        return {
            wasInProgress: inProgress === 'true',
            startTime: startTime,
            markerGone: markerGone
        };
    });
    
    if (!testWasInProgress.markerGone) {
        return { passed: false, error: 'auto_reload_marker_still_present: page may not have actually reloaded' };
    }
    
    if (!testWasInProgress.wasInProgress) {
        return { passed: false, error: 'auto_reload_test_state_lost: could not verify test continuity after reload' };
    }
    
    console.log('auto_reload_test_resumed: test continued after reload');
    
    // Find and uncheck the checkbox to stop auto-reload
    const checkboxAfterReload = await page.$('#auto-reload-checkbox');
    if (!checkboxAfterReload) {
        return { passed: false, error: 'auto_reload_checkbox_missing_after_reload' };
    }
    
    // The checkbox should still be checked after reload (localStorage persistence)
    const stillChecked = await page.evaluate(sel => {
        return document.querySelector(sel).checked;
    }, '#auto-reload-checkbox');
    
    if (!stillChecked) {
        return { passed: false, error: 'auto_reload_checkbox_not_persistent: checkbox state not preserved after reload' };
    }
    
    // Clean up - uncheck the checkbox
    console.log('auto_reload_action: disabling_auto_reload');
    await checkboxAfterReload.click();
    await page.waitForFunction(() => true, {timeout: 100}).catch(() => {});
    
    // Verify it's unchecked
    const finalUnchecked = await page.evaluate(sel => {
        return document.querySelector(sel).checked;
    }, '#auto-reload-checkbox');
    
    if (finalUnchecked) {
        return { passed: false, error: 'auto_reload_checkbox_still_checked: failed to disable auto-reload' };
    }
    
    // Clear localStorage to ensure clean state
    await page.evaluate(() => {
        localStorage.removeItem('autoReload');
    });
    
    return { passed: true, message: 'auto_reload_pass: page successfully reloaded after 20s' };
}

module.exports = auto_reload_test;