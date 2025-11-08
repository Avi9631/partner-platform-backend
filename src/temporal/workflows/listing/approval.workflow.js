/**
 * Listing Approval Workflow
 * 
 * Handles property listing approval with human-in-the-loop review process.
 * Includes automated validation, quality checks, and manual review handling.
 * 
 * @module temporal/workflows/listing/approval.workflow
 */

const { proxyActivities, sleep, condition, defineSignal, setHandler } = require('@temporalio/workflow');
const { ACTIVITY_OPTIONS, LISTING_CONFIG, SIGNALS } = require('../../config/constants');

/** @typedef {import('../../types').ListingData} ListingData */
/** @typedef {import('../../types').ListingWorkflowResult} ListingWorkflowResult */

// Proxy listing activities
const {
    validateListing,
    runAutomatedChecks,
    updateListingStatus,
    notifyReviewers,
    approveListing,
    rejectListing,
    publishToSearchIndex,
    sendEmail,
} = proxyActivities(ACTIVITY_OPTIONS.listing);

// Define signals for approval/rejection
const approveSignal = defineSignal(SIGNALS.APPROVE_LISTING);
const rejectSignal = defineSignal(SIGNALS.REJECT_LISTING);

/**
 * Listing Approval Workflow
 * 
 * Multi-step approval process:
 * 1. Validate listing data
 * 2. Run automated quality checks
 * 3. Notify human reviewers
 * 4. Wait for manual approval/rejection (with timeout)
 * 5. Auto-approve if quality score is high and timeout reached
 * 6. Publish to search index if approved
 * 
 * @param {ListingData} listingData - Listing details
 * @returns {Promise<ListingWorkflowResult>} - Approval result
 * 
 * @example
 * const { handle } = await startWorkflow('listingApprovalWorkflow', {
 *   listingId: 'LST001',
 *   userId: 'agent@example.com',
 *   propertyData: { ... }
 * });
 * 
 * // Later, approve or reject:
 * await handle.signal('approve', 'Looks great!');
 * // or
 * await handle.signal('reject', 'Missing documentation');
 */
