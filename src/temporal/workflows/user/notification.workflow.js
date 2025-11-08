/**
 * User Notification Workflow
 * 
 * Handles sending notifications to users via multiple channels (email, push, in-app).
 * 
 * @module temporal/workflows/user/notification.workflow
 */

const { proxyActivities } = require('@temporalio/workflow');
const { ACTIVITY_OPTIONS } = require('../../config/constants');

// Import type definitions for better IDE support
/** @typedef {import('../../types').NotificationData} NotificationData */
/** @typedef {import('../../types').NotificationWorkflowResult} NotificationWorkflowResult */

// Proxy notification activities
const {
    sendEmail,
    processNotification,
} = proxyActivities(ACTIVITY_OPTIONS.notification);

/**
 * Send Notification Workflow
 * 
 * Sends notifications to users through email and internal notification system.
 * Handles retry logic and fallback mechanisms.
 * 
 * @param {NotificationData} data - Notification data
 * @returns {Promise<NotificationWorkflowResult>} - Result of notification workflow
 * 
 * @example
 * // Start workflow
 * await startWorkflow('sendNotificationWorkflow', {
 *   userId: 'user@example.com',
 *   message: 'Your listing has been approved!',
 *   type: 'success'
 * });
 */
async function sendNotificationWorkflow(data) {
    const { userId, message, type } = data;
    
    console.log(`[Notification Workflow] Starting for user ${userId}, type: ${type}`);
    
    try {
        // Step 1: Send email notification
        const emailResult = await sendEmail({
            to: userId,
            subject: `Notification: ${type}`,
            body: message,
        });
        
        console.log(`[Notification Workflow] Email sent: ${emailResult.success}`);
        
        // Step 2: Process internal notification (in-app, push, etc.)
        const notificationResult = await processNotification({
            userId,
            type,
            status: emailResult.success ? 'sent' : 'failed',
        });
        
        console.log(`[Notification Workflow] Internal notification processed: ${notificationResult.success}`);
        
        return {
            success: true,
            emailSent: emailResult.success,
            notificationProcessed: notificationResult.success,
        };
        
    } catch (error) {
        console.error(`[Notification Workflow] Failed for user ${userId}:`, error);
        
        // Even if notification fails, we want to log it but not throw
        // This prevents the workflow from failing completely
        return {
            success: false,
            emailSent: false,
            notificationProcessed: false,
        };
    }
}

module.exports = {
    sendNotificationWorkflow,
};
