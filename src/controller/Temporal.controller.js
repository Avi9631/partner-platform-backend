const { startWorkflow, executeWorkflow, getWorkflowHandle } = require('../utils/temporalClient');
const logger = require('../config/winston.config');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

/**
 * Controller for Temporal Workflow operations
 */

/**
 * Start a notification workflow
 */
const startNotificationWorkflow = async (req, res) => {
    try {
        const { userId, message, type } = req.body;
        
        if (!userId || !message || !type) {
            return errorResponse(res, 'Missing required fields: userId, message, type', 400);
        }
        
        const workflowResult = await startWorkflow(
            'sendNotificationWorkflow',
            { userId, message, type },
            `notification-${userId}-${Date.now()}`
        );
        
        logger.info(`Notification workflow started: ${workflowResult.workflowId}`);
        
        return successResponse(
            res,
            {
                workflowId: workflowResult.workflowId,
                runId: workflowResult.runId,
                message: 'Notification workflow started successfully',
            },
            'Workflow started',
            202
        );
        
    } catch (error) {
        logger.error('Error starting notification workflow:', error);
        return errorResponse(res, 'Failed to start notification workflow', 500);
    }
};

/**
 * Execute user onboarding workflow (wait for completion)
 */
const executeOnboardingWorkflow = async (req, res) => {
    try {
        const { userId, email, name } = req.body;
        
        if (!userId || !email || !name) {
            return errorResponse(res, 'Missing required fields: userId, email, name', 400);
        }
        
        const result = await executeWorkflow(
            'userOnboardingWorkflow',
            { userId, email, name },
            `onboarding-${userId}-${Date.now()}`
        );
        
        logger.info(`Onboarding workflow completed for user: ${userId}`);
        
        return successResponse(
            res,
            result,
            'User onboarding completed successfully',
            200
        );
        
    } catch (error) {
        logger.error('Error executing onboarding workflow:', error);
        return errorResponse(res, 'Failed to execute onboarding workflow', 500);
    }
};

/**
 * Get workflow status
 */
const getWorkflowStatus = async (req, res) => {
    try {
        const { workflowId } = req.params;
        
        if (!workflowId) {
            return errorResponse(res, 'Missing workflowId parameter', 400);
        }
        
        const handle = await getWorkflowHandle(workflowId);
        const description = await handle.describe();
        
        return successResponse(
            res,
            {
                workflowId: description.workflowId,
                runId: description.runId,
                type: description.type,
                status: description.status,
                startTime: description.startTime,
                closeTime: description.closeTime,
            },
            'Workflow status retrieved',
            200
        );
        
    } catch (error) {
        logger.error('Error getting workflow status:', error);
        return errorResponse(res, 'Failed to get workflow status', 500);
    }
};

/**
 * Cancel a workflow
 */
const cancelWorkflowById = async (req, res) => {
    try {
        const { workflowId } = req.params;
        
        if (!workflowId) {
            return errorResponse(res, 'Missing workflowId parameter', 400);
        }
        
        const handle = await getWorkflowHandle(workflowId);
        await handle.cancel();
        
        logger.info(`Workflow cancelled: ${workflowId}`);
        
        return successResponse(
            res,
            { workflowId },
            'Workflow cancelled successfully',
            200
        );
        
    } catch (error) {
        logger.error('Error cancelling workflow:', error);
        return errorResponse(res, 'Failed to cancel workflow', 500);
    }
};

module.exports = {
    startNotificationWorkflow,
    executeOnboardingWorkflow,
    getWorkflowStatus,
    cancelWorkflowById,
};
