# Workflow Structure - Temporal and Non-Temporal Files

## Overview

This directory contains **two versions** of each workflow:

1. **Temporal workflows** (`*.workflow.js`) - For Temporal execution
2. **Non-Temporal workflows** (`*-non.workflow.js`) - For direct execution

Both versions implement **THE SAME LOGIC** but use different execution mechanisms.

---

## File Structure

```
workflows/
├── partnerOnboarding.workflow.js              # Temporal version
├── partnerBusinessOnboarding.workflow.js
├── propertyPublishing.workflow.js
├── developerPublishing.workflow.js
├── projectPublishing.workflow.js
├── pgHostelPublishing.workflow.js
└── skip-workflow/                             # Non-Temporal versions
    ├── partnerOnboarding-non.workflow.js      # Direct version
    ├── partnerBusinessOnboarding-non.workflow.js
    ├── propertyPublishing-non.workflow.js
    ├── developerPublishing-non.workflow.js
    ├── projectPublishing-non.workflow.js
    └── pgHostelPublishing-non.workflow.js
```

---

## Key Differences

### Temporal Workflows (`.workflow.js`)

```javascript
// Uses Temporal's proxyActivities
const { proxyActivities } = require('@temporalio/workflow');

const { validateData, processData } = proxyActivities({
    startToCloseTimeout: '5 minutes',
    retry: { maximumAttempts: 3 }
});

async function myWorkflow(input) {
    // Activities are proxied through Temporal
    const result = await validateData(input);
    // ...
}
```

**Runs in:** Temporal workflow engine  
**Used when:** `TEMPORAL_ENABLED=true` and Temporal server is available  
**Benefits:** Persistent, durable, survives crashes

### Non-Temporal Workflows (`-non.workflow.js`)

```javascript
// Imports activities directly
const activities = require('../activities/registry');

async function myWorkflow(input) {
    // Activities are called directly
    const result = await activities.validateData(input);
    // ...
}
```

**Runs in:** Your Node.js application process  
**Used when:** `TEMPORAL_ENABLED=false` or Temporal unavailable  
**Benefits:** Simpler, faster for development, no external dependencies

---

## How Routing Works

The system automatically routes to the correct version:

```javascript
// In temporalClient.js
if (TEMPORAL_ENABLED) {
    // Uses .workflow.js files through Temporal
    await client.workflow.start('partnerUserOnboarding', ...);
} else {
    // Uses -non.workflow.js files directly
    await workflowExecutor.executeWorkflowDirect('partnerUserOnboarding', ...);
}
```

---

## Maintenance Guidelines

### ⚠️ CRITICAL: Keep Files in Sync

Both versions must implement the **SAME BUSINESS LOGIC**. When updating a workflow:

1. Update the Temporal version (`.workflow.js`)
2. Update the non-Temporal version (`-non.workflow.js`)
3. Ensure both versions have the same steps and logic

### Example: Adding a New Step

**Step 1:** Update Temporal workflow

```javascript
// partnerOnboarding.workflow.js
async function partnerUserOnboarding(input) {
    await validateProfileData(input);
    await uploadVideoToSupabase(input);
    await updatePartnerUser(input);
    await addCredits(input);              // NEW STEP
    await sendOnboardingNotification(input);
}
```

**Step 2:** Update non-Temporal workflow (keep in sync!)

```javascript
// partnerOnboarding-non.workflow.js
async function partnerUserOnboarding(input) {
    await activities.validateProfileData(input);
    await activities.uploadVideoToSupabase(input);
    await activities.updatePartnerUser(input);
    await activities.addCredits(input);   // SAME NEW STEP
    await activities.sendOnboardingNotification(input);
}
```

### Quick Sync Checklist

- [ ] Same number of steps
- [ ] Same step order
- [ ] Same activity calls
- [ ] Same error handling
- [ ] Same return values
- [ ] Same logging messages

---

## Adding a New Workflow

### Step 1: Create Temporal Workflow

Create `workflows/myNewWorkflow.workflow.js`:

```javascript
const { proxyActivities } = require('@temporalio/workflow');

const { step1, step2, step3 } = proxyActivities({
    startToCloseTimeout: '5 minutes',
    retry: { maximumAttempts: 3 }
});

async function myNewWorkflow(input) {
    console.log('[My Workflow] Step 1: ...');
    await step1(input);
    
    console.log('[My Workflow] Step 2: ...');
    await step2(input);
    
    console.log('[My Workflow] Step 3: ...');
    await step3(input);
    
    return { success: true };
}

module.exports = { myNewWorkflow };
```

### Step 2: Create Non-Temporal Workflow

Create `workflows/skip-workflow/myNewWorkflow-non.workflow.js`:

