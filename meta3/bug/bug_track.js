const fs = require('fs');
const path = require('path');

class bug_track {
    constructor() {
        this.dataFile = path.join(__dirname, 'bugs.json');
        this.patternsFile = path.join(__dirname, 'bug_patterns.json');
        this.bugs = this.loadBugs();
        this.patterns = this.loadPatterns();
    }

    loadBugs() {
        if (fs.existsSync(this.dataFile)) {
            return JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        }
        return { bugs: [], fixes: {} };
    }

    loadPatterns() {
        if (fs.existsSync(this.patternsFile)) {
            return JSON.parse(fs.readFileSync(this.patternsFile, 'utf8'));
        }
        return { patterns: [], prevention_rules: [] };
    }

    saveBugs() {
        fs.writeFileSync(this.dataFile, JSON.stringify(this.bugs, null, 2));
    }

    savePatterns() {
        fs.writeFileSync(this.patternsFile, JSON.stringify(this.patterns, null, 2));
    }

    reportBug(bug) {
        const bugRecord = {
            id: `BUG-${Date.now()}`,
            title: bug.title,
            description: bug.description,
            severity: bug.severity || 'medium', // critical, high, medium, low
            status: 'open',
            file_path: bug.file_path,
            line_number: bug.line_number,
            error_type: bug.error_type,
            stack_trace: bug.stack_trace,
            reported_at: new Date().toISOString(),
            fixed_at: null,
            fix_description: null,
            related_bugs: [],
            test_cases: []
        };

        this.bugs.bugs.push(bugRecord);
        this.analyzePattern(bugRecord);
        this.saveBugs();
        
        return bugRecord;
    }

    fixBug(bugId, fix) {
        const bug = this.bugs.bugs.find(b => b.id === bugId);
        if (!bug) return null;

        bug.status = 'fixed';
        bug.fixed_at = new Date().toISOString();
        bug.fix_description = fix.description;
        bug.fix_commit = fix.commit;
        bug.fix_files = fix.files;

        if (!this.bugs.fixes[bug.error_type]) {
            this.bugs.fixes[bug.error_type] = [];
        }
        
        this.bugs.fixes[bug.error_type].push({
            bug_id: bugId,
            fix: fix.description,
            pattern: fix.pattern
        });

        this.createPreventionRule(bug, fix);
        this.saveBugs();
        
        return bug;
    }

    analyzePattern(bug) {
        const existingPattern = this.patterns.patterns.find(p => 
            p.error_type === bug.error_type && 
            p.file_pattern && bug.file_path.includes(p.file_pattern)
        );

        if (existingPattern) {
            existingPattern.occurrences++;
            existingPattern.last_seen = bug.reported_at;
            existingPattern.bug_ids.push(bug.id);
        } else {
            this.patterns.patterns.push({
                id: `PATTERN-${Date.now()}`,
                error_type: bug.error_type,
                file_pattern: this.extractFilePattern(bug.file_path),
                occurrences: 1,
                first_seen: bug.reported_at,
                last_seen: bug.reported_at,
                bug_ids: [bug.id]
            });
        }

        this.savePatterns();
    }

    createPreventionRule(bug, fix) {
        const rule = {
            id: `RULE-${Date.now()}`,
            name: `Prevent ${bug.error_type}`,
            description: `Prevention rule created from ${bug.id}`,
            pattern: fix.pattern || bug.error_type,
            file_pattern: this.extractFilePattern(bug.file_path),
            check_code: this.generateCheckCode(bug, fix),
            auto_fix: fix.auto_fix || null,
            created_from_bug: bug.id,
            created_at: new Date().toISOString(),
            times_prevented: 0
        };

        this.patterns.prevention_rules.push(rule);
        this.savePatterns();
    }

    generateCheckCode(bug, fix) {
        return `
// Check for ${bug.error_type}
function check_${bug.error_type.replace(/\W/g, '_')}(code) {
    // Pattern: ${fix.pattern || bug.error_type}
    const pattern = /${fix.pattern || bug.error_type}/g;
    const matches = code.match(pattern);
    
    if (matches) {
        return {
            error: true,
            message: '${bug.title}',
            suggestion: '${fix.description}',
            line: matches.index
        };
    }
    return { error: false };
}`;
    }

    extractFilePattern(filePath) {
        const parts = filePath.split('/');
        return parts[parts.length - 1].replace(/\.[^/.]+$/, '');
    }

    getSimilarBugs(bug) {
        return this.bugs.bugs.filter(b => 
            b.id !== bug.id &&
            (b.error_type === bug.error_type || 
             b.file_path === bug.file_path ||
             this.calculateSimilarity(b.description, bug.description) > 0.7)
        );
    }

    calculateSimilarity(str1, str2) {
        const words1 = str1.toLowerCase().split(/\s+/);
        const words2 = str2.toLowerCase().split(/\s+/);
        const common = words1.filter(w => words2.includes(w));
        return common.length / Math.max(words1.length, words2.length);
    }

    getPreventionStats() {
        const totalBugs = this.bugs.bugs.length;
        const fixedBugs = this.bugs.bugs.filter(b => b.status === 'fixed').length;
        const patterns = this.patterns.patterns.length;
        const rules = this.patterns.prevention_rules.length;
        
        return {
            total_bugs: totalBugs,
            fixed_bugs: fixedBugs,
            open_bugs: totalBugs - fixedBugs,
            fix_rate: totalBugs > 0 ? (fixedBugs / totalBugs) * 100 : 0,
            patterns_identified: patterns,
            prevention_rules: rules
        };
    }
}

module.exports = bug_track;