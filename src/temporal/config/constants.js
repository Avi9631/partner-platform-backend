/**
 * Temporal Constants
 * 
 * Centralized configuration for timeouts, retry policies, and workflow settings.
 * 
 * @module temporal/config/constants
 */

// ==================== Timeout Configurations ====================

/**
 * Activity timeout configurations
 * Used to control how long activities can run before timing out
 */
const ACTIVITY_TIMEOUTS = {
    // Fast operations (email, notifications, simple DB queries)
    SHORT: '30 seconds',
    
    // Medium operations (API calls, complex DB operations)
    MEDIUM: '1 minute',
    
    // Long operations (report generation, data processing)
    LONG: '5 minutes',
    
    // Very long operations (bulk processing, large file operations)
    VERY_LONG: '15 minutes',
};

/**
 * Workflow timeout configurations
 */
const WORKFLOW_TIMEOUTS = {
    // Quick workflows (notifications, simple operations)
    SHORT: '5 minutes',
    
    // Standard workflows (payments, user operations)
    MEDIUM: '30 minutes',
    
    // Long-running workflows (approvals with human-in-the-loop)
    LONG: '48 hours',
    
    // Very long workflows (scheduled tasks, expiration tracking)
    VERY_LONG: '30 days',
};

// ==================== Retry Policies ====================

/**
 * Standard retry policy for transient failures
 */
const STANDARD_RETRY_POLICY = {
    initialInterval: '1s',
    maximumInterval: '30s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
};

/**
 * Aggressive retry policy for critical operations
 */
const AGGRESSIVE_RETRY_POLICY = {
    initialInterval: '500ms',
    maximumInterval: '10s',
    backoffCoefficient: 2,
    maximumAttempts: 5,
};

/**
 * Minimal retry policy for operations that should fail fast
 */
const MINIMAL_RETRY_POLICY = {
    initialInterval: '1s',
    maximumInterval: '5s',
    backoffCoefficient: 1.5,
    maximumAttempts: 2,
};

/**
 * Extended retry policy for long-running operations
 */
const EXTENDED_RETRY_POLICY = {
    initialInterval: '2s',
    maximumInterval: '2 minutes',
    backoffCoefficient: 2,
    maximumAttempts: 10,
};

// ==================== Workflow-Specific Configurations ====================

/**
 * Payment workflow configuration
 */
const PAYMENT_CONFIG = {
    activityTimeout: ACTIVITY_TIMEOUTS.MEDIUM,
    workflowTimeout: WORKFLOW_TIMEOUTS.MEDIUM,
    retryPolicy: AGGRESSIVE_RETRY_POLICY,
    maxInventoryReservationTime: '10 minutes',
    paymentGatewayTimeout: '2 minutes',
};

/**
 * Listing workflow configuration
 */
const LISTING_CONFIG = {
    activityTimeout: ACTIVITY_TIMEOUTS.MEDIUM,
    workflowTimeout: WORKFLOW_TIMEOUTS.LONG,
    retryPolicy: STANDARD_RETRY_POLICY,
    manualReviewTimeout: '48 hours',
    autoApprovalThreshold: 0.8,
    expirationReminderDays: [7, 1], // Send reminders at these intervals
};

/**
 * Notification workflow configuration
 */
const NOTIFICATION_CONFIG = {
    activityTimeout: ACTIVITY_TIMEOUTS.SHORT,
    workflowTimeout: WORKFLOW_TIMEOUTS.SHORT,
    retryPolicy: STANDARD_RETRY_POLICY,
    emailRetryAttempts: 3,
};

/**
 * Report workflow configuration
 */
const REPORT_CONFIG = {
    activityTimeout: ACTIVITY_TIMEOUTS.LONG,
    workflowTimeout: WORKFLOW_TIMEOUTS.MEDIUM,
    retryPolicy: STANDARD_RETRY_POLICY,
    maxReportSize: 50 * 1024 * 1024, // 50MB
    supportedFormats: ['pdf', 'excel', 'csv'],
};

/**
 * Cleanup workflow configuration
 */
