/**
 * Workflow Helper - Simplified workflow execution for controllers
 * 
 * This helper provides easy access to workflows whether Temporal is enabled or not.
 * Controllers can use this instead of directly importing temporalClient.
 * 
 * @module utils/workflowHelper
 */

const { startWorkflow, executeWorkflow, isTemporalEnabled } = require('./temporalClient');
const { executeWorkflowDirect } = require('../temporal/workflowExecutor');
const logger = require('../config/winston.config');

/**
 * Execute a workflow asynchronously (fire-and-forget)
 * Returns immediately with workflow ID while processing continues
 * 
 * @param {string} workflowName - Name of the workflow
 * @param {Object} input - Workflow input data
 * @param {string} [workflowId] - Optional custom workflow ID
 * @returns {Promise<{workflowId: string, mode: string, result?: any}>}
 */
async function runWorkflowAsync(workflowName, input, workflowId = null) {
    const enabled = isTemporalEnabled();
    logger.info(`[Workflow Helper] Running ${workflowName} async (Temporal: ${enabled})`);
    
    return await startWorkflow(workflowName, input, workflowId);
}

/**
 * Execute a workflow synchronously (wait for result)
 * Blocks until workflow completes - use for quick operations only
 * 
 * @param {string} workflowName - Name of the workflow
 * @param {Object} input - Workflow input data
 * @param {string} [workflowId] - Optional custom workflow ID
 * @returns {Promise<any>} Workflow result
 */
async function runWorkflowSync(workflowName, input, workflowId = null) {
    const enabled = isTemporalEnabled();
    logger.info(`[Workflow Helper] Running ${workflowName} sync (Temporal: ${enabled})`);
    
    return await executeWorkflow(workflowName, input, workflowId);
}

/**
 * Execute a workflow directly (skip-workflow mode)
 * Forces direct execution regardless of TEMPORAL_ENABLED setting
 * Useful for testing or when you want to bypass Temporal
 * 
 * @param {string} workflowName - Name of the workflow
 * @param {Object} input - Workflow input data
 * @returns {Promise<any>} Workflow result
 */
async function runWorkflowDirect(workflowName, input) {
    logger.info(`[Workflow Helper] Running ${workflowName} in direct mode (forced)`);
    
    const result = await executeWorkflowDirect(workflowName, input);
    return result.result;
}

/**
 * Check if Temporal is enabled
 * @returns {boolean}
 */
function isUsingTemporal() {
    return isTemporalEnabled();
}

// Workflow name constants for easy access
const WORKFLOWS = {
    PARTNER_ONBOARDING: 'partnerUserOnboarding',
    PARTNER_BUSINESS_ONBOARDING: 'partnerBusinessOnboarding',
    PROPERTY_PUBLISHING: 'propertyPublishing',
    DEVELOPER_PUBLISHING: 'developerPublishing',
    PROJECT_PUBLISHING: 'projectPublishing',
    PG_HOSTEL_PUBLISHING: 'pgHostelPublishing',
};

module.exports = {
    // Main execution methods
    runWorkflowAsync,
    runWorkflowSync,
    runWorkflowDirect,
    
    // Utility
    isUsingTemporal,
    
    // Constants
    WORKFLOWS,
};
