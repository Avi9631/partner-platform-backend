const { proxyActivities, sleep, condition, defineSignal, setHandler } = require('@temporalio/workflow');

const activities = proxyActivities({
    startToCloseTimeout: '1 minute',
});

// Define signals for approval/rejection
const approveSignal = defineSignal('approve');
const rejectSignal = defineSignal('reject');

/**
 * Listing Approval Workflow
 * Handles property listing approval process with human-in-the-loop
 */
async function listingApprovalWorkflow(listingData) {
    const { listingId, userId, propertyData } = listingData;
    
    console.log(`Starting listing approval workflow for listing ${listingId}`);
    
    let approved = false;
    let rejected = false;
    let reviewComment = '';
    
    // Set up signal handlers
    setHandler(approveSignal, (comment) => {
        approved = true;
        reviewComment = comment || 'Approved';
    });
    
    setHandler(rejectSignal, (comment) => {
        rejected = true;
        reviewComment = comment || 'Rejected';
    });
    
    try {
        // Step 1: Validate listing data
        const validationResult = await activities.validateListing({
            listingId,
            propertyData,
        });
        
        if (!validationResult.valid) {
            await activities.updateListingStatus({
                listingId,
                status: 'validation_failed',
                reason: validationResult.errors.join(', '),
            });
            
            await activities.sendEmail({
                to: userId,
                subject: 'Listing Validation Failed',
                body: `Your listing could not be validated. Errors: ${validationResult.errors.join(', ')}`,
            });
            
            return {
                success: false,
                listingId,
                status: 'validation_failed',
                errors: validationResult.errors,
            };
        }
        
        // Step 2: Run automated checks
        const autoCheckResult = await activities.runAutomatedChecks({
            listingId,
            propertyData,
        });
        
        // Step 3: Update status to pending review
        await activities.updateListingStatus({
            listingId,
            status: 'pending_review',
            autoCheckScore: autoCheckResult.score,
        });
        
        // Step 4: Notify reviewers
        await activities.notifyReviewers({
            listingId,
            userId,
            propertyData,
            autoCheckScore: autoCheckResult.score,
        });
        
        // Step 5: Wait for approval or rejection (with timeout)
        console.log(`Waiting for manual review of listing ${listingId}`);
        
        // Wait for 48 hours for manual review
        const reviewReceived = await condition(() => approved || rejected, '48h');
        
        if (!reviewReceived) {
            // Timeout - auto-approve if auto-check score is high
            if (autoCheckResult.score >= 0.8) {
                approved = true;
                reviewComment = 'Auto-approved after review timeout (high quality score)';
            } else {
                rejected = true;
                reviewComment = 'Auto-rejected after review timeout (requires manual review)';
            }
        }
        
        if (approved) {
            // Step 6: Approve listing
            await activities.approveListing({
                listingId,
                reviewComment,
            });
            
            await activities.updateListingStatus({
                listingId,
                status: 'approved',
                reviewComment,
            });
            
            // Publish to search index
            await activities.publishToSearchIndex({
                listingId,
                propertyData,
            });
            
            // Send approval email
            await activities.sendEmail({
                to: userId,
                subject: 'Listing Approved',
                body: `Your listing has been approved and is now live! ${reviewComment}`,
            });
            
            return {
                success: true,
                listingId,
                status: 'approved',
                reviewComment,
            };
            
        } else {
            // Step 6: Reject listing
            await activities.rejectListing({
                listingId,
                reviewComment,
            });
            
            await activities.updateListingStatus({
                listingId,
                status: 'rejected',
                reviewComment,
            });
            
            // Send rejection email
            await activities.sendEmail({
                to: userId,
                subject: 'Listing Rejected',
                body: `Your listing has been rejected. Reason: ${reviewComment}`,
            });
            
            return {
                success: false,
                listingId,
                status: 'rejected',
                reviewComment,
            };
        }
        
    } catch (error) {
        console.error(`Listing approval workflow failed for listing ${listingId}:`, error);
        
        await activities.updateListingStatus({
            listingId,
            status: 'error',
            errorMessage: error.message,
        });
        
        throw error;
    }
}

/**
 * Listing Expiration Workflow
 * Handles automatic listing expiration and renewal reminders
 */
async function listingExpirationWorkflow(listingData) {
    const { listingId, userId, expirationDate } = listingData;
    
    console.log(`Starting expiration workflow for listing ${listingId}`);
    
    try {
        // Calculate days until expiration
        const now = new Date();
        const expiration = new Date(expirationDate);
        const daysUntilExpiration = Math.ceil((expiration - now) / (1000 * 60 * 60 * 24));
        
        // Send reminder 7 days before expiration
        if (daysUntilExpiration === 7) {
            await activities.sendEmail({
                to: userId,
                subject: 'Listing Expiring Soon',
                body: `Your listing will expire in 7 days. Renew now to keep it active.`,
            });
        }
        
        // Send reminder 1 day before expiration
        if (daysUntilExpiration === 1) {
            await activities.sendEmail({
                to: userId,
                subject: 'Listing Expires Tomorrow',
                body: `Your listing will expire tomorrow. Renew now to avoid deactivation.`,
            });
        }
        
        // Wait until expiration date
        const timeUntilExpiration = expiration - now;
        if (timeUntilExpiration > 0) {
            await sleep(timeUntilExpiration);
        }
        
        // Check if listing was renewed
        const listingStatus = await activities.getListingStatus({ listingId });
        
        if (listingStatus.renewed) {
            return {
                success: true,
                listingId,
                status: 'renewed',
                message: 'Listing was renewed before expiration',
            };
        }
        
        // Expire the listing
        await activities.expireListing({ listingId });
        
        await activities.updateListingStatus({
            listingId,
            status: 'expired',
        });
        
        // Remove from search index
        await activities.removeFromSearchIndex({ listingId });
        
        // Send expiration notification
        await activities.sendEmail({
            to: userId,
            subject: 'Listing Expired',
            body: `Your listing has expired and is no longer visible to users.`,
        });
        
        return {
            success: true,
            listingId,
            status: 'expired',
            message: 'Listing has been expired',
        };
        
    } catch (error) {
        console.error(`Listing expiration workflow failed for listing ${listingId}:`, error);
        throw error;
    }
}

module.exports = {
    listingApprovalWorkflow,
    listingExpirationWorkflow,
};
