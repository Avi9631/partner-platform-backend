# Workflow Execution Without Temporal - Fallback Guide

## Overview

Your system now supports **automatic fallback** to direct workflow execution when Temporal is disabled or unavailable. This means:

✅ **Same code works with or without Temporal**  
✅ **No manual try/catch fallback logic needed in controllers**  
✅ **Workflows automatically execute as normal functions when Temporal is off**  
✅ **Seamless development and production experience**

---

## How It Works

### Architecture

```
Controller → temporalClient.js → Decision Point
                                        ↓
                        ┌───────────────┴──────────────┐
                        ↓                              ↓
              TEMPORAL_ENABLED=true          TEMPORAL_ENABLED=false
                        ↓                              ↓
            Temporal Workflow Engine         Direct Function Execution
            (Persistent, Durable)            (workflowExecutor.js)
```

### Automatic Fallback Flow

```javascript
// Your controller code
const { workflowId } = await startWorkflow('partnerUserOnboarding', { ... });

// What happens internally:
// 1. Check if TEMPORAL_ENABLED=true
// 2a. If YES → Send to Temporal (persistent, survives crashes)
// 2b. If NO  → Execute directly as function (runs in your app)
// 3. Return result either way
```

---

## Usage Patterns

### Pattern 1: Fire-and-Forget (Recommended for Long Workflows)

Use `startWorkflow()` when you want to return immediately to the user.

```javascript
const { startWorkflow } = require('../utils/temporalClient');

async function onboardPartner(req, res) {
    // Start workflow - returns immediately
    const { workflowId, mode } = await startWorkflow(
        'partnerUserOnboarding',
        {
            userId: req.user.userId,
            email: req.user.email,
            profileData: { ... },
            videoBuffer: req.files.video.buffer
        }
    );
    
    // mode can be: 'temporal', 'direct', or 'direct-fallback'
    
    // Return 202 Accepted
    res.status(202).json({
        message: "Processing in background",
        workflowId,
        executionMode: mode
    });
}
```

**When to use:**
- File uploads with processing
- Email sending
- Long-running operations
- Multiple steps that can fail independently

### Pattern 2: Synchronous Execution (Wait for Result)

Use `executeWorkflow()` when you need the result before responding.

```javascript
const { executeWorkflow } = require('../utils/temporalClient');

async function publishProperty(req, res) {
    try {
        // Execute and WAIT for completion
        const result = await executeWorkflow(
            'publishPropertyListing',
            {
                propertyId: req.body.propertyId,
                userId: req.user.userId
            }
        );
        
        // Result is available immediately
        res.status(200).json({
            message: "Property published",
            data: result
        });
    } catch (error) {
        // Handle errors (validation, insufficient credits, etc.)
        res.status(500).json({ error: error.message });
    }
}
```

**When to use:**
- Quick operations (< 5 seconds)
- Need to return result to user immediately
- Validation-heavy workflows

⚠️ **Warning:** This blocks the request until workflow completes. Don't use for long operations!

---

## Configuration

### Environment Variables

```env
# Enable/Disable Temporal
TEMPORAL_ENABLED=true          # Use Temporal workflows
TEMPORAL_ENABLED=false         # Use direct execution

# Temporal Connection (only needed if TEMPORAL_ENABLED=true)
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=partner-platform-queue
```

### Development Setup

```bash
# Option 1: With Temporal (Recommended for testing persistence)
TEMPORAL_ENABLED=true
npm run dev          # Terminal 1: API Server
npm run worker:dev   # Terminal 2: Workflow Worker

# Option 2: Without Temporal (Faster for quick development)
TEMPORAL_ENABLED=false
npm run dev          # Only need API server
```

---

## Workflow Execution Modes

The system returns an `executionMode` indicating how the workflow ran:

### 1. `temporal` Mode
```javascript
{ workflowId: "partner-onboarding-123-1234567890", mode: "temporal" }
```
- Temporal is enabled and connected
- Workflow runs in Temporal (persistent)
- Survives application crashes
- Can be monitored in Temporal UI

### 2. `direct` Mode
```javascript
{ workflowId: "direct-partnerUserOnboarding-1234567890", mode: "direct" }
```
- Temporal is intentionally disabled (`TEMPORAL_ENABLED=false`)
- Workflow runs as normal function
- Completes within single request/process
- Faster for development

### 3. `direct-fallback` Mode
```javascript
{ workflowId: "direct-partnerUserOnboarding-1234567890", mode: "direct-fallback" }
```
- Temporal is enabled BUT connection failed
- Automatically fell back to direct execution
- Check logs for connection errors
- Might indicate Temporal server is down

---

## Available Workflows

All workflows automatically support both Temporal and direct execution:

