# File Structure Reference

## 📁 Complete File Listing

This document provides a complete reference of all files in the Temporal implementation.

---

## Configuration Files

### `config/constants.js`
**Purpose**: Centralized configuration for timeouts, retry policies, and workflow settings

**Exports**:
- `ACTIVITY_TIMEOUTS` - Timeout configurations (SHORT, MEDIUM, LONG, VERY_LONG)
- `WORKFLOW_TIMEOUTS` - Workflow timeout configurations
- `STANDARD_RETRY_POLICY` - Standard retry policy
- `AGGRESSIVE_RETRY_POLICY` - Aggressive retry for critical operations
- `MINIMAL_RETRY_POLICY` - Fast-fail retry policy
- `EXTENDED_RETRY_POLICY` - Extended retry for long operations
- `PAYMENT_CONFIG` - Payment workflow configuration
- `LISTING_CONFIG` - Listing workflow configuration
- `NOTIFICATION_CONFIG` - Notification workflow configuration
- `REPORT_CONFIG` - Report workflow configuration
- `CLEANUP_CONFIG` - Cleanup workflow configuration
- `TASK_QUEUES` - Task queue names
- `SIGNALS` - Signal name constants
- `QUERIES` - Query name constants
- `WORKFLOW_STATUS` - Workflow status constants
- `LISTING_STATUS` - Listing status constants
- `ORDER_STATUS` - Order status constants
- `SUBSCRIPTION_STATUS` - Subscription status constants
- `ERROR_CODES` - Error code constants
- `ACTIVITY_OPTIONS` - Pre-configured activity options by domain

---

## Type Definitions

### `types.js`
**Purpose**: JSDoc type definitions for workflows and activities

**Type Categories**:
- Common Types (WorkflowResult, ActivityResult)
- User Types (UserData, NotificationData, EmailData)
- Payment Types (PaymentData, PaymentValidation, PaymentResult, SubscriptionData)
- Listing Types (LocationData, PropertyData, ListingData, ListingValidationResult)
- Analytics Types (ReportConfig, AnalyticsData, CleanupConfig)
- Order Types (OrderStatus)
- Workflow Result Types (specific result types for each workflow)

---

## Worker

### `worker.js`
**Purpose**: Temporal worker process entry point

**Features**:
- Connection to Temporal Server
- Workflow and activity registration
- Graceful shutdown handling (SIGINT, SIGTERM)
- Enhanced logging and error messages
- Production-ready configuration

**Functions**:
- `startWorker()` - Initialize and start the worker

---

## Workflows

### User Domain

#### `workflows/user/notification.workflow.js`
**Workflow**: `sendNotificationWorkflow`

**Purpose**: Send notifications via multiple channels

**Steps**:
1. Send email notification
2. Process internal notification
3. Return success status

**Activities Used**:
- `sendEmail`
- `processNotification`

---

#### `workflows/user/onboarding.workflow.js`
**Workflow**: `userOnboardingWorkflow`

**Purpose**: Handle new user onboarding process

**Steps**:
1. Update user status to onboarding
2. Send welcome package
3. Send onboarding notification
4. Update user status to active
5. Send completion email

**Activities Used**:
- `updateUserStatus`
- `sendWelcomePackage`
- `processNotification`
- `sendEmail`

---

### Payment Domain

#### `workflows/payment/payment.workflow.js`
**Workflow**: `processPaymentWorkflow`

**Purpose**: Process payments with saga pattern

**Steps**:
1. Validate payment
2. Reserve inventory
3. Process payment gateway
4. Update order status
5. Send confirmation email
6. Trigger fulfillment

**Compensation**: Release inventory on payment failure

**Activities Used**:
- `validatePayment`
- `reserveInventory`
- `releaseInventory`
- `processPaymentGateway`
- `updateOrderStatus`
- `sendEmail`
- `triggerFulfillment`

---

#### `workflows/payment/subscription.workflow.js`
**Workflow**: `subscriptionPaymentWorkflow`

**Purpose**: Handle recurring subscription payments

**Steps**:
1. Get subscription details
2. Process payment
3. Update subscription (success or failure)
4. Send receipt or failure notification

