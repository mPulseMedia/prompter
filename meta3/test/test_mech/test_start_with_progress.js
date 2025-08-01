const puppeteer            = require('puppeteer');
const fs                   = require('fs');
const path                 = require('path');
const http                 = require('http');
const test_mouse_cursor = require('./test_mouse_cursor');

// Import feature tests
const circle_hover_color = require('../test_script/circle_hover_color');
const circle_click_diameter = require('../test_script/circle_click_diameter');
// Circle color change tests (formerly reset)
const circle_color_change_button = require('../test_script/circle_color_change_button');
const circle_color_change_hover_state = require('../test_script/circle_color_change_hover_state');
const circle_color_change_message = require('../test_script/circle_color_change_message');
// Renamed tests with new naming convention
const page_reload_auto = require('../test_script/page_reload_auto');
const page_reload_button = require('../test_script/page_reload_button');
const test_run_auto = require('../test_script/test_run_auto');
const test_panel_refresh = require('../test_script/test_panel_refresh');
const twice_click_button = require('../test_script/twice_click_button');

// Feature list - organized alphabetically for better grouping
const feature_list = [
    { name: 'circle_click_diameter', func: circle_click_diameter },
    { name: 'circle_hover_color', func: circle_hover_color },
    { name: 'page_reload_auto', func: page_reload_auto },
    { name: 'page_reload_button', func: page_reload_button },
    { name: 'circle_color_change_button', func: circle_color_change_button },
    { name: 'circle_color_change_hover_state', func: circle_color_change_hover_state },
    { name: 'circle_color_change_message', func: circle_color_change_message },
    { name: 'test_panel_refresh', func: test_panel_refresh },
    { name: 'test_run_auto', func: test_run_auto },
    { name: 'twice_click_button', func: twice_click_button }
];

// Function to update test status on server
function updateTestStatus(testName, status) {
    const data = JSON.stringify({ testName, status });
    
    const options = {
        hostname: 'localhost',
        port: 3003,
        path: '/api/test/progress',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };
    
    const req = http.request(options, (res) => {
        // Ignore response
    });
    
    req.on('error', (e) => {
        console.error(`Problem with request: ${e.message}`);
    });
    
    req.write(data);
    req.end();
}

async function test_start() {
    // Check for headless argument
    const isHeadless = process.argv.includes('--headless');
    
    const browser = await puppeteer.launch({
        headless       : isHeadless,  // Show/hide browser window based on argument
        slowMo         : 250,    // Slow down actions so you can see them clearly
        executablePath : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args           : ['--no-sandbox', '--window-size=1200,800']
    });
    
    const page    = await browser.newPage();
    const results = [];
    
    try {
        await page.goto('http://localhost:3003/?test-mode=true');
        
        // Clear localStorage to prevent auto-features from interfering with tests
        await page.evaluate(() => {
            localStorage.clear();  // Clear all localStorage
            console.log('test_setup: cleared all localStorage');
            
            // Double-check by logging current values
            console.log('autoReload:', localStorage.getItem('autoReload'));
            console.log('autoTest:', localStorage.getItem('autoTest'));
        });
        
        // Inject mouse cursor
        await page.evaluate(test_mouse_cursor);
        console.log('test_mouse_cursor: enabled');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Add a marker to detect unexpected reloads
        await page.evaluate(() => {
            window.testStartMarker = Date.now();
            console.log('test_marker_set:', window.testStartMarker);
        });
        
        // Run each feature test
        for (const feature of feature_list) {
            // Check if page reloaded unexpectedly
            const markerCheck = await page.evaluate(() => window.testStartMarker);
            if (!markerCheck) {
                console.log(`WARNING: Page reloaded before ${feature.name} test!`);
            }
            
            console.log(`test_execute: ${feature.name}`);
            
            // Update status to running
            updateTestStatus(feature.name, 'running');
            
            const result = await feature.func(page);
            
            // Update status to completed
            updateTestStatus(feature.name, result.passed ? 'passed' : 'failed');
            
            results.push({ 
                id   : `${feature.name}_${Date.now()}`,
                name : feature.name,
                ...result 
            });
            
            // If this was a test that reloads the page, re-inject mouse cursor and re-establish marker
            if ((feature.name === 'page_reload_button' || feature.name === 'page_reload_auto') && result.passed) {
                // Re-inject mouse cursor after page reload
                await page.evaluate(test_mouse_cursor);
                console.log('test_mouse_cursor: re-enabled after page reload');
                
                await page.evaluate(() => {
                    window.testStartMarker = Date.now();
                    console.log('test_marker_reset_after_reload:', window.testStartMarker);
                });
            }
        }
        
    } catch (error) {
        console.error('test_error_fatal:', error);
    } finally {
        // Clear test status
        updateTestStatus('', 'completed');
        
        // Keep browser open for 1 second so you can see the results
        console.log('\ntest_browser_wait: 1_second');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await browser.close();
    }
    
    // Show summary
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    console.log('\ntest_summary: ' + (failed > 0 ? 'fail' : 'pass'));
    console.log(`test_pass_count: ${passed}`);
    console.log(`test_fail_count: ${failed}`);
    
    if (failed > 0) {
        console.log('\ntest_fail_detail:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`${r.name}_fail: ${r.error}`);
        });
    }
    
    // Save all results
    fs.writeFileSync(
        path.join(__dirname, 'test_result.json'),
        JSON.stringify({
            passed    : failed === 0,
            total     : results.length,
            failed    : failed,
            timestamp : new Date().toISOString(),
            results   : results
        }, null, 2)
    );
    
    process.exit(failed > 0 ? 1 : 0);
}

test_start().catch(console.error);