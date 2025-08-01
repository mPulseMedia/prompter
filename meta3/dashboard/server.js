const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const requirement_track = require('../requirement/requirement_track');
const test_manage = require('../test/test_manage');
const bug_track = require('../bug/bug_track');
const doc_generate = require('../doc/doc_generate');
const log = require('../log/log');

const app = express();
const PORT = 3003;

// Increase server timeout to handle slower requests
const SERVER_TIMEOUT = 30000; // 30 seconds

const req_track = new requirement_track();
const test_mgr = new test_manage();
const bug_trk = new bug_track();
const doc_gen = new doc_generate();
const log_sys = new log('dashboard');

// Track if tests are currently running
let isTestRunning = false;
let currentTestStatus = {};
let currentTestProcess = null;

app.use(express.json());

// Add keep-alive settings to prevent connection drops
app.use((req, res, next) => {
    res.set('Connection', 'keep-alive');
    res.set('Keep-Alive', 'timeout=5');
    next();
});

// Disable caching for all responses
app.use((req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Serve demo page as default (before static handlers)
app.get('/', (req, res) => {
    // Add a small delay to prevent race conditions during rapid reloads
    setTimeout(() => {
        res.sendFile(path.join(__dirname, 'demo.html'));
    }, 10);
});

app.use(express.static(path.join(__dirname)));
app.use('/app', express.static(path.join(__dirname, '..', 'app')));
app.use('/test', express.static(path.join(__dirname, '..', 'test')));

app.get('/api/overview', (req, res) => {
    log_sys.info('Fetching system overview');
    
    const overview = {
        requirement: req_track.requirement_coverage_get(),
        test: test_mgr.getTestCoverage(),
        bug: bug_trk.getPreventionStats(),
        debug: log_sys.getDebugSummary(),
        timestamp: new Date().toISOString()
    };
    
    res.json(overview);
});

app.get('/api/requirement', (req, res) => {
    res.json(req_track.requirements);
});

app.get('/api/test', (req, res) => {
    // Include both test cases and metadata from the file
    const testData = {
        tests: test_mgr.testCases,
        timestamp: test_mgr.lastTestTimestamp || null,
        total: test_mgr.testCases.length,
        passed: test_mgr.testCases.filter(t => t.passed).length,
        failed: test_mgr.testCases.filter(t => !t.passed).length
    };
    res.json(testData);
});

app.get('/api/test/status', (req, res) => {
    res.json({
        isRunning: isTestRunning,
        currentTest: currentTestStatus
    });
});

app.post('/api/test/progress', (req, res) => {
    const { testName, action } = req.body;
    currentTestStatus = { name: testName, action: action };
    log_sys.info('Test progress update', { testName, action });
    res.json({ success: true });
});

app.get('/api/bug', (req, res) => {
    res.json(bug_trk.bugs);
});

app.get('/api/doc', (req, res) => {
    res.json(doc_gen.docs);
});

app.post('/api/requirement', (req, res) => {
    const requirement = req_track.requirement_add(req.body);
    log_sys.info('Added new requirement', { id: requirement.id });
    res.json(requirement);
});

app.post('/api/test', (req, res) => {
    const testCase = test_mgr.createTestCase(req.body);
    log_sys.info('Created new test case', { id: testCase.id });
    res.json(testCase);
});

app.post('/api/bug', (req, res) => {
    const bug = bug_trk.reportBug(req.body);
    log_sys.warn('New bug reported', { id: bug.id, severity: bug.severity });
    res.json(bug);
});

app.post('/api/test/run/:id', async (req, res) => {
    const result = await test_mgr.runTest(req.params.id);
    log_sys.info('Test executed', { id: req.params.id, status: result.status });
    res.json(result);
});

app.post('/api/stop-tests', (req, res) => {
    if (!isTestRunning || !currentTestProcess) {
        return res.json({ 
            success: true, 
            message: 'No tests running' 
        });
    }
    
    log_sys.info('Stopping running tests');
    
    try {
        // Kill the test process
        process.kill(currentTestProcess.pid, 'SIGTERM');
        
        // Also try to kill any Chrome instances that might be orphaned
        exec('pkill -f "Google Chrome.*test-mode=true"', (error) => {
            // Ignore errors - pkill returns error if no processes found
        });
        
        isTestRunning = false;
        currentTestStatus = {};
        currentTestProcess = null;
        
        res.json({ 
            success: true, 
            message: 'Tests stopped' 
        });
    } catch (error) {
        log_sys.error('Error stopping tests', { error: error.message });
        res.status(500).json({ 
            success: false, 
            error: 'Failed to stop tests',
            details: error.message 
        });
    }
});

app.post('/api/run-tests', (req, res) => {
    if (isTestRunning) {
        log_sys.info('Test run requested but tests are already running');
        return res.status(409).json({ 
            success: false, 
            error: 'Tests are already running',
            message: 'Wait for current tests to complete'
        });
    }
    
    isTestRunning = true;
    currentTestStatus = {};
    const { headless = false } = req.body;
    log_sys.info('Running all tests via test_start.js', { headless });
    
    const testScriptPath = path.join(__dirname, '..', 'test', 'test_mech', 'test_start.js');
    const command = headless ? `node ${testScriptPath} --headless` : `node ${testScriptPath}`;
    
    currentTestProcess = exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        isTestRunning = false;
        currentTestStatus = {};
        currentTestProcess = null;
        
        if (error) {
            // Check if the error is due to process being killed
            if (error.signal === 'SIGTERM') {
                log_sys.info('Test execution was stopped by user');
                return;
            }
            
            log_sys.error('Test execution failed', { error: error.message, stderr });
            return res.status(500).json({ 
                success: false, 
                error: 'Test execution failed',
                details: stderr || error.message 
            });
        }
        
        log_sys.info('Tests completed successfully');
        
        // Reload test results after running tests
        test_mgr.loadTestResults();
        
        res.json({ 
            success: true, 
            message: 'Tests completed',
            output: stdout 
        });
    });
});