**Retry Logic**: Max 3 failed attempts before suspension

**Activities Used**:
- `getSubscriptionDetails`
- `processPaymentGateway`
- `updateSubscription`
- `sendEmail`

---

### Listing Domain

#### `workflows/listing/approval.workflow.js`
**Workflow**: `listingApprovalWorkflow`

**Purpose**: Human-in-the-loop listing approval

**Steps**:
1. Validate listing data
2. Run automated quality checks
3. Update status to pending review
4. Notify reviewers
5. Wait for approval/rejection signal (48h timeout)
6. Process approval or rejection
7. Publish to search index (if approved)

**Signals**:
- `approve` - Approve the listing
- `reject` - Reject the listing

**Auto-approval**: If quality score >= 0.8 and timeout reached

**Activities Used**:
- `validateListing`
- `runAutomatedChecks`
- `updateListingStatus`
- `notifyReviewers`
- `approveListing`
- `rejectListing`
- `publishToSearchIndex`
- `sendEmail`

---

#### `workflows/listing/expiration.workflow.js`
**Workflow**: `listingExpirationWorkflow`

**Purpose**: Automated listing expiration with reminders

**Steps**:
1. Send reminder 7 days before expiration
2. Send reminder 1 day before expiration
3. Wait until expiration date
4. Check if renewed
5. Expire listing (if not renewed)
6. Remove from search index
7. Send expiration notification

**Activities Used**:
- `getListingStatus`
- `expireListing`
- `updateListingStatus`
- `removeFromSearchIndex`
- `sendEmail`

---

### Analytics Domain

#### `workflows/analytics/scheduled.workflow.js`
**Workflows**: `dailyReportWorkflow`, `dataCleanupWorkflow`, `reminderWorkflow`

##### Daily Report Workflow
**Purpose**: Generate and distribute analytics reports

**Steps**:
1. Gather analytics data
2. Generate report
3. Store report in cloud
4. Send to recipients
5. Log generation

**Activities Used**:
- `gatherAnalytics`
- `generateReport`
- `storeReport`
- `sendEmail`
- `logReportGeneration`

##### Data Cleanup Workflow
**Purpose**: Scheduled data cleanup with backup

**Steps**:
1. Identify cleanup items
2. Backup data
3. Delete items in batches
4. Log cleanup
5. Send summary email

**Activities Used**:
- `identifyCleanupItems`
- `backupData`
- `deleteItems`
- `logCleanupOperation`
- `sendEmail`

##### Reminder Workflow
**Purpose**: Send scheduled reminders

**Steps**:
1. Wait until scheduled time
2. Validate reminder
3. Send notification
4. Send email
5. Mark as sent

**Activities Used**:
- `validateReminder`
- `sendNotification`
- `sendEmail`
- `markReminderSent`

---

### Workflow Index

#### `workflows/index.js`
**Purpose**: Central workflow registry

**Exports**: All workflow functions for worker registration

---

## Activities

### User Domain

#### `activities/user/user.activities.js`
**Activities**:
- `sendEmail(emailData)` - Send email via SMTP
- `processNotification(data)` - Process internal notifications
- `updateUserStatus(data)` - Update user status in database
- `sendWelcomePackage(data)` - Send welcome materials
- `sendNotification(data)` - Send push/in-app notifications

---

### Payment Domain

#### `activities/payment/payment.activities.js`
**Activities**:
- `validatePayment(data)` - Validate payment details
- `processPaymentGateway(data)` - Process payment via gateway
- `reserveInventory(data)` - Reserve inventory items
- `releaseInventory(data)` - Release reserved inventory
- `updateOrderStatus(data)` - Update order status
- `triggerFulfillment(data)` - Initiate fulfillment
- `getSubscriptionDetails(data)` - Get subscription info
- `updateSubscription(data)` - Update subscription

---

### Listing Domain

#### `activities/listing/listing.activities.js`
**Activities**:
- `validateListing(data)` - Validate listing data
- `runAutomatedChecks(data)` - Run quality checks
- `updateListingStatus(data)` - Update listing status
- `notifyReviewers(data)` - Notify review team
- `approveListing(data)` - Process approval
- `rejectListing(data)` - Process rejection
- `publishToSearchIndex(data)` - Add to search index
- `removeFromSearchIndex(data)` - Remove from search
- `getListingStatus(data)` - Get listing status
- `expireListing(data)` - Process expiration