```javascript
const activities = require('../activities/registry');

async function myNewWorkflow(input) {
    console.log('[My Workflow - Direct] Step 1: ...');
    await activities.step1(input);
    
    console.log('[My Workflow - Direct] Step 2: ...');
    await activities.step2(input);
    
    console.log('[My Workflow - Direct] Step 3: ...');
    await activities.step3(input);
    
    return { success: true };
}

module.exports = { myNewWorkflow };
```

### Step 3: Register in Workflow Executor

Update `workflowExecutor.js`:

```javascript
// Add import
const { myNewWorkflow } = require('./workflows/skip-workflow/myNewWorkflow-non.workflow');

// Add case
switch (workflowName) {
    // ... existing cases
    case 'myNewWorkflow':
        result = await myNewWorkflow(workflowInput);
        break;
}
```

### Step 4: Register in Temporal Worker

Update `workflows/index.js`:

```javascript
module.exports = {
    // ... existing exports
    myNewWorkflow: require('./myNewWorkflow.workflow').myNewWorkflow,
};
```

---

## Why Two Files?

### Alternative Approaches Considered

#### ❌ Option 1: Single file with conditional logic

```javascript
// BAD: Complex and error-prone
if (isTemporalMode) {
    const { proxyActivities } = require('@temporalio/workflow');
    const activities = proxyActivities({...});
} else {
    const activities = require('../activities/registry');
}
```

**Problems:**
- Complex conditional logic
- Hard to test
- Temporal's workflow bundler may break
- Mixed concerns

#### ❌ Option 2: Huge workflowExecutor.js with embedded logic

```javascript
// BAD: All logic in one giant file
async function executePartnerUserOnboarding(input) {
    // 100 lines of workflow logic here
    // Duplicated from .workflow.js
}
```

**Problems:**
- Logic duplicated
- Hard to maintain
- Single point of failure
- Difficult to keep in sync

#### ✅ Option 3: Separate -non.workflow.js files (CURRENT)

**Benefits:**
- Clear separation of concerns
- Easy to copy/paste between files
- Side-by-side comparison
- Small workflowExecutor.js (just routing)
- Easy to test both versions

---

## Testing

### Test Temporal Version

```bash
TEMPORAL_ENABLED=true
npm run dev          # Terminal 1
npm run worker:dev   # Terminal 2

# Test workflow
curl -X POST http://localhost:3000/api/partner/onboard ...
```

### Test Non-Temporal Version

```bash
TEMPORAL_ENABLED=false
npm run dev

# Test workflow
curl -X POST http://localhost:3000/api/partner/onboard ...
```

### Verify Logic is Identical

```bash
# Compare files side-by-side
diff workflows/partnerOnboarding.workflow.js \
     workflows/partnerOnboarding-non.workflow.js
```

---

## Activities

**Good news:** Activities are already normal async functions! They work in both modes:

```javascript
// activities/myActivity.activities.js
async function validateData(input) {
    // Just a normal async function
    // Works with Temporal AND direct execution
    return { success: true };
}
```

**No duplication needed** for activities - they're shared by both workflow versions.

---

## Best Practices

### ✅ DO

- Keep Temporal and non-Temporal workflows in sync
- Use the same step numbers and logging
- Test both versions regularly
- Copy/paste between files when updating
- Keep workflow logic simple

### ❌ DON'T

- Add Temporal-specific code to `-non.workflow.js`
- Add different business logic between versions
- Forget to update both files
- Put business logic in controllers (put in activities)
- Make workflows too complex

---

## Troubleshooting

### "Unknown workflow" error

**Problem:** Workflow not registered in workflowExecutor.js

**Solution:**
```javascript
// workflowExecutor.js
const { myWorkflow } = require('./workflows/myWorkflow-non.workflow');

case 'myWorkflow':
    result = await myWorkflow(workflowInput);
    break;
```

### Workflows behave differently in Temporal vs Direct mode

**Problem:** Logic is out of sync between `.workflow.js` and `-non.workflow.js`

**Solution:** Compare files and ensure steps match exactly:
```bash
diff workflows/myWorkflow.workflow.js \
     workflows/myWorkflow-non.workflow.js
```

### Temporal workflow not found

**Problem:** Not exported in `workflows/index.js`

**Solution:**
```javascript
// workflows/index.js
module.exports = {
    myWorkflow: require('./myWorkflow.workflow').myWorkflow,
};
```

---

## Summary

- **Two files per workflow** - easier to maintain than alternatives
- **Same logic** - both versions must match
- **Activities are shared** - no duplication needed
- **Update both** - when changing workflow logic
- **Test both** - to ensure they work identically

This structure makes it easy to run workflows with or without Temporal while keeping maintenance manageable! 🚀
