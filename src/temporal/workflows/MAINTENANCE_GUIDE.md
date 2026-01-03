# Workflow File Comparison - Keep These in Sync!

## Side-by-Side Example: Partner Onboarding

### Temporal Version (`partnerOnboarding.workflow.js`)

```javascript
const { proxyActivities } = require('@temporalio/workflow');

// Proxy activities through Temporal
const {
    validateProfileData,
    uploadVideoToSupabase,
    updatePartnerUser,
    addCredits,
    sendOnboardingNotification,
} = proxyActivities({
    startToCloseTimeout: '5 minutes',
    retry: {
        initialInterval: '1s',
        maximumInterval: '30s',
        backoffCoefficient: 2,
        maximumAttempts: 3,
    },
});

async function partnerUserOnboarding(workflowInput) {
    const { userId, email, profileData, videoBuffer, ... } = workflowInput;
    
    // Step 1: Validate
    const validation = await validateProfileData(profileData);
    if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Step 2: Upload video
    const upload = await uploadVideoToSupabase({
        videoBuffer,
        userId,
        uploadType: 'profile-video'
    });
    
    // Step 3: Update user
    const update = await updatePartnerUser({
        userId,
        profileData,
        profileVideoUrl: upload.videoUrl
    });
    
    // Step 4: Add credits
    try {
        await addCredits({ userId, amount: 2, reason: 'Welcome bonus' });
    } catch (error) {
        // Non-critical
    }
    
    // Step 5: Send notification
    try {
        await sendOnboardingNotification({ email, userName: '...' });
    } catch (error) {
        // Non-critical
    }
    
    return { success: true, userId, videoUrl: upload.videoUrl };
}
```

### Non-Temporal Version (`partnerOnboarding-non.workflow.js`)

```javascript
// Import activities directly
const activities = require('../activities/registry');

async function partnerUserOnboarding(workflowInput) {
    const { userId, email, profileData, videoBuffer, ... } = workflowInput;
    
    // Step 1: Validate (SAME LOGIC)
    const validation = await activities.validateProfileData(profileData);
    if (!validation.success) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Step 2: Upload video (SAME LOGIC)
    const upload = await activities.uploadVideoToSupabase({
        videoBuffer,
        userId,
        uploadType: 'profile-video'
    });
    
    // Step 3: Update user (SAME LOGIC)
    const update = await activities.updatePartnerUser({
        userId,
        profileData,
        profileVideoUrl: upload.videoUrl
    });
    
    // Step 4: Add credits (SAME LOGIC)
    try {
        await activities.addCredits({ userId, amount: 2, reason: 'Welcome bonus' });
    } catch (error) {
        // Non-critical
    }
    
    // Step 5: Send notification (SAME LOGIC)
    try {
        await activities.sendOnboardingNotification({ email, userName: '...' });
    } catch (error) {
        // Non-critical
    }
    
    return { success: true, userId, videoUrl: upload.videoUrl };
}
```

---

## Key Differences

| Aspect | Temporal Version | Non-Temporal Version |
|--------|-----------------|---------------------|
| **Import** | `proxyActivities` from `@temporalio/workflow` | `activities` from `../activities/registry` |
| **Activity calls** | `await validateProfileData(...)` | `await activities.validateProfileData(...)` |
| **Configuration** | Proxy with retry/timeout config | No configuration (uses defaults) |
| **Execution** | Temporal workflow engine | Direct Node.js |
| **Business logic** | ✅ IDENTICAL | ✅ IDENTICAL |

---

## Maintenance Checklist

When updating a workflow, ensure both files have:

- [ ] Same number of steps
- [ ] Same step order
- [ ] Same activity calls (just different syntax)
- [ ] Same error handling (`try/catch`)
- [ ] Same return values
- [ ] Same logging messages
- [ ] Same input destructuring
- [ ] Same validation logic

---

## Quick Conversion Guide

### Converting Temporal → Non-Temporal

1. **Replace import:**
   ```diff
   - const { proxyActivities } = require('@temporalio/workflow');
   - const { activity1, activity2 } = proxyActivities({...});
   + const activities = require('../activities/registry');
   ```

2. **Update activity calls:**
   ```diff
   - await validateData(input)
   + await activities.validateData(input)
   ```

3. **Remove Temporal-specific code:**
   ```diff
   - // Temporal workflow configuration
   - const { activity } = proxyActivities({
   -     startToCloseTimeout: '5 minutes',
   -     retry: { maximumAttempts: 3 }
   - });
   ```

### Converting Non-Temporal → Temporal

1. **Add Temporal import:**
   ```diff
   + const { proxyActivities } = require('@temporalio/workflow');
   + 
   + const { activity1, activity2 } = proxyActivities({
   +     startToCloseTimeout: '5 minutes',
   +     retry: { maximumAttempts: 3 }
   + });
   ```

2. **Update activity calls:**
   ```diff
   - await activities.validateData(input)
   + await validateData(input)
   ```

---

## Testing Both Versions

### Script to Test Consistency

```bash
#!/bin/bash
# test-workflow-sync.sh

echo "Testing Temporal version..."
TEMPORAL_ENABLED=true npm run dev &
API_PID=$!
sleep 5

# Start worker
npm run worker:dev &
WORKER_PID=$!
sleep 5

# Test workflow
curl -X POST http://localhost:3000/api/test-workflow
TEMPORAL_RESULT=$?

kill $API_PID $WORKER_PID

echo "Testing Non-Temporal version..."
TEMPORAL_ENABLED=false npm run dev &
API_PID=$!
sleep 5

# Test workflow (no worker needed)
curl -X POST http://localhost:3000/api/test-workflow
DIRECT_RESULT=$?

kill $API_PID

# Compare results
if [ $TEMPORAL_RESULT -eq $DIRECT_RESULT ]; then
    echo "✅ Both versions work identically"
else
    echo "❌ Versions behave differently!"
fi
```

---

## Common Mistakes

### ❌ Different Logic

```javascript
// Temporal version
if (input.value > 100) {
    await sendNotification();
}

// Non-Temporal version
if (input.value > 50) {  // WRONG! Different logic
    await activities.sendNotification();
}
```

### ❌ Missing Steps

```javascript
// Temporal version
await step1();
await step2();
await step3();

// Non-Temporal version
await activities.step1();
// Missing step2!  // WRONG!
await activities.step3();
```

### ❌ Different Error Handling

```javascript
// Temporal version
try {
    await riskyActivity();
} catch (error) {
    console.warn('Non-critical');
}

// Non-Temporal version
await activities.riskyActivity();  // WRONG! Should have try/catch
```

---

## Automated Sync Tools (Future Enhancement)

Consider creating a tool to auto-generate one from the other:

```javascript
// generate-non-temporal.js
// Reads .workflow.js and generates -non.workflow.js

const fs = require('fs');

function convertToNonTemporal(temporalCode) {
    return temporalCode
        .replace(/const { proxyActivities }.*?;/s, "const activities = require('../activities/registry');")
        .replace(/const {([^}]+)} = proxyActivities\({[^}]+}\);/s, '// Activities imported from registry')
        .replace(/await (\w+)\(/g, 'await activities.$1(');
}

// Usage: node generate-non-temporal.js partnerOnboarding
```

---

## Summary

- **Two files = easier maintenance** than alternatives
- **Keep logic identical** - only syntax differs
- **Test both versions** regularly
- **Update together** - never change just one
- **Use diff tools** to verify sync

When in doubt, copy the Temporal version and just change the activity calls! 🎯
