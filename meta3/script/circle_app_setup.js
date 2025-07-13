const system_integrator = require('./system_integrator');
const integrator = new system_integrator();

// Process the circle app requirements
const prompt = `
1. Circle Hover App
   The app displays a circle on a webpage
   a. Circle is blue by default
   b. Circle turns red when mouse hovers over it
   c. Circle returns to blue when mouse leaves
   d. Smooth color transition
`;

console.log('Setting up Circle App scaffolding...\n');

// Add requirements
const req1 = integrator.req_tracker.requirement_add({
    description: 'Display a blue circle on the page',
    prompt_id: 'CIRCLE-001'
});

const req2 = integrator.req_tracker.requirement_add({
    description: 'Circle turns red on mouse hover',
    prompt_id: 'CIRCLE-001'
});

const req3 = integrator.req_tracker.requirement_add({
    description: 'Circle returns to blue when mouse leaves',
    prompt_id: 'CIRCLE-001'
});

// Link implementation
integrator.implementation_link(req1.id, '/app/circle.html');
integrator.implementation_link(req2.id, '/app/circle.html');
integrator.implementation_link(req3.id, '/app/circle.html');

// Create test cases
const test1 = integrator.test_mgr.createTestCase({
    name: 'Circle initial color is blue',
    description: 'Verify circle displays blue when page loads',
    requirements: [req1.id],
    type: 'e2e',
    script: integrator.test_mgr.generatePuppeteerTest({
        name: 'Circle initial color',
        url: '/app/circle.html',
        assertions: [{
            type: 'custom',
            description: 'Check circle background is blue'
        }]
    })
});

const test2 = integrator.test_mgr.createTestCase({
    name: 'Circle hover turns red',
    description: 'Verify circle turns red on mouse hover',
    requirements: [req2.id],
    type: 'e2e',
    script: `const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    try {
        await page.goto('http://localhost:3003/app/circle.html');
        
        // Get initial color
        const initial_color = await page.$eval('#circle', el => 
            window.getComputedStyle(el).backgroundColor
        );
        console.log('Initial color:', initial_color);
        
        // Hover over circle
        await page.hover('#circle');
        await page.waitForTimeout(500); // Wait for transition
        
        // Get hover color
        const hover_color = await page.$eval('#circle', el => 
            window.getComputedStyle(el).backgroundColor
        );
        console.log('Hover color:', hover_color);
        
        if (hover_color !== 'rgb(255, 0, 0)') {
            throw new Error('Circle did not turn red on hover');
        }
        
        console.log('Test passed: Circle hover turns red');
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();`
});

// Link tests to requirements
integrator.req_tracker.test_case_link(req1.id, test1.id);
integrator.req_tracker.test_case_link(req2.id, test2.id);

// Document the feature
integrator.doc_gen.documentFeature({
    name: 'Circle Hover Interactive Element',
    description: 'A simple interactive circle that changes color based on mouse hover state',
    user_story: 'As a user, I want to see visual feedback when I hover over the circle element',
    acceptance_criteria: [
        'Circle displays blue by default',
        'Circle turns red when mouse hovers over it',
        'Circle returns to blue when mouse leaves',
        'Color transition is smooth (0.3s ease)'
    ],
    files: ['/app/circle.html']
});

// Log setup completion
integrator.log.info('Circle app scaffolding complete', {
    requirements: 3,
    tests: 2,
    implementation: '/app/circle.html'
});

console.log('\nCircle App Setup Complete!');
console.log('Requirements:', integrator.req_tracker.requirement_coverage_get());
console.log('Tests:', integrator.test_mgr.getTestCoverage());
console.log('\nDashboard: http://localhost:3003');
console.log('Circle App: http://localhost:3003/app/circle.html');