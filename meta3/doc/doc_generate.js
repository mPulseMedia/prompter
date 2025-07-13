const fs = require('fs');
const path = require('path');

class doc_generate {
    constructor() {
        this.dataFile = path.join(__dirname, 'documentation.json');
        this.docs = this.loadDocs();
    }

    loadDocs() {
        if (fs.existsSync(this.dataFile)) {
            return JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        }
        return { 
            features: [],
            workflows: [],
            api_endpoints: [],
            data_flows: []
        };
    }

    saveDocs() {
        fs.writeFileSync(this.dataFile, JSON.stringify(this.docs, null, 2));
    }

    documentFeature(feature) {
        const doc = {
            id: `FEAT-${Date.now()}`,
            name: feature.name,
            description: feature.description,
            user_story: feature.user_story,
            acceptance_criteria: feature.acceptance_criteria || [],
            technical_notes: feature.technical_notes,
            dependencies: feature.dependencies || [],
            files_involved: feature.files || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.docs.features.push(doc);
        this.saveDocs();
        return doc;
    }

    documentWorkflow(workflow) {
        const doc = {
            id: `FLOW-${Date.now()}`,
            name: workflow.name,
            description: workflow.description,
            steps: workflow.steps || [],
            actors: workflow.actors || [],
            preconditions: workflow.preconditions || [],
            postconditions: workflow.postconditions || [],
            error_scenarios: workflow.error_scenarios || [],
            created_at: new Date().toISOString()
        };

        this.docs.workflows.push(doc);
        this.saveDocs();
        return doc;
    }

    generateProductManagerSummary() {
        const summary = {
            generated_at: new Date().toISOString(),
            total_features: this.docs.features.length,
            total_workflows: this.docs.workflows.length,
            features: this.docs.features.map(f => ({
                name: f.name,
                description: f.description,
                user_story: f.user_story,
                acceptance_criteria: f.acceptance_criteria
            })),
            workflows: this.docs.workflows.map(w => ({
                name: w.name,
                description: w.description,
                steps: w.steps.map(s => s.description || s)
            }))
        };

        const summaryPath = path.join(__dirname, 'pm_summary.md');
        const content = this.formatPMSummary(summary);
        fs.writeFileSync(summaryPath, content);
        
        return summaryPath;
    }

    formatPMSummary(summary) {
        let content = `# Product Manager Summary\n\n`;
        content += `Generated: ${summary.generated_at}\n\n`;
        
        content += `## Features (${summary.total_features})\n\n`;
        summary.features.forEach(f => {
            content += `### ${f.name}\n`;
            content += `${f.description}\n\n`;
            if (f.user_story) {
                content += `**User Story:** ${f.user_story}\n\n`;
            }
            if (f.acceptance_criteria.length > 0) {
                content += `**Acceptance Criteria:**\n`;
                f.acceptance_criteria.forEach(ac => {
                    content += `- ${ac}\n`;
                });
                content += '\n';
            }
        });

        content += `## Workflows (${summary.total_workflows})\n\n`;
        summary.workflows.forEach(w => {
            content += `### ${w.name}\n`;
            content += `${w.description}\n\n`;
            if (w.steps.length > 0) {
                content += `**Steps:**\n`;
                w.steps.forEach((step, i) => {
                    content += `${i + 1}. ${step}\n`;
                });
                content += '\n';
            }
        });

        return content;
    }

    documentFromPrompt(promptId, promptContent) {
        const lines = promptContent.split('\n');
        const features = [];
        let currentFeature = null;

        lines.forEach(line => {
            if (line.match(/^\d+\./)) {
                if (currentFeature) {
                    features.push(currentFeature);
                }
                currentFeature = {
                    name: line.replace(/^\d+\.\s*/, ''),
                    description: '',
                    acceptance_criteria: []
                };
            } else if (currentFeature && line.trim()) {
                if (line.match(/^\s*[a-z]\./)) {
                    currentFeature.acceptance_criteria.push(line.trim());
                } else {
                    currentFeature.description += line.trim() + ' ';
                }
            }
        });

        if (currentFeature) {
            features.push(currentFeature);
        }

        features.forEach(f => this.documentFeature(f));
        return features;
    }
}

module.exports = doc_generate;