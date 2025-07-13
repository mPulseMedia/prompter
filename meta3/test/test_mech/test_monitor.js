const fs     = require('fs');
const path   = require('path');
const { exec } = require('child_process');

class test_monitor {
    constructor() {
        this.app_dir      = path.join(__dirname, '..', '..', 'app');
        this.test_running = false;
        this.last_run     = 0;
    }

    test_monitor() {
        console.log('test_cron_start: auto_monitor_active');
        console.log('test_watch_path: app/');
        console.log('test_result_url: http://localhost:3003/test/test_mech/test_result.html\n');

        // Watch app directory
        fs.watch(this.app_dir, { recursive: true }, (eventType, filename) => {
            if (filename && (filename.endsWith('.html') || filename.endsWith('.js'))) {
                this.test_schedule();
            }
        });

        // Run initial test
        this.test_trigger();
    }

    test_schedule() {
        // Debounce - wait 1 second after last change
        clearTimeout(this.test_timeout);
        this.test_timeout = setTimeout(() => {
            this.test_trigger();
        }, 1000);
    }

    test_trigger() {
        if (this.test_running) return;
        
        const now = Date.now();
        if (now - this.last_run < 2000) return; // Minimum 2 seconds between runs
        
        this.test_running = true;
        this.last_run     = now;
        
        console.log(`\ntest_run_start: ${new Date().toLocaleTimeString()}`);
        
        // Update result to "running"
        fs.writeFileSync(
            path.join(__dirname, 'test_result.json'),
            JSON.stringify({
                running   : true,
                timestamp : new Date().toISOString()
            })
        );
        
        // Run the test list
        exec('node test_start.js', { cwd: __dirname }, (error, stdout, stderr) => {
            this.test_running = false;
            
            if (error) {
                console.log('test_result: fail');
                console.error(stderr || stdout);
            } else {
                console.log('test_result: pass');
            }
            
            // The test runner updates test_result.json with results
        });
    }
}

// Start auto-monitor
const monitor = new test_monitor();
monitor.test_monitor();