# Puppeteer Testing Guide

## How Puppeteer Tests Work

Puppeteer is a Node.js library that controls headless Chrome/Chromium browsers. It lets you:
- Navigate to web pages
- Click elements, type text, hover
- Take screenshots
- Measure performance
- Debug with DevTools

## Running Tests

### 1. Simple Test Run
```bash
cd meta3
node tests/run_circle_tests.js
```

### 2. Real-time Monitoring (Interactive)
```bash
node tests/realtime_test_monitor.js
```
Then open: http://localhost:3003/tests/monitor.html

## Key Puppeteer Concepts

```javascript
// Launch browser
const browser = await puppeteer.launch({
    headless: false,  // See the browser
    slowMo: 50       // Slow down actions
});

// Create page
const page = await browser.newPage();

// Navigate
await page.goto('http://localhost:3003/app/circle.html');

// Find element & get style
const color = await page.$eval('#circle', el => 
    window.getComputedStyle(el).backgroundColor
);

// Hover over element
await page.hover('#circle');

// Wait for animation
await page.waitForTimeout(400);

// Close browser
await browser.close();
```

## Test Results

- **Console Output**: See pass/fail immediately
- **Real-time Monitor**: Watch tests execute step-by-step
- **Dashboard**: View aggregate metrics at http://localhost:3003
- **Log Files**: Check `tests/realtime_results.json`

## Debugging Tips

1. Set `headless: false` to see the browser
2. Add `devtools: true` to open Chrome DevTools
3. Use `page.screenshot()` to capture states
4. Add `console.log()` in page.evaluate() blocks
5. Use `slowMo` to slow down actions

## Common Patterns

```javascript
// Wait for element
await page.waitForSelector('#circle');

// Click and wait
await page.click('#button');
await page.waitForTimeout(1000);

// Check if element exists
const exists = await page.$('#element') !== null;

// Get multiple elements
const elements = await page.$$('.class');
```