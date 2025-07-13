# Test Module

The test module provides behavioral testing with Puppeteer for real user interaction simulation.

## Folder Structure

### test_mech/
Test infrastructure and mechanisms:
- `test_start.js` - Main test runner that imports all feature tests
- `test_monitor.js` - File watcher that monitors app/ directory
- `test_result.html` - Visual test result page
- `test_result.json` - Test results data
- `test_mouse_cursor.js` - Mouse cursor visualization for tests

### test_script/
Feature-specific test scripts:
- `circle_hover_test.js` - Tests circle hover behavior
- `reset_button_test.js` - Tests reset button functionality
- Each feature has its own dedicated test file with `_test` suffix

## How It Works

- Test mechanism files in `test_mech/` handle the infrastructure
- Feature tests in `test_script/` are named after what they test
- Visual results at: http://localhost:3003/test/test_mech/test_result.html
- Green circle = all tests passing
- Red circle = tests failing
- Updates in real-time

## Visual Test Features

When tests run, you'll see:
- **Red circle** following the mouse cursor
- Circle turns **green** when hovering over interactive elements
- **Green ripple effect** on clicks
- Browser window stays open to show results
- Actions are slowed down (250ms) for visibility

## How It Works

1. **Add a feature** → Test automatically generated
2. **Modify files** → Tests run automatically  
3. **See tests run** → Browser window shows actions
4. **Check results** → Visual indicators on result page

## Example: Adding a Button

When you add a button to your app:
```javascript
<button id="my-button">Click Me</button>
```

A test is automatically generated that:
- Finds the button
- Clicks it
- Verifies expected behavior

## Running Tests

Tests run automatically on file changes, or manually:
```bash
node test_start.js
```