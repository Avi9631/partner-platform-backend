# Temporal Architecture Documentation

## Overview

This document describes the enterprise-level architecture of the Temporal integration in the Partner Platform Backend. The implementation follows best practices for maintainability, scalability, and testability.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Directory Structure](#directory-structure)
3. [Workflows](#workflows)
4. [Activities](#activities)
5. [Configuration](#configuration)
6. [Best Practices](#best-practices)
7. [Development Guide](#development-guide)

---

## Architecture Overview

The Temporal implementation follows a clean architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  (HTTP Controllers, API Routes)                              │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│                  Temporal Client                             │
│  (Workflow Orchestration, Signal/Query Handling)             │
└────────────────┬────────────────────────────────────────────┘
                 │
     ┌───────────┴───────────┐
     │                       │
┌────▼──────┐         ┌─────▼─────┐
│ Workflows │         │ Activities │
└───────────┘         └────────────┘
     │                       │
     └───────────┬───────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│              Business Logic & Data Layer                     │
│  (Services, Repositories, External APIs)                     │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Separation of Concerns**: Workflows orchestrate, activities execute
2. **Domain-Driven Design**: Organized by business domains (user, payment, listing, analytics)
3. **Type Safety**: JSDoc type definitions for better IDE support
4. **Configurability**: Centralized configuration for timeouts and retry policies
5. **Observability**: Comprehensive logging throughout

---

## Directory Structure

```
src/temporal/
├── config/
│   └── constants.js              # Timeouts, retry policies, workflow configs
├── types.js                      # JSDoc type definitions
├── worker.js                     # Worker process entry point
│
├── workflows/                    # Workflow definitions (orchestration logic)
│   ├── index.js                  # Workflow registry
│   │
│   ├── user/                     # User domain workflows
│   │   ├── notification.workflow.js
│   │   └── onboarding.workflow.js
│   │
│   ├── payment/                  # Payment domain workflows
│   │   ├── payment.workflow.js
│   │   └── subscription.workflow.js
│   │
│   ├── listing/                  # Listing domain workflows
│   │   ├── approval.workflow.js
│   │   └── expiration.workflow.js
│   │
│   └── analytics/                # Analytics domain workflows
│       └── scheduled.workflow.js
│
└── activities/                   # Activity implementations (execution logic)
    ├── index.js                  # Legacy compatibility
    ├── registry.js               # Activity registry
    │
    ├── user/                     # User domain activities
    │   └── user.activities.js
    │
    ├── payment/                  # Payment domain activities
    │   └── payment.activities.js
    │
    ├── listing/                  # Listing domain activities
    │   └── listing.activities.js
    │
    └── analytics/                # Analytics domain activities
        └── analytics.activities.js
```

### File Naming Conventions

- **Workflows**: `{domain}.workflow.js` (e.g., `payment.workflow.js`)
- **Activities**: `{domain}.activities.js` (e.g., `user.activities.js`)
- **Configs**: `{purpose}.js` (e.g., `constants.js`)

---

## Workflows

### What are Workflows?

Workflows are the orchestration layer that defines business process logic. They:
- Coordinate activity execution
- Handle retries and error recovery
- Implement compensation logic (saga pattern)
- Manage state and timers
- Handle signals and queries

### Workflow Organization

Workflows are organized by business domain:

#### **User Workflows**
- `sendNotificationWorkflow`: Multi-channel notification delivery
- `userOnboardingWorkflow`: New user onboarding process

#### **Payment Workflows**
- `processPaymentWorkflow`: Payment processing with saga pattern
- `subscriptionPaymentWorkflow`: Recurring subscription payments

#### **Listing Workflows**
- `listingApprovalWorkflow`: Human-in-the-loop approval process
- `listingExpirationWorkflow`: Automated listing expiration

#### **Analytics Workflows**
- `dailyReportWorkflow`: Scheduled report generation
- `dataCleanupWorkflow`: Data retention and cleanup
- `reminderWorkflow`: Scheduled reminder notifications

### Workflow Structure

Each workflow follows a consistent structure:

```javascript
/**
 * Workflow documentation
 * @module temporal/workflows/domain/workflow-name
 */

const { proxyActivities } = require('@temporalio/workflow');
const { ACTIVITY_OPTIONS } = require('../../config/constants');

// Type imports for IDE support
/** @typedef {import('../../types').DataType} DataType */

// Proxy activities with appropriate options
const { activity1, activity2 } = proxyActivities(ACTIVITY_OPTIONS.domain);

/**
 * Workflow function
 * @param {DataType} data - Input data
 * @returns {Promise<ResultType>} - Workflow result
 */
async function myWorkflow(data) {
    try {
        // Orchestration logic
        const result = await activity1(data);
        return result;
    } catch (error) {
        // Error handling and compensation
        throw error;
    }
}

module.exports = { myWorkflow };
```

### Key Workflow Patterns

#### 1. **Saga Pattern** (Compensation Logic)
Used in payment processing to rollback on failure:

```javascript
let inventoryReserved = false;

try {
    await reserveInventory();
    inventoryReserved = true;
    
    await processPayment();
    
} catch (error) {
    if (inventoryReserved) {
        await releaseInventory(); // Compensation
    }
    throw error;
}
```

#### 2. **Human-in-the-Loop**
Used in listing approval with signals:

```javascript
const approveSignal = defineSignal('approve');
setHandler(approveSignal, (comment) => {
    approved = true;
    reviewComment = comment;
});

// Wait for signal with timeout
await condition(() => approved || rejected, '48h');
```

#### 3. **Scheduled Workflows**
Used for reminders and expiration:

```javascript
// Wait until scheduled time
const waitTime = scheduledTime - Date.now();
if (waitTime > 0) {
    await sleep(waitTime);
}

// Execute action
await sendReminder();
```

---

## Activities

### What are Activities?

Activities are the execution layer that performs actual work. They:
- Execute business logic
- Make external API calls
- Query/update databases
- Send emails and notifications
- Handle retries automatically

### Activity Organization

Activities are organized by business domain:

#### **User Activities**
- `sendEmail`: Email delivery via SMTP
- `processNotification`: Internal notification processing
- `updateUserStatus`: User status updates
- `sendWelcomePackage`: Welcome email and setup
- `sendNotification`: Push/in-app notifications

#### **Payment Activities**
- `validatePayment`: Payment data validation
- `processPaymentGateway`: Payment gateway integration
- `reserveInventory`: Inventory reservation
- `releaseInventory`: Inventory release (compensation)
- `updateOrderStatus`: Order status updates
- `triggerFulfillment`: Fulfillment initiation
- `getSubscriptionDetails`: Subscription data retrieval
- `updateSubscription`: Subscription updates

#### **Listing Activities**
- `validateListing`: Listing data validation
- `runAutomatedChecks`: Quality score calculation
- `updateListingStatus`: Status updates
- `notifyReviewers`: Reviewer notifications
- `approveListing`: Approval processing
- `rejectListing`: Rejection processing
- `publishToSearchIndex`: Search index management
- `removeFromSearchIndex`: Search index cleanup
- `getListingStatus`: Status retrieval
- `expireListing`: Expiration processing

#### **Analytics Activities**
- `gatherAnalytics`: Metrics collection
- `generateReport`: Report generation
- `storeReport`: Cloud storage
- `logReportGeneration`: Audit logging
- `identifyCleanupItems`: Cleanup identification
- `backupData`: Data backup
- `deleteItems`: Batch deletion
- `logCleanupOperation`: Cleanup logging
- `validateReminder`: Reminder validation
- `markReminderSent`: Reminder tracking

### Activity Structure

Each activity follows a consistent structure:

```javascript
/**
 * Activity documentation
 * @param {ParamType} params - Input parameters
 * @returns {Promise<ResultType>} - Activity result
 */
async function myActivity({ param1, param2 }) {
    try {
        logger.info(`[Activity Name] Starting...`);
        
        // Business logic
        const result = await performWork(param1, param2);
        
        logger.info(`[Activity Name] Completed successfully`);
        return { success: true, ...result };
        
    } catch (error) {
        logger.error(`[Activity Name] Failed:`, error);
        throw error; // or return { success: false, error: error.message }
    }
}
```

### Activity Best Practices

1. **Idempotency**: Activities can be retried, ensure operations are idempotent
2. **Logging**: Log entry, success, and failure for observability
3. **Error Handling**: Throw errors for retryable failures, return error objects for non-retryable
4. **Timeouts**: Configure appropriate timeouts in constants.js
5. **Validation**: Validate inputs before processing

---

## Configuration

### Constants (`config/constants.js`)

Centralized configuration for all temporal settings:

#### **Timeout Configurations**

```javascript
ACTIVITY_TIMEOUTS = {
    SHORT: '30 seconds',      // Fast operations
    MEDIUM: '1 minute',       // Standard operations
    LONG: '5 minutes',        // Report generation
    VERY_LONG: '15 minutes',  // Bulk processing
}
```

#### **Retry Policies**

```javascript
STANDARD_RETRY_POLICY = {
    initialInterval: '1s',
    maximumInterval: '30s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
}
```

#### **Domain-Specific Configurations**

```javascript
PAYMENT_CONFIG = {
    activityTimeout: ACTIVITY_TIMEOUTS.MEDIUM,
    retryPolicy: AGGRESSIVE_RETRY_POLICY,
    paymentGatewayTimeout: '2 minutes',
}
```

#### **Activity Options**

Pre-configured activity options by domain:

```javascript
ACTIVITY_OPTIONS = {
    payment: {
        startToCloseTimeout: ACTIVITY_TIMEOUTS.MEDIUM,
        retry: AGGRESSIVE_RETRY_POLICY,
    },
    // ... other domains
}
```

### Type Definitions (`types.js`)

JSDoc type definitions for better IDE support:

```javascript
/**
 * @typedef {Object} PaymentData
 * @property {string} orderId
 * @property {number} amount
 * @property {string} currency
 */
```

---

## Best Practices

### Workflow Best Practices

1. **Determinism**: Workflows must be deterministic
   - ❌ Don't use `Math.random()` or `Date.now()` directly
   - ✅ Use `Date.now()` only in workflow arguments
   - ✅ Use activities for non-deterministic operations

2. **Activities for Side Effects**: All external calls must be in activities
   - ❌ Don't query databases in workflows
   - ❌ Don't call external APIs in workflows
   - ✅ Use activities for all side effects

3. **Error Handling**: Implement proper error handling
   - ✅ Use try-catch blocks
   - ✅ Implement compensation logic for failures
   - ✅ Log errors with context

4. **Unique IDs**: Use unique workflow IDs
   ```javascript
   `${workflowName}-${userId}-${Date.now()}`
   ```

### Activity Best Practices

1. **Idempotency**: Make activities idempotent
   - ✅ Check if operation already completed
   - ✅ Use database transactions
   - ✅ Handle duplicate operations gracefully

2. **Timeout Configuration**: Set appropriate timeouts
   - ✅ Short timeouts for fast operations
   - ✅ Longer timeouts for external API calls
   - ✅ Very long timeouts for batch processing

3. **Logging**: Comprehensive logging
   ```javascript
   logger.info(`[Activity] Starting...`);
   logger.info(`[Activity] Completed`);
   logger.error(`[Activity] Failed:`, error);
   ```

4. **Return Values**: Return structured results
   ```javascript
   return { success: true, data: result };
   // or
   return { success: false, error: error.message };
   ```

### Testing Best Practices

1. **Unit Test Activities**: Test activities independently
2. **Mock External Dependencies**: Use mocks for databases and APIs
3. **Test Workflows**: Use Temporal's testing framework
4. **Integration Tests**: Test complete workflows end-to-end

---

## Development Guide

### Adding a New Workflow

1. **Create workflow file** in appropriate domain directory
2. **Define types** in `types.js` if needed
3. **Import activities** with proper options from constants
4. **Implement workflow logic** following patterns
5. **Export workflow** from domain file
6. **Register workflow** in `workflows/index.js`
7. **Add tests** for workflow logic

Example:

```javascript
// 1. Create file: workflows/user/profile.workflow.js
const { proxyActivities } = require('@temporalio/workflow');
const { ACTIVITY_OPTIONS } = require('../../config/constants');

const { updateProfile, sendEmail } = proxyActivities(ACTIVITY_OPTIONS.user);

async function updateProfileWorkflow(data) {
    await updateProfile(data);
    await sendEmail({ to: data.email, ... });
    return { success: true };
}

module.exports = { updateProfileWorkflow };

// 2. Register in workflows/index.js
const { updateProfileWorkflow } = require('./user/profile.workflow');
module.exports = {
    // ... existing workflows
    updateProfileWorkflow,
};
```

### Adding a New Activity

1. **Create activity function** in appropriate domain file
2. **Add JSDoc documentation** with types
3. **Implement business logic** with error handling
4. **Add logging** for observability
5. **Export activity** from domain file
6. **Verify registration** in `activities/registry.js` (automatic via spread operator)
7. **Add tests** for activity logic

Example:

```javascript
// 1. Add to activities/user/user.activities.js
/**
 * Update Profile Activity
 * @param {{userId: string, data: Object}} params
 * @returns {Promise<{success: boolean}>}
 */
async function updateProfile({ userId, data }) {
    try {
        logger.info(`[Update Profile] Updating user ${userId}`);
        
        // Business logic here
        await db.User.update(data, { where: { id: userId } });
        
        logger.info(`[Update Profile] Updated successfully`);
        return { success: true };
    } catch (error) {
        logger.error(`[Update Profile] Failed:`, error);
        throw error;
    }
}

module.exports = {
    // ... existing activities
    updateProfile,
};
```

### Running the Worker

```bash
# Development
npm run worker:dev

# Production
npm run worker

# With PM2
pm2 start src/temporal/worker.js --name temporal-worker
```

### Monitoring Workflows

1. **Temporal Web UI**: http://localhost:8233 (local dev)
2. **Logs**: Check winston logs for activity execution
3. **Workflow Status**: Query via API or Temporal client

### Debugging

1. **Check Worker Logs**: View worker console output
2. **Temporal Web UI**: View workflow execution history
3. **Activity Logs**: Check winston logs for activity details
4. **Workflow Signals**: Use signals to inspect workflow state

---

## Additional Resources

- [Temporal Documentation](https://docs.temporal.io/)
- [Node.js SDK Guide](https://docs.temporal.io/dev-guide/node)
- [Best Practices](https://docs.temporal.io/dev-guide/best-practices)
- [Workflow Patterns](https://docs.temporal.io/dev-guide/workflow-patterns)

---

## Changelog

### Version 2.0.0 - Enterprise Architecture Refactor
- ✨ Organized workflows by business domain
- ✨ Separated activities into domain-specific modules
- ✨ Added comprehensive type definitions
- ✨ Centralized configuration and constants
- ✨ Improved logging and error handling
- ✨ Added comprehensive documentation
- ✨ Implemented consistent naming conventions
- ✨ Enhanced worker with graceful shutdown
