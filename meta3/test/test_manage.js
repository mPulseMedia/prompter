const fs = require('fs');
const path = require('path');

class test_manage {
    constructor() {
        this.testResultPath = path.join(__dirname, 'test_mech', 'test_result.json');
        this.testCases = [];
        this.loadTestResults();
    }

    loadTestResults() {
        try {
            if (fs.existsSync(this.testResultPath)) {
                const data = fs.readFileSync(this.testResultPath, 'utf8');
                const testData = JSON.parse(data);
                this.testCases = testData.results || [];
                this.lastTestTimestamp = testData.timestamp || null;
            }
        } catch (error) {
            console.error('Error loading test results:', error);
            this.testCases = [];
            this.lastTestTimestamp = null;
        }
    }

    getTestCoverage() {
        const total = this.testCases.length;
        const passed = this.testCases.filter(t => t.passed).length;
        const failed = total - passed;
        
        return {
            total,
            passed,
            failed,
            pending: 0,
            coverage: total > 0 ? Math.round((passed / total) * 100) : 0
        };
    }
}

module.exports = test_manage;