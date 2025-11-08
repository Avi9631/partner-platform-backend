/**
 * Type Definitions for Temporal Workflows and Activities
 * 
 * This file contains JSDoc type definitions to provide better IDE support
 * and documentation for all workflows and activities.
 * 
 * @module temporal/types
 */

// ==================== Common Types ====================

/**
 * @typedef {Object} WorkflowResult
 * @property {boolean} success - Whether the workflow completed successfully
 * @property {string} [message] - Optional message about the workflow execution
 * @property {Object} [data] - Additional data returned by the workflow
 */

/**
 * @typedef {Object} ActivityResult
 * @property {boolean} success - Whether the activity completed successfully
 * @property {string} [error] - Error message if activity failed
 * @property {Object} [data] - Additional data returned by the activity
 */

// ==================== User Types ====================

/**
 * @typedef {Object} UserData
 * @property {string} userId - Unique identifier for the user
 * @property {string} email - User's email address
 * @property {string} name - User's full name
 */

/**
 * @typedef {Object} NotificationData
 * @property {string} userId - User ID or email address
 * @property {string} message - Notification message content
 * @property {('info'|'warning'|'success'|'error')} type - Notification type
 */

/**
 * @typedef {Object} EmailData
 * @property {string} to - Recipient email address
 * @property {string} subject - Email subject line
 * @property {string} body - Email body content (HTML supported)
 * @property {Array<{filename: string, url?: string, content?: Buffer}>} [attachments] - Email attachments
 */

// ==================== Payment Types ====================

/**
 * @typedef {Object} PaymentData
 * @property {string} orderId - Unique order identifier
 * @property {string} userId - User making the payment
 * @property {number} amount - Payment amount
 * @property {('USD'|'EUR'|'INR')} currency - Currency code
 * @property {('card'|'upi'|'wallet')} paymentMethod - Payment method
 */

/**
 * @typedef {Object} PaymentValidation
 * @property {boolean} valid - Whether payment data is valid
 * @property {string} [reason] - Reason for validation failure
 */

/**
 * @typedef {Object} PaymentResult
 * @property {boolean} success - Whether payment was processed
 * @property {string} [transactionId] - Transaction ID from payment gateway
 * @property {string} [error] - Error message if payment failed
 * @property {number} [amount] - Payment amount
 * @property {string} [currency] - Currency code
 */

/**
 * @typedef {Object} SubscriptionData
 * @property {string} subscriptionId - Unique subscription identifier
 * @property {string} userId - User owning the subscription
 * @property {number} amount - Subscription amount
 * @property {string} currency - Currency code
 * @property {('monthly'|'yearly'|'weekly')} billingPeriod - Billing frequency
 */

/**
 * @typedef {Object} SubscriptionDetails
 * @property {string} subscriptionId - Subscription identifier
 * @property {boolean} active - Whether subscription is active
 * @property {string} paymentMethod - Payment method for subscription
 * @property {number} failedPaymentCount - Number of consecutive failed payments
 */

// ==================== Listing Types ====================

/**
 * @typedef {Object} LocationData
 * @property {string} address - Street address
 * @property {string} city - City name
 * @property {string} state - State/province
 * @property {string} [zipCode] - Postal code
 * @property {number} [latitude] - Latitude coordinate
 * @property {number} [longitude] - Longitude coordinate
 */

/**
 * @typedef {Object} PropertyData
 * @property {string} title - Property title
 * @property {string} description - Detailed description
 * @property {number} price - Property price
 * @property {LocationData} location - Property location details
 * @property {string[]} images - Array of image URLs
 * @property {number} [bedrooms] - Number of bedrooms
 * @property {number} [bathrooms] - Number of bathrooms
 * @property {number} [area] - Property area in square feet
 */

/**
 * @typedef {Object} ListingData
 * @property {string} listingId - Unique listing identifier
 * @property {string} userId - User who created the listing
 * @property {PropertyData} propertyData - Property details
 */

/**
 * @typedef {Object} ListingValidationResult
 * @property {boolean} valid - Whether listing data is valid
 * @property {string[]} errors - Array of validation errors
 */

