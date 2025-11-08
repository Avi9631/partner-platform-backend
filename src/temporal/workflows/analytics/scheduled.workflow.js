/**
 * Analytics Workflows
 * 
 * Handles scheduled analytics and reporting workflows.
 * 
 * @module temporal/workflows/analytics
 */

const { proxyActivities, sleep } = require('@temporalio/workflow');
const { ACTIVITY_OPTIONS } = require('../../config/constants');

/** @typedef {import('../../types').ReportConfig} ReportConfig */
/** @typedef {import('../../types').ReportWorkflowResult} ReportWorkflowResult */
/** @typedef {import('../../types').CleanupConfig} CleanupConfig */
/** @typedef {import('../../types').CleanupWorkflowResult} CleanupWorkflowResult */
/** @typedef {import('../../types').ReminderData} ReminderData */

// Proxy analytics activities
const {
    gatherAnalytics,
    generateReport,
    storeReport,
    logReportGeneration,
    identifyCleanupItems,
    backupData,
    deleteItems,
    logCleanupOperation,
    sendNotification,
    validateReminder,
    markReminderSent,
    sendEmail,
} = proxyActivities(ACTIVITY_OPTIONS.analytics);

/**
 * Daily Report Generation Workflow
 * 
 * Generates and distributes daily analytics reports to specified recipients.
 * 
 * @param {ReportConfig} reportConfig - Report configuration
 * @returns {Promise<ReportWorkflowResult>} - Report generation result
 */
async function dailyReportWorkflow(reportConfig) {
    const { reportType, recipients, scheduleTime } = reportConfig;
    
    console.log(`[Daily Report] Starting workflow for ${reportType}`);
    
    try {
        // Step 1: Gather analytics data
        const analyticsData = await gatherAnalytics({
            reportType,
            period: 'last_24_hours',
        });
        
        console.log(`[Daily Report] Analytics data gathered`);
        
        // Step 2: Generate report
        const report = await generateReport({
            reportType,
            data: analyticsData,
            format: 'pdf',
        });
        
        console.log(`[Daily Report] Report generated`);
        
        // Step 3: Store report
        const reportUrl = await storeReport({
            report,
            fileName: `${reportType}-${new Date().toISOString().split('T')[0]}.pdf`,
        });
        
        console.log(`[Daily Report] Report stored at ${reportUrl}`);
        
        // Step 4: Send report to all recipients
        for (const recipient of recipients) {
            await sendEmail({
                to: recipient,
                subject: `Daily ${reportType} Report - ${new Date().toLocaleDateString()}`,
                body: `
                    <h1>Daily ${reportType} Report</h1>
                    <p>Please find your daily ${reportType} report attached.</p>
                    <p>Report URL: <a href="${reportUrl}">${reportUrl}</a></p>
                    <p>Generated: ${new Date().toLocaleString()}</p>
                `,
                attachments: [
                    {
                        filename: `${reportType}-report.pdf`,
                        url: reportUrl,
                    },
                ],
            });
        }
        
        console.log(`[Daily Report] Report sent to ${recipients.length} recipients`);
        
        // Step 5: Log report generation
        await logReportGeneration({
            reportType,
            recipientCount: recipients.length,
            reportUrl,
            generatedAt: new Date().toISOString(),
        });
        
        return {
            success: true,
            reportType,
            reportUrl,
            recipientCount: recipients.length,
        };
        
    } catch (error) {
        console.error(`[Daily Report] Failed for ${reportType}:`, error);
        
        // Notify admins of failure
        await sendEmail({
            to: 'admin@partner-platform.com',
            subject: `Report Generation Failed: ${reportType}`,
            body: `Failed to generate ${reportType} report. Error: ${error.message}`,
        });
        
        throw error;
    }
}

/**
 * Data Cleanup Workflow
 * 
 * Performs scheduled database cleanup with backup.
 * Processes items in batches to avoid overloading the database.
 * 
 * @param {CleanupConfig} cleanupConfig - Cleanup configuration
 * @returns {Promise<CleanupWorkflowResult>} - Cleanup result
 */
