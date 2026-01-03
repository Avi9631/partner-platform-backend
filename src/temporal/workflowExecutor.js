/**
 * Workflow Executor - Direct Execution Fallback
 * 
 * This module routes workflow execution to non-Temporal workflow files
 * when Temporal is disabled or unavailable.
 * 
 * The actual workflow logic is in *-non.workflow.js files which mirror
 * the Temporal workflow files but can run directly without Temporal.
 * 
 * @module temporal/workflowExecutor
 */

const logger = require('../config/winston.config');

// Import non-Temporal workflow implementations from skip-workflow folder
const { partnerUserOnboarding } = require('./workflows/skip-workflow/partnerOnboarding-non.workflow');
const { partnerBusinessOnboarding } = require('./workflows/skip-workflow/partnerBusinessOnboarding-non.workflow');
const { propertyPublishing } = require('./workflows/skip-workflow/propertyPublishing-non.workflow');
const { developerPublishing } = require('./workflows/skip-workflow/developerPublishing-non.workflow');
const { projectPublishing } = require('./workflows/skip-workflow/projectPublishing-non.workflow');
const { pgHostelPublishing } = require('./workflows/skip-workflow/pgHostelPublishing-non.workflow');

/**
 * Execute a workflow directly without Temporal
 * Routes to the appropriate non-Temporal workflow implementation
 * 
 * @param {string} workflowName - Name of the workflow to execute
 * @param {Object} workflowInput - Input data for the workflow
 * @returns {Promise<Object>} Workflow result
 */
async function executeWorkflowDirect(workflowName, workflowInput) {
    logger.info(`[Direct Execution] Starting workflow: ${workflowName}`);
    logger.debug(`[Direct Execution] Input:`, workflowInput);

    try {
        let result;

        // Route to appropriate workflow implementation
        switch (workflowName) {
            case 'partnerUserOnboarding':
                result = await partnerUserOnboarding(workflowInput);
                break;
            
            case 'partnerBusinessOnboarding':
                result = await partnerBusinessOnboarding(workflowInput);
                break;
            
            case 'propertyPublishing':
                result = await propertyPublishing(workflowInput);
                break;
            
            case 'developerPublishing':
                result = await developerPublishing(workflowInput);
                break;
            
            case 'projectPublishing':
                result = await projectPublishing(workflowInput);
                break;
            
            case 'pgHostelPublishing':
                result = await pgHostelPublishing(workflowInput);
                break;

            default:
                throw new Error(`Unknown workflow: ${workflowName}. Add a case for this workflow or create a ${workflowName}-non.workflow.js file.`);
        }

        logger.info(`[Direct Execution] Workflow completed: ${workflowName}`);
        return {
            success: true,
            workflowId: `direct-${workflowName}-${Date.now()}`,
            result
        };

    } catch (error) {
        logger.error(`[Direct Execution] Workflow failed: ${workflowName}`, error);
        throw error;
    }
}


module.exports = {
    executeWorkflowDirect
};
