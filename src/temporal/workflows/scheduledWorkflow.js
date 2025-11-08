const { proxyActivities, sleep } = require('@temporalio/workflow');

const activities = proxyActivities({
    startToCloseTimeout: '5 minutes',
});

/**
 * Daily Report Generation Workflow
 * Generates and sends daily analytics reports
 */
async function dailyReportWorkflow(reportConfig) {
    const { reportType, recipients, scheduleTime } = reportConfig;
    
    console.log(`Starting daily report workflow for ${reportType}`);
    
    try {
        // Step 1: Gather analytics data
        const analyticsData = await activities.gatherAnalytics({
            reportType,
            period: 'last_24_hours',
        });
        
        // Step 2: Generate report
        const report = await activities.generateReport({
            reportType,
            data: analyticsData,
            format: 'pdf',
        });
        
        // Step 3: Store report
        const reportUrl = await activities.storeReport({
            report,
            fileName: `${reportType}-${new Date().toISOString().split('T')[0]}.pdf`,
        });
        
        // Step 4: Send report to recipients
        for (const recipient of recipients) {
            await activities.sendEmail({
                to: recipient,
                subject: `Daily ${reportType} Report - ${new Date().toLocaleDateString()}`,
                body: `Please find your daily ${reportType} report attached.`,
                attachments: [
                    {
                        filename: `${reportType}-report.pdf`,
                        url: reportUrl,
                    },
                ],
            });
        }
        
        // Step 5: Log report generation
        await activities.logReportGeneration({
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
        console.error(`Daily report workflow failed:`, error);
        
        // Notify admins of failure
        await activities.sendEmail({
            to: 'admin@partner-platform.com',
            subject: `Report Generation Failed: ${reportType}`,
            body: `Failed to generate ${reportType} report. Error: ${error.message}`,
        });
        
        throw error;
    }
}

/**
 * Data Cleanup Workflow
 * Performs scheduled database cleanup tasks
 */
async function dataCleanupWorkflow(cleanupConfig) {
    const { cleanupType, retentionDays } = cleanupConfig;
    
    console.log(`Starting data cleanup workflow for ${cleanupType}`);
    
    try {
        // Step 1: Identify data to cleanup
        const itemsToCleanup = await activities.identifyCleanupItems({
            cleanupType,
            retentionDays,
        });
        
        if (itemsToCleanup.length === 0) {
            return {
                success: true,
                cleanupType,
                itemsDeleted: 0,
                message: 'No items to cleanup',
            };
        }
        
        console.log(`Found ${itemsToCleanup.length} items to cleanup`);
        
        // Step 2: Backup data before deletion
        const backupUrl = await activities.backupData({
            cleanupType,
            items: itemsToCleanup,
        });
        
        // Step 3: Delete items in batches
        let deletedCount = 0;
        const batchSize = 100;
        
        for (let i = 0; i < itemsToCleanup.length; i += batchSize) {
            const batch = itemsToCleanup.slice(i, i + batchSize);
            
            const result = await activities.deleteItems({
                cleanupType,
                items: batch,
            });
            
            deletedCount += result.deletedCount;
            
            // Small delay between batches to avoid overloading database
            if (i + batchSize < itemsToCleanup.length) {
                await sleep('1s');
            }
        }
        
        // Step 4: Log cleanup operation
        await activities.logCleanupOperation({
            cleanupType,
            itemsDeleted: deletedCount,
            backupUrl,
            completedAt: new Date().toISOString(),
        });
        
        // Step 5: Send summary email
        await activities.sendEmail({
            to: 'admin@partner-platform.com',
            subject: `Data Cleanup Completed: ${cleanupType}`,
            body: `Cleanup completed successfully. Deleted ${deletedCount} items. Backup available at: ${backupUrl}`,
        });
        
        return {
            success: true,
            cleanupType,
            itemsDeleted: deletedCount,
            backupUrl,
        };
        
    } catch (error) {
        console.error(`Data cleanup workflow failed:`, error);
        
        // Notify admins of failure
        await activities.sendEmail({
            to: 'admin@partner-platform.com',
            subject: `Data Cleanup Failed: ${cleanupType}`,
            body: `Failed to complete data cleanup. Error: ${error.message}`,
        });
        
        throw error;
    }
}

/**
 * Reminder Workflow
 * Sends scheduled reminders to users
 */
async function reminderWorkflow(reminderData) {
    const { userId, reminderType, message, scheduledTime, metadata } = reminderData;
    
    console.log(`Starting reminder workflow for user ${userId}`);
    
    try {
        // Wait until scheduled time
        const now = new Date();
        const scheduled = new Date(scheduledTime);
        const waitTime = scheduled - now;
        
        if (waitTime > 0) {
            console.log(`Waiting ${waitTime}ms until reminder time`);
            await sleep(waitTime);
        }
        
        // Check if reminder is still valid
        const isValid = await activities.validateReminder({
            userId,
            reminderType,
            metadata,
        });
        
        if (!isValid) {
            return {
                success: false,
                reason: 'Reminder is no longer valid',
            };
        }
        
        // Send reminder notification
        await activities.sendNotification({
            userId,
            type: reminderType,
            message,
            metadata,
        });
        
        // Send email reminder
        await activities.sendEmail({
            to: userId,
            subject: `Reminder: ${reminderType}`,
            body: message,
        });
        
        // Mark reminder as sent
        await activities.markReminderSent({
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
        console.error(`Reminder workflow failed:`, error);
        throw error;
    }
}

module.exports = {
    dailyReportWorkflow,
    dataCleanupWorkflow,
    reminderWorkflow,
};
