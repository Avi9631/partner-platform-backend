# Workflows and Activities Reference

This document provides a comprehensive overview of all available workflows and activities in the Partner Platform.

## Table of Contents

1. [Basic Workflows](#basic-workflows)
2. [Payment Workflows](#payment-workflows)
3. [Listing Workflows](#listing-workflows)
4. [Scheduled Workflows](#scheduled-workflows)
5. [Activities Overview](#activities-overview)

---

## Basic Workflows

### 1. Send Notification Workflow

**Purpose**: Send notifications to users via email and internal notification system.

**Workflow Name**: `sendNotificationWorkflow`

**Input Parameters**:
```javascript
{
  userId: string,      // User ID or email
  message: string,     // Notification message
  type: string         // Notification type (e.g., 'info', 'warning', 'success')
}
```

**Usage Example**:
```javascript
const { startWorkflow } = require('./utils/temporalClient');

await startWorkflow('sendNotificationWorkflow', {
  userId: 'user@example.com',
  message: 'Your listing has been approved!',
  type: 'success'
});
```

**Steps**:
1. Send email notification
2. Process internal notification
3. Return success status

---

### 2. User Onboarding Workflow

**Purpose**: Handle new user onboarding process.

**Workflow Name**: `userOnboardingWorkflow`

**Input Parameters**:
```javascript
{
  userId: string,
  email: string,
  name: string
}
```

**Usage Example**:
```javascript
await executeWorkflow('userOnboardingWorkflow', {
  userId: 'user123',
  email: 'newuser@example.com',
  name: 'John Doe'
});
```

**Steps**:
1. Send welcome email
2. Process user setup notification
3. Return completion status

---

## Payment Workflows

### 1. Process Payment Workflow

**Purpose**: Handle complete payment processing with inventory reservation and compensation logic.

**Workflow Name**: `processPaymentWorkflow`

**Input Parameters**:
```javascript
{
  orderId: string,
  userId: string,
  amount: number,
  currency: string,      // 'USD', 'EUR', 'INR'
  paymentMethod: string  // 'card', 'upi', 'wallet'
}
```

**Usage Example**:
```javascript
await startWorkflow('processPaymentWorkflow', {
  orderId: 'ORD123456',
  userId: 'user@example.com',
  amount: 999.99,
  currency: 'USD',
  paymentMethod: 'card'
});
```

**Steps**:
1. Validate payment details
2. Reserve inventory
3. Process payment with gateway
4. Update order status
5. Send confirmation email
6. Trigger fulfillment

**Error Handling**: Automatically releases inventory if payment fails.

---

### 2. Subscription Payment Workflow

**Purpose**: Process recurring subscription payments with retry logic.

**Workflow Name**: `subscriptionPaymentWorkflow`

**Input Parameters**:
```javascript
{
  subscriptionId: string,
  userId: string,
  amount: number,
  currency: string,
  billingPeriod: string  // 'monthly', 'yearly', 'weekly'
}
```

**Usage Example**:
```javascript
await startWorkflow('subscriptionPaymentWorkflow', {
  subscriptionId: 'SUB789',
  userId: 'user@example.com',
  amount: 29.99,
  currency: 'USD',
  billingPeriod: 'monthly'
});
```

**Steps**:
1. Check subscription status
2. Process payment
3. Update subscription details
4. Send receipt email
5. Handle payment failures with retry logic

**Features**:
- Automatic retry on payment failure
- Subscription suspension after 3 failed attempts
- Next payment date calculation

---

## Listing Workflows

### 1. Listing Approval Workflow

**Purpose**: Handle property listing approval with human-in-the-loop review process.

**Workflow Name**: `listingApprovalWorkflow`

**Input Parameters**:
```javascript
{
  listingId: string,
  userId: string,
  propertyData: {
    title: string,
    description: string,
    price: number,
    location: {
      address: string,
      city: string,
      state: string
    },
    images: string[]
  }
}
```

**Usage Example**:
```javascript
await startWorkflow('listingApprovalWorkflow', {
  listingId: 'LST001',
  userId: 'agent@example.com',
  propertyData: {
    title: 'Beautiful 3BR Apartment',
    description: 'Spacious apartment with modern amenities...',
    price: 350000,
    location: {
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA'
    },
    images: ['img1.jpg', 'img2.jpg', 'img3.jpg']
  }
});
```

**Steps**:
1. Validate listing data (required fields, minimum lengths)
2. Run automated checks (image quality, suspicious content)
3. Update status to pending review
4. Notify human reviewers
5. Wait for manual approval/rejection (48-hour timeout)
6. Process approval or rejection
7. Publish to search index (if approved)
8. Send notification email

**Signals**:
- `approve`: Manually approve the listing
- `reject`: Manually reject the listing

**Usage with Signals**:
```javascript
// Start the workflow
const { handle } = await startWorkflow('listingApprovalWorkflow', listingData);

// Approve the listing
await handle.signal('approve', 'Looks great! Approved.');

// Or reject it
await handle.signal('reject', 'Missing required documentation.');
```

**Auto-approval**: Listings with high quality scores (>0.8) are auto-approved if not manually reviewed within 48 hours.

---

### 2. Listing Expiration Workflow

**Purpose**: Handle automatic listing expiration and send renewal reminders.

**Workflow Name**: `listingExpirationWorkflow`

**Input Parameters**:
```javascript
{
  listingId: string,
  userId: string,
  expirationDate: string  // ISO date string
}
```

**Usage Example**:
```javascript
await startWorkflow('listingExpirationWorkflow', {
  listingId: 'LST001',
  userId: 'agent@example.com',
  expirationDate: '2025-12-31T23:59:59Z'
});
```

**Steps**:
1. Send reminder 7 days before expiration
2. Send reminder 1 day before expiration
3. Wait until expiration date
4. Check if listing was renewed
5. Expire listing if not renewed
6. Remove from search index
7. Send expiration notification

---

## Scheduled Workflows

### 1. Daily Report Workflow

**Purpose**: Generate and distribute daily analytics reports.

**Workflow Name**: `dailyReportWorkflow`

**Input Parameters**:
```javascript
{
  reportType: string,        // 'sales', 'analytics', 'performance'
  recipients: string[],      // Email addresses
  scheduleTime: string       // ISO time string
}
```

**Usage Example**:
```javascript
await startWorkflow('dailyReportWorkflow', {
  reportType: 'sales',
  recipients: ['admin@example.com', 'manager@example.com'],
  scheduleTime: '2025-11-09T08:00:00Z'
});
```

**Steps**:
1. Gather analytics data
2. Generate report (PDF format)
3. Store report in cloud storage
4. Send report to all recipients
5. Log report generation

---

### 2. Data Cleanup Workflow

**Purpose**: Perform scheduled database cleanup with backup.

**Workflow Name**: `dataCleanupWorkflow`

**Input Parameters**:
```javascript
{
  cleanupType: string,     // 'logs', 'sessions', 'temp_files'
  retentionDays: number    // Days to retain data
}
```

**Usage Example**:
```javascript
await startWorkflow('dataCleanupWorkflow', {
  cleanupType: 'logs',
  retentionDays: 90
});
```

**Steps**:
1. Identify items older than retention period
2. Backup data before deletion
3. Delete items in batches (100 items per batch)
4. Log cleanup operation
5. Send summary email to admins

---

### 3. Reminder Workflow

**Purpose**: Send scheduled reminders to users.

**Workflow Name**: `reminderWorkflow`

**Input Parameters**:
```javascript
{
  userId: string,
  reminderType: string,      // Type of reminder
  message: string,
  scheduledTime: string,     // ISO time string
  metadata: object          // Additional reminder data
}
```

**Usage Example**:
```javascript
await startWorkflow('reminderWorkflow', {
  userId: 'user@example.com',
  reminderType: 'payment_due',
  message: 'Your subscription payment is due in 3 days',
  scheduledTime: '2025-11-12T10:00:00Z',
  metadata: {
    subscriptionId: 'SUB123',
    amount: 29.99
  }
});
```

**Steps**:
1. Wait until scheduled time
2. Validate reminder is still relevant
3. Send notification
4. Send email
5. Mark reminder as sent

---

## Activities Overview

### Basic Activities

| Activity | Purpose | Input | Output |
|----------|---------|-------|--------|
| `sendEmail` | Send email via SMTP | `{to, subject, body, attachments?}` | `{success, to, subject}` |
| `processNotification` | Process internal notifications | `{userId, type, status}` | `{success, userId, type}` |
| `updateUserStatus` | Update user status | `{userId, status}` | `{success, userId, status}` |
| `sendWelcomePackage` | Send welcome materials | `{userId, email, name}` | `{success, userId, email}` |

---

### Payment Activities

| Activity | Purpose | Input | Output |
|----------|---------|-------|--------|
| `validatePayment` | Validate payment details | `{userId, amount, currency, paymentMethod}` | `{valid, reason?}` |
| `processPaymentGateway` | Process payment | `{orderId, amount, currency, paymentMethod, userId}` | `{success, transactionId?, error?}` |
| `reserveInventory` | Reserve items | `{orderId, userId}` | `{success, orderId}` |
| `releaseInventory` | Release reserved items | `{orderId}` | `{success, orderId}` |
| `updateOrderStatus` | Update order status | `{orderId, status, transactionId?, errorMessage?}` | `{success, orderId, status}` |
| `triggerFulfillment` | Start fulfillment | `{orderId}` | `{success, orderId}` |
| `getSubscriptionDetails` | Get subscription info | `{subscriptionId}` | `{subscriptionId, active, paymentMethod, failedPaymentCount}` |
| `updateSubscription` | Update subscription | `{subscriptionId, lastPaymentDate?, nextPaymentDate?, status?, failedPaymentCount?}` | `{success, subscriptionId}` |

---

### Listing Activities

| Activity | Purpose | Input | Output |
|----------|---------|-------|--------|
| `validateListing` | Validate listing data | `{listingId, propertyData}` | `{valid, errors[]}` |
| `runAutomatedChecks` | Run quality checks | `{listingId, propertyData}` | `{score, issues[], passed}` |
| `updateListingStatus` | Update listing status | `{listingId, status, ...}` | `{success, listingId, status}` |
| `notifyReviewers` | Notify review team | `{listingId, userId, propertyData, autoCheckScore}` | `{success}` |
| `approveListing` | Approve listing | `{listingId, reviewComment}` | `{success, listingId}` |
| `rejectListing` | Reject listing | `{listingId, reviewComment}` | `{success, listingId}` |
| `publishToSearchIndex` | Add to search | `{listingId, propertyData}` | `{success, listingId}` |
| `removeFromSearchIndex` | Remove from search | `{listingId}` | `{success, listingId}` |
| `getListingStatus` | Get listing status | `{listingId}` | `{listingId, status, renewed}` |
| `expireListing` | Expire listing | `{listingId}` | `{success, listingId}` |

---

### Analytics Activities

| Activity | Purpose | Input | Output |
|----------|---------|-------|--------|
| `gatherAnalytics` | Collect metrics | `{reportType, period}` | Analytics data object |
| `generateReport` | Create report | `{reportType, data, format}` | Report object |
| `storeReport` | Save report | `{report, fileName}` | Report URL |
| `logReportGeneration` | Log report | `{reportType, recipientCount, reportUrl, generatedAt}` | `{success}` |
| `identifyCleanupItems` | Find old data | `{cleanupType, retentionDays}` | Array of items |
| `backupData` | Backup before delete | `{cleanupType, items}` | Backup URL |
| `deleteItems` | Delete data | `{cleanupType, items}` | `{deletedCount, success}` |
| `logCleanupOperation` | Log cleanup | `{cleanupType, itemsDeleted, backupUrl, completedAt}` | `{success}` |
| `sendNotification` | Send push notification | `{userId, type, message, metadata}` | `{success, userId, type}` |
| `validateReminder` | Check reminder validity | `{userId, reminderType, metadata}` | Boolean |
| `markReminderSent` | Mark as sent | `{userId, reminderType, sentAt}` | `{success}` |

---

## Best Practices

### 1. Workflow Design

- **Keep workflows deterministic**: Don't use `Math.random()` or `Date.now()` directly
- **Use activities for side effects**: All external calls should be in activities
- **Handle errors gracefully**: Implement compensation logic for failed steps
- **Use meaningful IDs**: Create unique workflow IDs to prevent duplicates

### 2. Activity Implementation

- **Make activities idempotent**: Activities may be retried
- **Set appropriate timeouts**: Configure `startToCloseTimeout` based on expected duration
- **Log important events**: Use logger for debugging and monitoring
- **Return meaningful results**: Include success status and relevant data

### 3. Error Handling

- **Use try-catch blocks**: Handle errors in both workflows and activities
- **Implement retry policies**: Configure retries for transient failures
- **Send failure notifications**: Alert admins when critical workflows fail
- **Implement compensation**: Undo partial changes on failure

### 4. Testing

- **Test activities independently**: Unit test each activity function
- **Test workflows with mocks**: Use Temporal's testing framework
- **Monitor workflow executions**: Use Temporal Web UI for debugging
- **Set up alerts**: Monitor failed workflows in production

---

## Quick Reference: Starting Workflows

### Start and Forget
```javascript
const { startWorkflow } = require('./utils/temporalClient');

const { workflowId } = await startWorkflow('workflowName', args);
console.log('Started:', workflowId);
```

### Execute and Wait for Result
```javascript
const { executeWorkflow } = require('./utils/temporalClient');

const result = await executeWorkflow('workflowName', args);
console.log('Result:', result);
```

### With Custom Workflow ID
```javascript
await startWorkflow('workflowName', args, 'custom-id-123');
```

### Query Workflow Status
```javascript
const { getWorkflowHandle } = require('./utils/temporalClient');

const handle = await getWorkflowHandle('workflow-id');
const description = await handle.describe();
console.log('Status:', description.status);
```

### Send Signal to Workflow
```javascript
const handle = await getWorkflowHandle('workflow-id');
await handle.signal('signalName', 'data');
```

### Cancel Workflow
```javascript
const { cancelWorkflow } = require('./utils/temporalClient');

await cancelWorkflow('workflow-id');
```

---

## API Endpoints

All workflows can be triggered via REST API:

```
POST /api/temporal/notification/start
POST /api/temporal/onboarding/execute
GET  /api/temporal/workflow/:workflowId/status
POST /api/temporal/workflow/:workflowId/cancel
```

See `src/routes/temporal.route.js` for complete API documentation.