/**
 * @typedef {Object} AutomatedCheckResult
 * @property {number} score - Quality score (0-1)
 * @property {string[]} issues - Array of issues found
 * @property {boolean} passed - Whether checks passed
 */

/**
 * @typedef {Object} ListingExpirationData
 * @property {string} listingId - Listing identifier
 * @property {string} userId - User who owns the listing
 * @property {string} expirationDate - ISO date string for expiration
 */

// ==================== Analytics Types ====================

/**
 * @typedef {Object} ReportConfig
 * @property {('sales'|'analytics'|'performance')} reportType - Type of report
 * @property {string[]} recipients - Email addresses to receive report
 * @property {string} [scheduleTime] - ISO time string for scheduled report
 */

/**
 * @typedef {Object} AnalyticsData
 * @property {string} reportType - Type of analytics report
 * @property {string} period - Time period for analytics
 * @property {Object} metrics - Metrics data object
 * @property {string} timestamp - ISO timestamp
 */

/**
 * @typedef {Object} Report
 * @property {string} type - Report type
 * @property {string} format - Report format (pdf, excel, etc.)
 * @property {Object} data - Report data
 * @property {string} generatedAt - ISO timestamp
 * @property {string|Buffer} content - Report content
 */

/**
 * @typedef {Object} CleanupConfig
 * @property {('logs'|'sessions'|'temp_files')} cleanupType - Type of data to clean
 * @property {number} retentionDays - Days to retain data before cleanup
 */

/**
 * @typedef {Object} CleanupItem
 * @property {string} id - Item identifier
 * @property {Date} createdAt - Creation timestamp
 */

// ==================== Reminder Types ====================

/**
 * @typedef {Object} ReminderData
 * @property {string} userId - User to send reminder to
 * @property {string} reminderType - Type of reminder
 * @property {string} message - Reminder message
 * @property {string} scheduledTime - ISO time string for reminder
 * @property {Object} [metadata] - Additional reminder metadata
 */

// ==================== Order Types ====================

/**
 * @typedef {Object} OrderStatus
 * @property {string} orderId - Order identifier
 * @property {('pending'|'paid'|'payment_failed'|'processing'|'completed'|'cancelled')} status - Order status
 * @property {string} [transactionId] - Payment transaction ID
 * @property {string} [errorMessage] - Error message if any
 */

// ==================== Workflow Input/Output Types ====================

/**
 * @typedef {Object} NotificationWorkflowResult
 * @property {boolean} success - Overall success status
 * @property {boolean} emailSent - Whether email was sent successfully
 * @property {boolean} notificationProcessed - Whether notification was processed
 */

/**
 * @typedef {Object} PaymentWorkflowResult
 * @property {boolean} success - Whether payment was successful
 * @property {string} orderId - Order identifier
 * @property {string} transactionId - Transaction ID from gateway
 * @property {number} amount - Payment amount
 * @property {string} currency - Currency code
 * @property {string} message - Result message
 */

/**
 * @typedef {Object} ListingWorkflowResult
 * @property {boolean} success - Whether listing workflow completed successfully
 * @property {string} listingId - Listing identifier
 * @property {('approved'|'rejected'|'validation_failed'|'expired'|'renewed')} status - Final status
 * @property {string} [reviewComment] - Review comment if applicable
 * @property {string[]} [errors] - Validation errors if any
 * @property {string} [message] - Result message
 */

/**
 * @typedef {Object} ReportWorkflowResult
 * @property {boolean} success - Whether report was generated successfully
 * @property {string} reportType - Type of report
 * @property {string} reportUrl - URL to access the report
 * @property {number} recipientCount - Number of recipients
 */

/**
 * @typedef {Object} CleanupWorkflowResult
 * @property {boolean} success - Whether cleanup completed successfully
 * @property {string} cleanupType - Type of cleanup performed
 * @property {number} itemsDeleted - Number of items deleted
 * @property {string} backupUrl - URL to backup file
 * @property {string} [message] - Result message
 */

// Export types for use in other modules (for documentation purposes)
module.exports = {};