| Workflow Name | Purpose | Pattern |
|--------------|---------|---------|
| `partnerUserOnboarding` | Partner profile completion | Fire-and-forget |
| `partnerBusinessOnboarding` | Business profile setup | Fire-and-forget |
| `publishPropertyListing` | Publish property + deduct credits | Either |
| `publishDeveloperListing` | Publish developer + deduct credits | Either |
| `publishProjectListing` | Publish project + deduct credits | Either |
| `publishPgHostelListing` | Publish PG/Hostel + deduct credits | Either |

---

## Controller Simplification

### ❌ OLD WAY (Manual Fallback - Don't do this)

```javascript
// BEFORE - Lots of boilerplate
const temporalEnabled = process.env.TEMPORAL_ENABLED === 'true';

if (temporalEnabled) {
    try {
        const { workflowId } = await startWorkflow('myWorkflow', data);
        return res.status(202).json({ workflowId });
    } catch (error) {
        // Manual fallback
        logger.error('Temporal failed, falling back...');
    }
}

// Fallback: Direct service calls
await myService.doStep1(data);
await myService.doStep2(data);
await myService.doStep3(data);
// ... more manual steps
```

### ✅ NEW WAY (Automatic Fallback)

```javascript
// AFTER - Simple and clean
const { workflowId, mode } = await startWorkflow('myWorkflow', data);

return res.status(202).json({ 
    workflowId,
    executionMode: mode 
});

// That's it! Fallback is automatic.
```

---

## Adding New Workflows

### 1. Create Workflow File

`src/temporal/workflows/myNewWorkflow.js`:
```javascript
const { proxyActivities } = require('@temporalio/workflow');

const { 
    validateData,
    processData,
    sendNotification 
} = proxyActivities({
    startToCloseTimeout: '5 minutes',
    retry: { maximumAttempts: 3 }
});

async function myNewWorkflow(input) {
    // Step 1: Validate
    const validation = await validateData(input);
    if (!validation.success) {
        throw new Error('Validation failed');
    }
    
    // Step 2: Process
    const result = await processData(input);
    
    // Step 3: Notify
    await sendNotification({ result });
    
    return { success: true, result };
}

module.exports = { myNewWorkflow };
```

### 2. Create Activities

`src/temporal/activities/myNew.activities.js`:
```javascript
async function validateData(input) {
    // Your validation logic
    return { success: true };
}

async function processData(input) {
    // Your processing logic
    return { processed: true };
}

async function sendNotification(data) {
    // Send email/notification
    return { sent: true };
}

module.exports = {
    validateData,
    processData,
    sendNotification
};
```

### 3. Register in Activity Registry

`src/temporal/activities/registry.js`:
```javascript
const myNewActivities = require('./myNew.activities');

module.exports = {
    ...existingActivities,
    ...myNewActivities, // Add your activities
};
```

### 4. Add to Workflow Executor

`src/temporal/workflowExecutor.js`:
```javascript
async function executeWorkflowDirect(workflowName, workflowInput) {
    // ... existing code ...
    
    switch (workflowName) {
        // ... existing workflows ...
        
        case 'myNewWorkflow':
            result = await executeMyNewWorkflow(workflowInput);
            break;
    }
}

async function executeMyNewWorkflow(input) {
    // Step 1: Validate
    const validation = await activities.validateData(input);
    if (!validation.success) {
        throw new Error('Validation failed');
    }
    
    // Step 2: Process
    const result = await activities.processData(input);
    
    // Step 3: Notify
    await activities.sendNotification({ result });
    
    return { success: true, result };
}
```

### 5. Use in Controller

```javascript
const { startWorkflow } = require('../utils/temporalClient');

async function myController(req, res) {
    const { workflowId } = await startWorkflow('myNewWorkflow', {
        userId: req.user.userId,
        data: req.body
    });
    
    res.status(202).json({ workflowId });
}
```

---

## Error Handling

### Workflow Errors

All errors from workflows (Temporal or direct) are thrown as standard errors:

```javascript
try {
    const { workflowId } = await startWorkflow('myWorkflow', data);
} catch (error) {
    // Handle specific errors
    if (error.message.includes('Insufficient balance')) {
        return res.status(402).json({ error: 'Insufficient credits' });
    }
    
    if (error.message.includes('validation failed')) {
        return res.status(400).json({ error: error.message });
    }
    
    // Generic error
    return res.status(500).json({ error: 'Workflow failed' });
}
```

### Activity Errors

Activities should return structured errors:

```javascript
async function validateData(input) {
    const errors = [];
    
    if (!input.name) errors.push('Name is required');
    if (!input.email) errors.push('Email is required');
    
    if (errors.length > 0) {
        return { 
            success: false, 
            errors 
        };
    }
    
    return { success: true };
}
```

---

## Testing

### Test with Temporal

```bash
# Start Temporal
temporal server start-dev

# Set environment
TEMPORAL_ENABLED=true

# Start app and worker
npm run dev          # Terminal 1
npm run worker:dev   # Terminal 2

# Make API calls
curl -X POST http://localhost:3000/api/partner/onboard \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "profileVideo=@video.mp4" \
  -F "firstName=John"

# Check Temporal UI
# http://localhost:8233
```

