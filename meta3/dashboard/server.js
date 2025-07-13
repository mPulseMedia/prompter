const express = require('express');
const path = require('path');
const fs = require('fs');

const requirement_track = require('../requirement/requirement_track');
const test_manage = require('../test/test_manage');
const bug_track = require('../bug/bug_track');
const doc_generate = require('../doc/doc_generate');
const log = require('../log/log');

const app = express();
const PORT = 3003;

const req_track = new requirement_track();
const test_mgr = new test_manage();
const bug_trk = new bug_track();
const doc_gen = new doc_generate();
const log_sys = new log('dashboard');

app.use(express.json());
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
    res.json(test_mgr.testCases);
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

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Meta3 Dashboard running at http://localhost:${PORT}`);
    log_sys.info('Dashboard server started', { port: PORT });
});