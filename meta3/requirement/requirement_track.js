const fs = require('fs');
const path = require('path');

class requirement_track {
    constructor() {
        this.data_file = path.join(__dirname, 'requirements.json');
        this.requirements = this.requirement_load();
    }

    requirement_load() {
        if (fs.existsSync(this.data_file)) {
            return JSON.parse(fs.readFileSync(this.data_file, 'utf8'));
        }
        return { requirements: [], prompts: {} };
    }

    requirement_save() {
        fs.writeFileSync(this.data_file, JSON.stringify(this.requirements, null, 2));
    }

    requirement_add(req) {
        const requirement = {
            id: `REQ-${Date.now()}`,
            description: req.description,
            prompt_id: req.prompt_id,
            created_at: new Date().toISOString(),
            status: 'pending',
            test_cases: [],
            implementation_files: [],
            verification_status: 'unverified'
        };
        this.requirements.requirements.push(requirement);
        
        if (!this.requirements.prompts[req.prompt_id]) {
            this.requirements.prompts[req.prompt_id] = [];
        }
        this.requirements.prompts[req.prompt_id].push(requirement.id);
        
        this.saveRequirements();
        return requirement;
    }

    requirement_update(id, updates) {
        const req = this.requirements.requirements.find(r => r.id === id);
        if (req) {
            Object.assign(req, updates);
            this.saveRequirements();
        }
        return req;
    }

    test_case_link(req_id, test_case_id) {
        const req = this.requirements.requirements.find(r => r.id === reqId);
        if (req && !req.test_cases.includes(testCaseId)) {
            req.test_cases.push(testCaseId);
            this.saveRequirements();
        }
    }

    implementation_link(req_id, file_path) {
        const req = this.requirements.requirements.find(r => r.id === reqId);
        if (req && !req.implementation_files.includes(filePath)) {
            req.implementation_files.push(filePath);
            this.saveRequirements();
        }
    }

    requirement_by_prompt_get(prompt_id) {
        const reqIds = this.requirements.prompts[promptId] || [];
        return reqIds.map(id => this.requirements.requirements.find(r => r.id === id));
    }

    requirement_coverage_get() {
        const total = this.requirements.requirements.length;
        const tested = this.requirements.requirements.filter(r => r.test_cases.length > 0).length;
        const implemented = this.requirements.requirements.filter(r => r.implementation_files.length > 0).length;
        const verified = this.requirements.requirements.filter(r => r.verification_status === 'verified').length;
        
        return {
            total,
            tested,
            implemented,
            verified,
            coverage: {
                test: total > 0 ? (tested / total) * 100 : 0,
                implementation: total > 0 ? (implemented / total) * 100 : 0,
                verification: total > 0 ? (verified / total) * 100 : 0
            }
        };
    }
}

module.exports = requirement_track;