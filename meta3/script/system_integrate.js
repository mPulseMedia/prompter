const requirement_tracker = require('../requirements/requirement_tracker');
const test_manager = require('../tests/test_manager');
const bug_tracker = require('../bugs/bug_tracker');
const doc_generator = require('../docs/doc_generator');
const logger = require('../logs/logger');

class system_integrator {
    constructor() {
        this.req_tracker = new requirement_tracker();
        this.test_mgr = new test_manager();
        this.bug_track = new bug_tracker();
        this.doc_gen = new doc_generator();
        this.log = new logger('integrator');
    }

    // When a new prompt is executed
    processPrompt(promptId, promptContent) {
        this.log.info('Processing prompt', { promptId });
        
        // Extract and create requirements
        const features = this.doc_gen.documentFromPrompt(promptId, promptContent);
        
        features.forEach(feature => {
            // Create requirement
            const req = this.req_tracker.addRequirement({
                description: feature.description,
                prompt_id: promptId
            });
            
            // Generate test cases
            feature.acceptance_criteria.forEach(criteria => {
                const testCase = this.test_mgr.createTestCase({
                    name: `Test: ${criteria}`,
                    description: `Verify: ${criteria}`,
                    requirements: [req.id],
                    type: 'e2e',
                    assertions: [{
                        type: 'custom',
                        description: criteria
                    }]
                });
                
                this.req_tracker.linkTestCase(req.id, testCase.id);
            });
        });
        
        return features;
    }

    // When code is generated
    linkImplementation(requirementId, filePath) {
        this.log.info('Linking implementation', { requirementId, filePath });
        this.req_tracker.linkImplementation(requirementId, filePath);
    }

    // When a test fails
    handleTestFailure(testId, error) {
        this.log.error('Test failed', { testId, error: error.message });
        
        const test = this.test_mgr.testCases.test_cases.find(t => t.id === testId);
        if (!test) return;
        
        // Create bug report
        const bug = this.bug_track.reportBug({
            title: `Test failure: ${test.name}`,
            description: `Test ${testId} failed with error: ${error.message}`,
            severity: 'high',
            error_type: 'test_failure',
            stack_trace: error.stack,
            file_path: test.script || 'unknown',
            line_number: error.line || 0
        });
        
        // Link bug to test
        test.bugs = test.bugs || [];
        test.bugs.push(bug.id);
        this.test_mgr.saveTestCases();
        
        return bug;
    }

    // When a bug is fixed
    handleBugFix(bugId, fixDetails) {
        this.log.info('Processing bug fix', { bugId });
        
        const bug = this.bug_track.fixBug(bugId, fixDetails);
        if (!bug) return;
        
        // Create test to prevent regression
        const preventionTest = this.test_mgr.createTestCase({
            name: `Regression test for ${bug.id}`,
            description: `Ensure ${bug.title} does not resurface`,
            type: 'unit',
            script: fixDetails.test_script,
            suite: 'regression'
        });
        
        bug.test_cases.push(preventionTest.id);
        this.bug_track.saveBugs();
        
        return preventionTest;
    }

    // Generate comprehensive report
    generateReport() {
        const overview = {
            requirements: this.req_tracker.getRequirementCoverage(),
            tests: this.test_mgr.getTestCoverage(),
            bugs: this.bug_track.getPreventionStats(),
            debug: this.log.getDebugSummary()
        };
        
        // Generate PM summary
        const pmSummaryPath = this.doc_gen.generateProductManagerSummary();
        
        return {
            overview,
            pm_summary: pmSummaryPath,
            generated_at: new Date().toISOString()
        };
    }
}

module.exports = system_integrator;