app.post('/api/restart-server', (req, res) => {
    log_sys.info('Server restart requested - ignoring (server should not self-terminate)');
    
    res.json({ 
        success: true, 
        message: 'Server restart not supported - server remains running' 
    });
    
    // DO NOT kill the server - this is bad practice
    // If you need to restart, do it manually from the terminal
});

// Route already defined above, removing duplicate

// Global error handlers to prevent server crashes
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    log_sys.error('Express error handler', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal server error' });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    log_sys.error('Uncaught exception', { error: err.message, stack: err.stack });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    log_sys.error('Unhandled rejection', { reason });
});

const server = app.listen(PORT, () => {
    console.log(`Meta3 Dashboard running at http://localhost:${PORT}`);
    log_sys.info('Dashboard server started', { port: PORT });
});

// Set server timeout
server.timeout = SERVER_TIMEOUT;
server.keepAliveTimeout = 5000;
server.headersTimeout = 5000;

// Watch server.js for changes and auto-restart
const serverFilePath = path.join(__dirname, 'server.js');
let serverFileWatcher = null;

function watchServerFile() {
    serverFileWatcher = fs.watch(serverFilePath, (eventType) => {
        if (eventType === 'change') {
            console.log('\n🔄 Server file changed, restarting automatically...\n');
            log_sys.info('Server file changed, triggering restart');
            
            // Close watcher to prevent multiple triggers
            if (serverFileWatcher) {
                serverFileWatcher.close();
            }
            
            // Close server gracefully
            server.close(() => {
                console.log('Server closed for restart');
                process.exit(0); // Exit to allow restart
            });
            
            // Force exit after 2 seconds if graceful shutdown fails
            setTimeout(() => {
                process.exit(0);
            }, 2000);
        }
    });
}

// Start watching server file
watchServerFile();

// Graceful shutdown handler
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server gracefully');
    if (serverFileWatcher) {
        serverFileWatcher.close();
    }
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});