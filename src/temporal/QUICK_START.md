# 🚀 Quick Start - Dual Workflow System

## What Changed?

Instead of one huge `workflowExecutor.js` with embedded logic, you now have:

- **Temporal workflows**: `*.workflow.js` (existing, unchanged)
- **Non-Temporal workflows**: `*-non.workflow.js` (NEW - mirror versions)
- **Router**: `workflowExecutor.js` (simplified to ~80 lines)

## How to Use

### No Code Changes Needed in Controllers!

Your existing controller code still works exactly the same:

```javascript
const { startWorkflow } = require('../utils/temporalClient');

// This works with both Temporal and non-Temporal automatically!
const { workflowId } = await startWorkflow('partnerUserOnboarding', {
    userId: 123,
    email: 'user@example.com',
    profileData: { ... },
    videoBuffer: file.buffer
});
```

### Development (No Temporal)

```bash
# .env
TEMPORAL_ENABLED=false

# Start server (no worker needed!)
npm run dev

# Workflows run directly using *-non.workflow.js files
```

### Production (With Temporal)

```bash
# .env
TEMPORAL_ENABLED=true

# Start API server
npm run start

# Start worker (separate process!)
npm run worker

# Workflows run in Temporal using *.workflow.js files
```

## File Structure

```
src/temporal/
├── workflowExecutor.js                      # Router (~80 lines)
├── workflows/
│   ├── partnerOnboarding.workflow.js        # Temporal version
│   ├── partnerBusinessOnboarding.workflow.js
│   ├── propertyPublishing.workflow.js
│   ├── developerPublishing.workflow.js
│   ├── projectPublishing.workflow.js
│   ├── pgHostelPublishing.workflow.js
│   ├── skip-workflow/                       # Non-Temporal versions (NEW!)
│   │   ├── partnerOnboarding-non.workflow.js
│   │   ├── partnerBusinessOnboarding-non.workflow.js
│   │   ├── propertyPublishing-non.workflow.js
│   │   ├── developerPublishing-non.workflow.js
│   │   ├── projectPublishing-non.workflow.js
│   │   └── pgHostelPublishing-non.workflow.js
│   ├── README.md                            # Structure guide
│   └── MAINTENANCE_GUIDE.md                 # Sync guide
└── activities/                              # Shared by BOTH versions
    ├── partnerOnboarding.activities.js     # No duplication!
    ├── propertyPublishing.activities.js    # Works with both!
    └── registry.js
```

## Key Points

### ✅ Activities Are Shared
```javascript
// activities/myActivities.js
// These work with BOTH workflow versions - no duplication!

async function validateData(input) {
    return { success: true };
}
```

### ✅ Workflows Are Mirrors
```javascript
// Temporal: myWorkflow.workflow.js
await validateData(input);  // Uses proxyActivities

// Non-Temporal: myWorkflow-non.workflow.js
await activities.validateData(input);  // Direct call

// Same logic, different syntax!
```

### ✅ Automatic Routing
```javascript
// temporalClient.js handles this automatically:
if (TEMPORAL_ENABLED) {
    // → myWorkflow.workflow.js
} else {
    // → myWorkflow-non.workflow.js
}
```

## When to Update

### Scenario 1: Change Workflow Logic

Update BOTH files:

```bash
# 1. Edit Temporal version
vim workflows/partnerOnboarding.workflow.js

# 2. Edit non-Temporal version with same changes
vim workflows/skip-workflow/partnerOnboarding-non.workflow.js

# 3. Test both
TEMPORAL_ENABLED=false npm run dev  # Test direct
TEMPORAL_ENABLED=true npm run dev   # Test Temporal
```

### Scenario 2: Change Activity Logic

Update ONLY the activity file - it's shared!

```bash
# Edit once, works for both!
vim activities/partnerOnboarding.activities.js

# No workflow file changes needed
```

### Scenario 3: Add New Workflow

Create both workflow files:

```bash
# 1. Create Temporal version
touch workflows/myNew.workflow.js

# 2. Create non-Temporal version
touch workflows/skip-workflow/myNew-non.workflow.js

# 3. Register in workflowExecutor.js
# 4. Register in workflows/index.js
```

## Testing

```bash
# Test direct execution
TEMPORAL_ENABLED=false
npm run dev
curl -X POST http://localhost:3000/api/partner/onboard -F "profileVideo=@test.mp4" ...

# Test Temporal execution
TEMPORAL_ENABLED=true
npm run dev          # Terminal 1
npm run worker:dev   # Terminal 2
curl -X POST http://localhost:3000/api/partner/onboard -F "profileVideo=@test.mp4" ...
```

## Maintenance

### Keep Files in Sync

The most important rule: **Both workflow versions must have the same business logic!**

Use this checklist when updating:

- [ ] Same number of steps
- [ ] Same step order
- [ ] Same activity calls
- [ ] Same error handling
- [ ] Same return values
- [ ] Same input validation

### Use Diff to Compare

```bash
diff workflows/partnerOnboarding.workflow.js \
     workflows/partnerOnboarding-non.workflow.js

# Should only see differences in:
# - Import statements
# - Activity call syntax (with/without 'activities.')
```

## Documentation

- **[workflows/README.md](./workflows/README.md)** - File structure explained
- **[workflows/MAINTENANCE_GUIDE.md](./workflows/MAINTENANCE_GUIDE.md)** - Detailed sync guide
- **[SOLUTION_SUMMARY.md](./SOLUTION_SUMMARY.md)** - What was built and why
- **[WORKFLOW_EXECUTION_README.md](../../WORKFLOW_EXECUTION_README.md)** - Overall guide

## Benefits Recap

✅ **Easy to maintain** - Files side-by-side, easy to sync  
✅ **No duplication** - Activities are shared  
✅ **Clear separation** - Temporal vs non-Temporal  
✅ **Simple updates** - Copy/paste between files  
✅ **Automatic routing** - No controller changes needed  
✅ **Clean code** - No complex conditionals  

## Questions?

**Q: Do I need to maintain two versions of activities?**  
A: No! Activities are shared. Only workflows have two versions.

**Q: What if I forget to update both workflow files?**  
A: Test with both `TEMPORAL_ENABLED=true` and `false` to catch discrepancies.

**Q: Can I use only Temporal or only non-Temporal?**  
A: Yes! Set `TEMPORAL_ENABLED` accordingly. But having both provides flexibility.

**Q: How do I know which version is running?**  
A: Check logs - they'll say "Temporal" or "Direct Execution".

---

That's it! Your dual workflow system is ready to use. 🎉