### Test without Temporal (Direct Mode)

```bash
# Set environment
TEMPORAL_ENABLED=false

# Start only app server
npm run dev

# Make API calls - workflows run directly
curl -X POST http://localhost:3000/api/partner/onboard \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "profileVideo=@video.mp4" \
  -F "firstName=John"
```

### Test Automatic Fallback

```bash
# Enable Temporal but don't start server
TEMPORAL_ENABLED=true

# Start only app server (no worker)
npm run dev

# Make API calls
# Should automatically fall back to direct execution
# Check logs for: "Temporal connection failed, falling back..."
```

---

## Monitoring

### Check Execution Mode

```javascript
// In your controller response
res.json({
    workflowId: "abc-123",
    executionMode: "temporal",  // or "direct" or "direct-fallback"
    message: "Processing"
});
```

### Logs

```bash
# Temporal mode
[INFO]: Workflow started: partnerUserOnboarding (ID: partner-onboarding-123-456)

# Direct mode
[INFO]: Temporal disabled, executing workflow directly: partnerUserOnboarding
[INFO]: [Direct Execution] Starting workflow: partnerUserOnboarding
[INFO]: [Partner Onboarding] Step 1: Validating profile data...

# Fallback mode
[WARN]: Temporal connection failed, falling back to direct execution...
[INFO]: [Direct Execution] Starting workflow: partnerUserOnboarding
```

---

## Performance Comparison

| Aspect | Temporal Mode | Direct Mode |
|--------|--------------|-------------|
| **Latency** | Higher (network calls) | Lower (in-process) |
| **Persistence** | Yes (survives crashes) | No (lost on crash) |
| **Visibility** | Temporal UI | Application logs only |
| **Scalability** | Horizontal (multiple workers) | Vertical (single process) |
| **Retry Logic** | Automatic + configurable | Manual in code |
| **Best for** | Production | Development/Simple cases |

---

## Best Practices

### ✅ DO

- Use `startWorkflow()` for async operations (file uploads, notifications)
- Use `executeWorkflow()` for quick operations that need results
- Test both with and without Temporal during development
- Log the `executionMode` for debugging
- Handle errors from workflows uniformly

### ❌ DON'T

- Mix direct service calls with workflow calls in controllers
- Use `executeWorkflow()` for long-running operations (> 30 seconds)
- Put business logic in controllers - keep it in activities
- Forget to register new activities in `registry.js`
- Ignore the `executionMode` in responses

---

## Migration Guide

If you have existing controllers with manual fallback logic:

### Step 1: Remove Manual Fallback

```javascript
// REMOVE THIS:
const temporalEnabled = process.env.TEMPORAL_ENABLED === 'true';
if (temporalEnabled) {
    try {
        await startWorkflow(...);
    } catch (error) {
        // Manual fallback
    }
}
// Direct service calls...
```

### Step 2: Simplify to Single Call

```javascript
// REPLACE WITH THIS:
const { workflowId, mode } = await startWorkflow(...);
return res.status(202).json({ workflowId, executionMode: mode });
```

### Step 3: Ensure Activities are Registered

Check that all your service methods are wrapped as activities in the activities folder and registered in `registry.js`.

### Step 4: Add Direct Execution Handler

Add your workflow to `workflowExecutor.js` following the pattern of existing workflows.

### Step 5: Test Both Modes

```bash
# Test with Temporal
TEMPORAL_ENABLED=true npm run dev

# Test without Temporal
TEMPORAL_ENABLED=false npm run dev
```

---

## Troubleshooting

### "Unknown workflow: myWorkflow"

**Problem:** Workflow not registered in `workflowExecutor.js`

**Solution:** Add your workflow to the switch statement and create the execution function.

### "Activity not found"

**Problem:** Activity not registered in `activities/registry.js`

**Solution:** 
```javascript
// activities/registry.js
const myActivities = require('./myActivities.activities');

module.exports = {
    ...existingActivities,
    ...myActivities,
};
```

### Workflow runs in direct mode when Temporal is enabled

**Problem:** Connection to Temporal failing, falling back automatically

**Solution:** 
1. Check Temporal server is running: `temporal server start-dev`
2. Check worker is running: `npm run worker:dev`
3. Verify `TEMPORAL_ADDRESS` in `.env`
4. Check logs for connection errors

### Direct mode is slower than expected

**Problem:** Activities might be doing unnecessary work

**Solution:** Optimize your activity implementations. Direct mode runs everything in-process, so performance issues are in your code, not the execution mechanism.

---

## Summary

✅ **Your workflows now work with or without Temporal**  
✅ **Automatic fallback - no manual try/catch needed**  
✅ **Same code for development and production**  
✅ **Cleaner controllers - business logic stays in workflows/activities**  
✅ **Flexible deployment - choose based on needs**

For questions or issues, check the logs and the `executionMode` in responses!
