/**
 * Listing Expiration Workflow
 * 
 * Handles automatic listing expiration with reminder notifications.
 * 
 * @module temporal/workflows/listing/expiration.workflow
 */

const { proxyActivities, sleep } = require('@temporalio/workflow');
const { ACTIVITY_OPTIONS, LISTING_CONFIG } = require('../../config/constants');

/** @typedef {import('../../types').ListingExpirationData} ListingExpirationData */
/** @typedef {import('../../types').ListingWorkflowResult} ListingWorkflowResult */

// Proxy listing activities
const {
    getListingStatus,
    expireListing,
    updateListingStatus,
    removeFromSearchIndex,
    sendEmail,
} = proxyActivities(ACTIVITY_OPTIONS.listing);

/**
 * Calculate time until a specific date
 * 
 * @param {string} targetDate - ISO date string
 * @returns {number} - Milliseconds until target date
 */
function calculateTimeUntil(targetDate) {
    const now = new Date();
    const target = new Date(targetDate);
    return Math.max(0, target.getTime() - now.getTime());
}

/**
 * Listing Expiration Workflow
 * 
 * Monitors listing expiration with:
 * - Reminder emails at configured intervals (7 days, 1 day before expiration)
 * - Automatic expiration if not renewed
 * - Removal from search index
 * 
 * @param {ListingExpirationData} listingData - Listing expiration details
 * @returns {Promise<ListingWorkflowResult>} - Expiration result
 * 
 * @example
 * await startWorkflow('listingExpirationWorkflow', {
 *   listingId: 'LST001',
 *   userId: 'agent@example.com',
 *   expirationDate: '2025-12-31T23:59:59Z'
 * });
 */
async function listingExpirationWorkflow(listingData) {
    const { listingId, userId, expirationDate } = listingData;
    
    console.log(`[Listing Expiration] Starting workflow for listing ${listingId}, expires: ${expirationDate}`);
    
    try {
        const now = new Date();
        const expiration = new Date(expirationDate);
        const daysUntilExpiration = Math.ceil((expiration - now) / (1000 * 60 * 60 * 24));
        
        console.log(`[Listing Expiration] Days until expiration: ${daysUntilExpiration}`);
        
        // Send reminders at configured intervals
        const reminderDays = LISTING_CONFIG.expirationReminderDays; // [7, 1]
        
        for (const reminderDay of reminderDays) {
            if (daysUntilExpiration <= reminderDay) {
                continue; // Skip if we're already past this reminder point
            }
            
            // Calculate time until reminder
            const reminderDate = new Date(expiration);
            reminderDate.setDate(reminderDate.getDate() - reminderDay);
            const timeUntilReminder = calculateTimeUntil(reminderDate.toISOString());
            
            if (timeUntilReminder > 0) {
                console.log(`[Listing Expiration] Waiting until ${reminderDay} days before expiration`);
                await sleep(timeUntilReminder);
                
                // Send reminder email
                await sendEmail({
                    to: userId,
                    subject: `Listing Expiring Soon - ${reminderDay} Day${reminderDay > 1 ? 's' : ''} Remaining`,
                    body: `
                        <h1>Listing Expiration Reminder</h1>
                        <p>Your listing will expire in ${reminderDay} day${reminderDay > 1 ? 's' : ''}.</p>
                        <p>Listing ID: ${listingId}</p>
                        <p>Expiration Date: ${expiration.toLocaleDateString()}</p>
                        <p>Renew your listing now to keep it active and visible to potential customers.</p>
                    `,
                });
                
                console.log(`[Listing Expiration] Sent ${reminderDay}-day reminder for ${listingId}`);
            }
        }
        
        // Wait until expiration date
        const timeUntilExpiration = calculateTimeUntil(expirationDate);
        
        if (timeUntilExpiration > 0) {
            console.log(`[Listing Expiration] Waiting until expiration date`);
            await sleep(timeUntilExpiration);
        }
        
        // Check if listing was renewed
        console.log(`[Listing Expiration] Checking if ${listingId} was renewed`);
        const listingStatus = await getListingStatus({ listingId });
        
        if (listingStatus.renewed) {
            console.log(`[Listing Expiration] Listing ${listingId} was renewed`);
            
            return {
                success: true,
                listingId,
                status: 'renewed',
                message: 'Listing was renewed before expiration',
            };
        }
        
        // Expire the listing
        console.log(`[Listing Expiration] Expiring listing ${listingId}`);
        
        await expireListing({ listingId });
        
        await updateListingStatus({
            listingId,
            status: 'expired',
        });
        
        // Remove from search index
        await removeFromSearchIndex({ listingId });
        
        console.log(`[Listing Expiration] Removed ${listingId} from search index`);
        
        // Send expiration notification
        await sendEmail({
            to: userId,
            subject: 'Listing Expired',
            body: `
                <h1>Listing Expired</h1>
                <p>Your listing has expired and is no longer visible to users.</p>
                <p>Listing ID: ${listingId}</p>
                <p>Expired Date: ${expiration.toLocaleDateString()}</p>
                <p>To reactivate your listing, please renew it through your dashboard.</p>
            `,
        });
        
        console.log(`[Listing Expiration] Listing ${listingId} expired successfully`);
        
        return {
            success: true,
            listingId,
            status: 'expired',
            message: 'Listing has been expired',
        };
        
    } catch (error) {
        console.error(`[Listing Expiration] Failed for listing ${listingId}:`, error);
        throw error;
    }
}

module.exports = {
    listingExpirationWorkflow,
};