---

### Analytics Domain

#### `activities/analytics/analytics.activities.js`
**Activities**:
- `gatherAnalytics(data)` - Collect metrics
- `generateReport(data)` - Generate report
- `storeReport(data)` - Store in cloud
- `logReportGeneration(data)` - Log generation
- `identifyCleanupItems(data)` - Find old items
- `backupData(data)` - Backup before deletion
- `deleteItems(data)` - Delete items
- `logCleanupOperation(data)` - Log cleanup
- `validateReminder(data)` - Validate reminder
- `markReminderSent(data)` - Mark reminder sent

---

### Activity Registry

#### `activities/registry.js`
**Purpose**: Central activity registry for worker registration

**Exports**: All activity functions as flat object

#### `activities/index.js` (Legacy)
**Purpose**: Backward compatibility with existing code

---

## Documentation

### `README.md`
**Content**:
- Quick introduction
- Link to architecture documentation
- Prerequisites
- Project structure
- Configuration guide
- Running instructions
- API endpoints
- Monitoring guide
- Production deployment
- Resources

### `ARCHITECTURE.md`
**Content**:
- Architecture overview with diagrams
- Directory structure explanation
- Workflows documentation
- Activities documentation
- Configuration guide
- Best practices
- Development guide
- Testing guide

### `QUICKSTART.md`
**Content**:
- 5-minute setup guide
- All available workflows with examples
- Common operations
- Monitoring and debugging
- Troubleshooting
- Quick commands reference

### `WORKFLOWS_REFERENCE.md` (Existing)
**Content**:
- Comprehensive workflow and activity reference
- Input/output specifications
- Usage examples
- Best practices

### `IMPLEMENTATION_SUMMARY.md`
**Content**:
- Complete refactoring summary
- Before/after comparison
- Metrics and improvements
- Key features implemented
- Benefits summary

### `VISUALIZATION.md`
**Content**:
- System architecture diagrams
- Domain organization charts
- Workflow execution flows
- Configuration hierarchy
- Signal/query flows
- Monitoring architecture
- Scalability models

### `FILE_STRUCTURE.md` (This file)
**Content**:
- Complete file listing
- File purposes and exports
- Activity and workflow details

---

## Quick Reference

### File Count
- **Configuration**: 2 files
- **Worker**: 1 file
- **Workflows**: 8 files (6 workflow files + 2 index files)
- **Activities**: 6 files (4 activity files + 2 index files)
- **Documentation**: 7 files
- **Total**: 24 files

### Lines of Code
- **Production Code**: ~3,000 lines
- **Documentation**: ~2,500 lines
- **Total**: ~5,500 lines

### Workflows Implemented
1. sendNotificationWorkflow
2. userOnboardingWorkflow
3. processPaymentWorkflow
4. subscriptionPaymentWorkflow
5. listingApprovalWorkflow
6. listingExpirationWorkflow
7. dailyReportWorkflow
8. dataCleanupWorkflow
9. reminderWorkflow

### Activities Implemented
30+ activities across 4 domains

---

## Navigation Tips

### To understand the architecture:
1. Start with `README.md`
2. Read `QUICKSTART.md` for setup
3. Review `ARCHITECTURE.md` for deep dive
4. Check `VISUALIZATION.md` for diagrams

### To add a new workflow:
1. Check `types.js` for type definitions
2. Review `config/constants.js` for configuration options
3. Look at existing workflows in similar domain
4. Follow patterns in `ARCHITECTURE.md`

### To add a new activity:
1. Choose appropriate domain directory
2. Add function to domain activities file
3. Export from domain file
4. Verify automatic registration in `registry.js`

### To debug an issue:
1. Check Temporal Web UI (localhost:8233)
2. Review winston logs
3. Check worker console output
4. Refer to troubleshooting in `QUICKSTART.md`

---

**Last Updated**: 2025-11-08
**Version**: 2.0.0 - Enterprise Architecture