async function listingApprovalWorkflow(listingData) {
    const { listingId, userId, propertyData } = listingData;
    
    console.log(`[Listing Approval] Starting workflow for listing ${listingId}`);
    
    // State for signal handling
    let approved = false;
    let rejected = false;
    let reviewComment = '';
    
    // Set up signal handlers
    setHandler(approveSignal, (comment) => {
        console.log(`[Listing Approval] Approval signal received for ${listingId}`);
        approved = true;
        reviewComment = comment || 'Approved';
    });
    
    setHandler(rejectSignal, (comment) => {
        console.log(`[Listing Approval] Rejection signal received for ${listingId}`);
        rejected = true;
        reviewComment = comment || 'Rejected';
    });
    
    try {
        // Step 1: Validate listing data
        console.log(`[Listing Approval] Validating listing ${listingId}`);
        const validationResult = await validateListing({
            listingId,
            propertyData,
        });
        
        if (!validationResult.valid) {
            console.log(`[Listing Approval] Validation failed for ${listingId}`);
            
            await updateListingStatus({
                listingId,
                status: 'validation_failed',
                reason: validationResult.errors.join(', '),
            });
            
            await sendEmail({
                to: userId,
                subject: 'Listing Validation Failed',
                body: `
                    <h1>Listing Validation Failed</h1>
                    <p>Your listing could not be validated due to the following errors:</p>
                    <ul>
                        ${validationResult.errors.map(err => `<li>${err}</li>`).join('')}
                    </ul>
                    <p>Please correct these issues and resubmit your listing.</p>
                `,
            });
            
            return {
                success: false,
                listingId,
                status: 'validation_failed',
                errors: validationResult.errors,
            };
        }
        
        console.log(`[Listing Approval] Validation passed for ${listingId}`);
        
        // Step 2: Run automated quality checks
        console.log(`[Listing Approval] Running automated checks for ${listingId}`);
        const autoCheckResult = await runAutomatedChecks({
            listingId,
            propertyData,
        });
        
        console.log(`[Listing Approval] Automated check score: ${autoCheckResult.score}`);
        
        // Step 3: Update status to pending review
        await updateListingStatus({
            listingId,
            status: 'pending_review',
            autoCheckScore: autoCheckResult.score,
        });
        
        // Step 4: Notify reviewers
        await notifyReviewers({
            listingId,
            userId,
            propertyData,
            autoCheckScore: autoCheckResult.score,
        });
        
        console.log(`[Listing Approval] Reviewers notified for ${listingId}`);
        
        // Step 5: Wait for manual review (with timeout)
        console.log(`[Listing Approval] Waiting for manual review (${LISTING_CONFIG.manualReviewTimeout})`);
        
        const reviewReceived = await condition(
            () => approved || rejected,
            LISTING_CONFIG.manualReviewTimeout
        );
        
        if (!reviewReceived) {
            // Timeout reached - auto-approve if quality score is high
            console.log(`[Listing Approval] Review timeout reached for ${listingId}`);
            
            if (autoCheckResult.score >= LISTING_CONFIG.autoApprovalThreshold) {
                approved = true;
                reviewComment = `Auto-approved after timeout (quality score: ${autoCheckResult.score})`;
                console.log(`[Listing Approval] Auto-approved ${listingId}`);
            } else {
                rejected = true;
                reviewComment = `Auto-rejected after timeout (requires manual review, quality score: ${autoCheckResult.score})`;
                console.log(`[Listing Approval] Auto-rejected ${listingId}`);
            }
        }
        
        // Step 6: Process approval or rejection
        if (approved) {
            console.log(`[Listing Approval] Approving ${listingId}`);
            
            await approveListing({
                listingId,
                reviewComment,
            });
            
            await updateListingStatus({
                listingId,
                status: 'approved',
                reviewComment,
            });
            
            // Publish to search index
            await publishToSearchIndex({
                listingId,
                propertyData,
            });
            
            console.log(`[Listing Approval] Published ${listingId} to search index`);
            
            // Send approval email
            await sendEmail({
                to: userId,
                subject: 'Listing Approved - Now Live!',
                body: `
                    <h1>Congratulations!</h1>
                    <p>Your listing has been approved and is now live on our platform.</p>
                    <p>Listing ID: ${listingId}</p>
                    <p>Review Comment: ${reviewComment}</p>
                    <p>Your listing is now visible to all users.</p>
                `,
            });
            
            return {
                success: true,
                listingId,
                status: 'approved',
                reviewComment,
            };
            
        } else {
            console.log(`[Listing Approval] Rejecting ${listingId}`);
            
            await rejectListing({
                listingId,
                reviewComment,
            });
            
            await updateListingStatus({
                listingId,
                status: 'rejected',
                reviewComment,
            });
            
            // Send rejection email
            await sendEmail({
                to: userId,
                subject: 'Listing Rejected',
                body: `
                    <h1>Listing Rejected</h1>
                    <p>Your listing has been rejected by our review team.</p>
                    <p>Listing ID: ${listingId}</p>
                    <p>Reason: ${reviewComment}</p>
                    <p>Please address the issues and resubmit your listing.</p>
                `,
            });
            
            return {
                success: false,
                listingId,
                status: 'rejected',
                reviewComment,
            };
        }
        
    } catch (error) {
        console.error(`[Listing Approval] Failed for listing ${listingId}:`, error);
        
        await updateListingStatus({
            listingId,
            status: 'error',
            errorMessage: error.message,
        });
        
        await sendEmail({
            to: userId,
            subject: 'Listing Approval Error',
            body: `
                <h1>Error Processing Listing</h1>
                <p>An error occurred while processing your listing.</p>
                <p>Listing ID: ${listingId}</p>
                <p>Error: ${error.message}</p>
                <p>Please contact support for assistance.</p>
            `,
        });
        
        throw error;
    }
}

module.exports = {
    listingApprovalWorkflow,
};
