/**
 * Project Publishing Workflow - Direct Execution (Non-Temporal)
 * 
 * This is the direct execution version of projectPublishing.workflow.js
 * It has the SAME logic but without Temporal's proxyActivities.
 * 
 * MAINTENANCE: Keep this in sync with projectPublishing.workflow.js
 * 
 * @module temporal/workflows/projectPublishing-non.workflow
 */
const logger = require('../../../config/winston.config');

// Import Project specific activities
const projectActivities = require('../../activities/projectPublishing.activities');

// Combine all activities into a single object
const activities = {
    ...projectActivities,
    // Add more activity imports here if needed
};

/**
 * Project Publishing Workflow - Direct Execution
 */
async function projectPublishing(workflowInput) {
    const { 
        userId,
        draftId,
        projectData
    } = workflowInput;
    
    logger.info(`[Project Publishing Workflow - Direct] Starting for user ${userId}`);
    
    try {
        // Step 1: Validate project data
        logger.info(`[Project Publishing] Step 1: Validating project data`);
        
        const validationResult = await activities.validateProjectData({
            userId,
            draftId,
            projectData,
        });
        
        if (!validationResult.success) {
            logger.error(`[Project Publishing] Validation failed:`, validationResult.errors);
            return {
                success: false,
                message: 'Project data validation failed',
                errors: validationResult.errors,
            };
        }
        
        logger.info(`[Project Publishing] Validation successful`);
        
        // Step 2: Create or update project record
        logger.info(`[Project Publishing] Step 2: Creating/updating project record`);
        
        let projectResult;
        if (projectData.projectId) {
            projectResult = await activities.updateProjectRecord({
                projectId: projectData.projectId,
                userId,
                projectData,
            });
        } else {
            projectResult = await activities.createProjectRecord({
                userId,
                draftId,
                projectData,
            });
        }
        
        if (!projectResult.success) {
            logger.error(`[Project Publishing] Project creation/update failed:`, projectResult.error);
            return {
                success: false,
                message: projectResult.error || 'Failed to create/update project',
            };
        }
        
        const projectId = projectResult.projectId;
        logger.info(`[Project Publishing] Project record saved: ID ${projectId}`);
        
        // Step 3: Deduct publishing credits
        logger.info(`[Project Publishing] Step 3: Deducting publishing credits`);
        
        const creditResult = await activities.deductPublishingCredits({
            userId,
            projectId: projectResult.data.projectId,
            amount: 10
        });
        
        if (!creditResult.success) {
            logger.error(`[Project Publishing] Failed to deduct credits:`, creditResult.message);
            return {
                success: false,
                message: creditResult.message || 'Failed to deduct publishing credits',
            };
        }
        
        logger.info(`[Project Publishing] Credits deducted successfully. New balance: ${creditResult.transaction.balanceAfter}`);
        
        // Step 4: Update draft status if draft was provided
        if (draftId) {
            logger.info(`[Project Publishing] Step 4: Updating draft status`);
            
            await activities.updateListingDraftStatus({
                draftId,
                status: 'PUBLISHED',
                publishedId: projectResult.data.projectId,
                publishedType: 'PROJECT'
            });
            
            logger.info(`[Project Publishing] Draft status updated`);
        }
        
        // Step 5: Send notification to user
        logger.info(`[Project Publishing] Step 5: Sending notification`);
        
        const isUpdate = !!projectData.projectId;
        
        await activities.sendProjectPublishingNotification({
            userId,
            projectId: projectResult.data.projectId,
            projectName: projectResult.data.projectName,
            isUpdate,
        });
        
        logger.info(`[Project Publishing] Notification sent`);
        
        // Step 6: Return success result
        logger.info(`[Project Publishing] Workflow completed successfully`);
        
        return {
            success: true,
            message: `Project ${isUpdate ? 'updated' : 'published'} successfully`,
            data: {
                projectId: projectResult.data.projectId,
                projectName: projectResult.data.projectName,
                status: projectResult.data.status,
                isUpdate,
            },
        };
        
    } catch (error) {
        logger.error(`[Project Publishing] Workflow failed:`, error);
        
        return {
            success: false,
            message: 'Project publishing workflow failed',
            error: error.message,
            stack: error.stack,
        };
    }
}

module.exports = { projectPublishing };