async function dataCleanupWorkflow(cleanupConfig) {
    const { cleanupType, retentionDays } = cleanupConfig;
    
    console.log(`[Data Cleanup] Starting workflow for ${cleanupType}, retention: ${retentionDays} days`);
    
    try {
        // Step 1: Identify items to cleanup
        const itemsToCleanup = await identifyCleanupItems({
            cleanupType,
            retentionDays,
        });
        
        if (itemsToCleanup.length === 0) {
            console.log(`[Data Cleanup] No items to cleanup for ${cleanupType}`);
            return {
                success: true,
                cleanupType,
                itemsDeleted: 0,
                message: 'No items to cleanup',
            };
        }
        
        console.log(`[Data Cleanup] Found ${itemsToCleanup.length} items to cleanup`);
        
        // Step 2: Backup data before deletion
        const backupUrl = await backupData({
            cleanupType,
            items: itemsToCleanup,
        });
        
        console.log(`[Data Cleanup] Backup created at ${backupUrl}`);
        
        // Step 3: Delete items in batches
        let deletedCount = 0;
        const batchSize = 100;
        
        for (let i = 0; i < itemsToCleanup.length; i += batchSize) {
            const batch = itemsToCleanup.slice(i, i + batchSize);
            
            const result = await deleteItems({
                cleanupType,
                items: batch,
            });
            
            deletedCount += result.deletedCount;
            console.log(`[Data Cleanup] Deleted batch ${Math.floor(i / batchSize) + 1}, total: ${deletedCount}`);
            
            // Small delay between batches
            if (i + batchSize < itemsToCleanup.length) {
                await sleep('1s');
            }
        }
        
        console.log(`[Data Cleanup] Deleted ${deletedCount} items`);
        
        // Step 4: Log cleanup operation
        await logCleanupOperation({
            cleanupType,
            itemsDeleted: deletedCount,
            backupUrl,
            completedAt: new Date().toISOString(),
        });
        
        // Step 5: Send summary email
        await sendEmail({
            to: 'admin@partner-platform.com',
            subject: `Data Cleanup Completed: ${cleanupType}`,
            body: `
                <h1>Cleanup Completed</h1>
                <p>Type: ${cleanupType}</p>
                <p>Items Deleted: ${deletedCount}</p>
                <p>Backup URL: <a href="${backupUrl}">${backupUrl}</a></p>
                <p>Completed: ${new Date().toLocaleString()}</p>
            `,
        });
        
        return {
            success: true,
            cleanupType,
            itemsDeleted: deletedCount,
            backupUrl,
        };
        
    } catch (error) {
        console.error(`[Data Cleanup] Failed for ${cleanupType}:`, error);
        
        await sendEmail({
            to: 'admin@partner-platform.com',
            subject: `Data Cleanup Failed: ${cleanupType}`,
            body: `Failed to complete data cleanup. Error: ${error.message}`,
        });
        
        throw error;
    }
}

/**
 * Reminder Workflow
 * 
 * Sends scheduled reminders to users at specified times.
 * 
 * @param {ReminderData} reminderData - Reminder details
 * @returns {Promise<Object>} - Reminder result
 */
async function reminderWorkflow(reminderData) {
    const { userId, reminderType, message, scheduledTime, metadata } = reminderData;
    
    console.log(`[Reminder] Starting workflow for user ${userId}, type: ${reminderType}`);
    
    try {
        // Wait until scheduled time
        const now = new Date();
        const scheduled = new Date(scheduledTime);
        const waitTime = scheduled.getTime() - now.getTime();
        
        if (waitTime > 0) {
            console.log(`[Reminder] Waiting ${Math.round(waitTime / 1000 / 60)} minutes until reminder time`);
            await sleep(waitTime);
        }
        
        // Check if reminder is still valid
        const isValid = await validateReminder({
            userId,
            reminderType,
            metadata,
        });
        
        if (!isValid) {
            console.log(`[Reminder] Reminder no longer valid for user ${userId}`);
            return {
                success: false,
                message: 'Reminder is no longer valid',
            };
        }
        
        // Send notification
        await sendNotification({
            userId,
            type: reminderType,
            message,
            metadata,
        });
        
        // Send email
        await sendEmail({
            to: userId,
            subject: `Reminder: ${reminderType}`,
            body: message,
        });
        
        console.log(`[Reminder] Reminder sent to user ${userId}`);
        
        // Mark as sent
        await markReminderSent({
            userId,
            reminderType,
            sentAt: new Date().toISOString(),
        });
        
        return {
            success: true,
            userId,
            reminderType,
            sentAt: new Date().toISOString(),
        };
        
    } catch (error) {
        console.error(`[Reminder] Failed for user ${userId}:`, error);
        throw error;
    }
}

module.exports = {
    dailyReportWorkflow,
    dataCleanupWorkflow,
    reminderWorkflow,
};
