/**
 * Workflows Index
 * 
 * Central registry for all workflow definitions.
 * Import and export all workflows from their respective domain modules.
 * 
 * @module temporal/workflows
 */

// User workflows
const { sendNotificationWorkflow } = require('./user/notification.workflow');
const { userOnboardingWorkflow } = require('./user/onboarding.workflow');

// Payment workflows
const { processPaymentWorkflow } = require('./payment/payment.workflow');
const { subscriptionPaymentWorkflow } = require('./payment/subscription.workflow');

// Listing workflows
const { listingApprovalWorkflow } = require('./listing/approval.workflow');
const { listingExpirationWorkflow } = require('./listing/expiration.workflow');

// Analytics workflows
const {
    dailyReportWorkflow,
    dataCleanupWorkflow,
    reminderWorkflow,
} = require('./analytics/scheduled.workflow');

/**
 * Export all workflows
 * 
 * These workflows are automatically discovered by the Temporal worker
 * when it loads the workflows path.
 */
module.exports = {
    // User workflows
    sendNotificationWorkflow,
    userOnboardingWorkflow,
    
    // Payment workflows
    processPaymentWorkflow,
    subscriptionPaymentWorkflow,
    
    // Listing workflows
    listingApprovalWorkflow,
    listingExpirationWorkflow,
    
    // Analytics & scheduled workflows
    dailyReportWorkflow,
    dataCleanupWorkflow,
    reminderWorkflow,
};
