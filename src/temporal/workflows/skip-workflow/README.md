# Skip-Workflow Folder - Non-Temporal Workflow Implementations

## Purpose

This folder contains **non-Temporal versions** of workflows that can execute directly without Temporal server.

These files are used when:
- `TEMPORAL_ENABLED=false` in environment variables
- Temporal server is unavailable (automatic fallback)
- Development/testing without Temporal infrastructure

## File Naming Convention

All files in this folder use the `-non.workflow.js` suffix:

```
skip-workflow/
├── partnerOnboarding-non.workflow.js
├── partnerBusinessOnboarding-non.workflow.js
├── propertyPublishing-non.workflow.js
├── developerPublishing-non.workflow.js
├── projectPublishing-non.workflow.js
└── pgHostelPublishing-non.workflow.js
```

## Relationship to Temporal Workflows

Each file here **mirrors** a Temporal workflow in the parent directory:

| Non-Temporal (this folder) | Temporal (parent folder) |
|----------------------------|--------------------------|
| `partnerOnboarding-non.workflow.js` | `../partnerOnboarding.workflow.js` |
| `partnerBusinessOnboarding-non.workflow.js` | `../partnerBusinessOnboarding.workflow.js` |
| `propertyPublishing-non.workflow.js` | `../propertyPublishing.workflow.js` |
| `developerPublishing-non.workflow.js` | `../developerPublishing.workflow.js` |
| `projectPublishing-non.workflow.js` | `../projectPublishing.workflow.js` |
| `pgHostelPublishing-non.workflow.js` | `../pgHostelPublishing.workflow.js` |

## Key Differences

### Temporal Workflows (Parent Folder)
```javascript
// Uses Temporal's proxyActivities
const { proxyActivities } = require('@temporalio/workflow');

const { validateData } = proxyActivities({ ... });

async function myWorkflow(input) {
    await validateData(input);  // Proxied through Temporal
}
```

### Non-Temporal Workflows (This Folder)
```javascript
// Imports activities directly
const activities = require('../../activities/registry');

async function myWorkflow(input) {
    await activities.validateData(input);  // Direct call
}
```

## Important: Keep in Sync!

⚠️ **Both versions must implement the SAME business logic!**

When updating a workflow:
1. Update the Temporal version in parent folder
2. Update the non-Temporal version in this folder
3. Keep the logic identical (only syntax differs)

## How They're Used

The system automatically routes to the correct version:

```javascript
// In workflowExecutor.js
const { partnerUserOnboarding } = require('./workflows/skip-workflow/partnerOnboarding-non.workflow');

// Called when TEMPORAL_ENABLED=false
const result = await partnerUserOnboarding(input);
```

## Activities Are Shared

All workflows (Temporal and non-Temporal) use the **same activity files**:

```
activities/
├── partnerOnboarding.activities.js   ← Shared by both!
├── propertyPublishing.activities.js  ← No duplication!
└── registry.js                        ← Single source!
```

## Adding a New Workflow

When adding a new workflow:

1. Create Temporal version: `../myNew.workflow.js`
2. Create non-Temporal version: `skip-workflow/myNew-non.workflow.js`
3. Register in `../../workflowExecutor.js`:
   ```javascript
   const { myNew } = require('./workflows/skip-workflow/myNew-non.workflow');
   ```

## Testing

```bash
# Test with non-Temporal versions (this folder)
TEMPORAL_ENABLED=false npm run dev

# Test with Temporal versions (parent folder)
TEMPORAL_ENABLED=true npm run dev
npm run worker:dev  # Separate terminal
```

## Why "skip-workflow"?

The name indicates these workflows **skip Temporal's workflow engine** and execute directly in your Node.js process.

Benefits:
- Faster for development (no Temporal server needed)
- Simpler debugging (runs in same process)
- Easier testing (no worker setup required)
- Automatic fallback (if Temporal fails in production)

## Maintenance

See [../MAINTENANCE_GUIDE.md](../MAINTENANCE_GUIDE.md) for detailed instructions on keeping Temporal and non-Temporal versions in sync.

---

**Summary:** This folder contains direct-execution versions of Temporal workflows. They implement the same logic but run without Temporal's infrastructure. Keep them in sync with parent folder workflows!
