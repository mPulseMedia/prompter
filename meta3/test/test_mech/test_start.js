const puppeteer            = require('puppeteer');
const fs                   = require('fs');
const path                 = require('path');
const test_mouse_cursor = require('./test_mouse_cursor');

// Import feature tests
const circle_hover_test = require('../test_script/circle_hover_test');
const reset_button_test = require('../test_script/reset_button_test');

// Feature list
const feature_list = [
    { name: 'circle', func: circle_hover_test },
    { name: 'reset',  func: reset_button_test }
];

async function test_start() {
    const browser = await puppeteer.launch({
        headless       : false,  // Show browser window
        slowMo         : 250,    // Slow down actions so you can see them clearly
        executablePath : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args           : ['--no-sandbox', '--window-size=1200,800']
    });
    
    const page    = await browser.newPage();
    const results = [];
    
    try {
        await page.goto('http://localhost:3003/app/circle.html');
        
        // Inject mouse cursor
        await page.evaluate(test_mouse_cursor);
        console.log('test_mouse_cursor: enabled');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Run each feature test
        for (const feature of feature_list) {
            console.log(`test_execute: ${feature.name}`);
            const result = await feature.func(page);
            results.push({ 
                id   : `${feature.name}_${Date.now()}`,
                name : feature.name,
                ...result 
            });
        }
        
    } catch (error) {
        console.error('test_error_fatal:', error);
    } finally {
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