const CLEANUP_CONFIG = {
    activityTimeout: ACTIVITY_TIMEOUTS.VERY_LONG,
    workflowTimeout: WORKFLOW_TIMEOUTS.LONG,
    retryPolicy: EXTENDED_RETRY_POLICY,
    batchSize: 100,
    batchDelay: '1s',
    defaultRetentionDays: 90,
};

// ==================== Queue Names ====================

const TASK_QUEUES = {
    DEFAULT: process.env.TEMPORAL_TASK_QUEUE || 'partner-platform-queue',
    HIGH_PRIORITY: 'partner-platform-priority-queue',
    BACKGROUND: 'partner-platform-background-queue',
    SCHEDULED: 'partner-platform-scheduled-queue',
};

// ==================== Signal and Query Names ====================

const SIGNALS = {
    // Listing signals
    APPROVE_LISTING: 'approve',
    REJECT_LISTING: 'reject',
    
    // Payment signals
    CANCEL_PAYMENT: 'cancelPayment',
    RETRY_PAYMENT: 'retryPayment',
    
    // General signals
    PAUSE: 'pause',
    RESUME: 'resume',
    UPDATE_CONFIG: 'updateConfig',
};

const QUERIES = {
    GET_STATUS: 'getStatus',
    GET_PROGRESS: 'getProgress',
    GET_DETAILS: 'getDetails',
};

// ==================== Workflow Status Constants ====================

const WORKFLOW_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    TIMED_OUT: 'timed_out',
};

const LISTING_STATUS = {
    DRAFT: 'draft',
    PENDING_REVIEW: 'pending_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    EXPIRED: 'expired',
    VALIDATION_FAILED: 'validation_failed',
    ERROR: 'error',
};

const ORDER_STATUS = {
    PENDING: 'pending',
    PAID: 'paid',
    PAYMENT_FAILED: 'payment_failed',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
};

const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
};

// ==================== Error Codes ====================

const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    INVENTORY_UNAVAILABLE: 'INVENTORY_UNAVAILABLE',
    GATEWAY_ERROR: 'GATEWAY_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    TIMEOUT: 'TIMEOUT',
    CANCELLED: 'CANCELLED',
    UNKNOWN: 'UNKNOWN',
};

// ==================== Activity Proxy Configurations ====================

/**
 * Get activity options for different activity types
 */
const ACTIVITY_OPTIONS = {
    notification: {
        startToCloseTimeout: ACTIVITY_TIMEOUTS.SHORT,
        retry: STANDARD_RETRY_POLICY,
    },
    
    payment: {
        startToCloseTimeout: ACTIVITY_TIMEOUTS.MEDIUM,
        retry: AGGRESSIVE_RETRY_POLICY,
    },
    
    listing: {
        startToCloseTimeout: ACTIVITY_TIMEOUTS.MEDIUM,
        retry: STANDARD_RETRY_POLICY,
    },
    
    analytics: {
        startToCloseTimeout: ACTIVITY_TIMEOUTS.LONG,
        retry: STANDARD_RETRY_POLICY,
    },
    
    cleanup: {
        startToCloseTimeout: ACTIVITY_TIMEOUTS.VERY_LONG,
        retry: EXTENDED_RETRY_POLICY,
    },
};

// ==================== Exports ====================

module.exports = {
    // Timeouts
    ACTIVITY_TIMEOUTS,
    WORKFLOW_TIMEOUTS,
    
    // Retry Policies
    STANDARD_RETRY_POLICY,
    AGGRESSIVE_RETRY_POLICY,
    MINIMAL_RETRY_POLICY,
    EXTENDED_RETRY_POLICY,
    
    // Workflow Configs
    PAYMENT_CONFIG,
    LISTING_CONFIG,
    NOTIFICATION_CONFIG,
    REPORT_CONFIG,
    CLEANUP_CONFIG,
    
    // Queues
    TASK_QUEUES,
    
    // Signals and Queries
    SIGNALS,
    QUERIES,
    
    // Status Constants
    WORKFLOW_STATUS,
    LISTING_STATUS,
    ORDER_STATUS,
    SUBSCRIPTION_STATUS,
    
    // Error Codes
    ERROR_CODES,
    
    // Activity Options
    ACTIVITY_OPTIONS,
};
