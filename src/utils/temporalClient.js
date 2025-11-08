const { Client } = require('@temporalio/client');
const logger = require('../config/winston.config');
const temporalConfig = require('../config/temporal.config');

let temporalClient = null;

/**
 * Initialize Temporal Client
 * Creates and returns a singleton Temporal client instance
 */
async function getTemporalClient() {
    if (temporalClient) {
        return temporalClient;
    }
    
    try {
        logger.info('Initializing Temporal Client...');
        
        temporalClient = new Client({
            connection: {
                address: temporalConfig.address,
            },
            namespace: temporalConfig.namespace,
        });
        
        logger.info(`Temporal Client initialized for namespace: ${temporalConfig.namespace}`);
        return temporalClient;
        
    } catch (error) {
        logger.error('Failed to initialize Temporal Client:', error);
        throw error;
    }
}

/**
 * Start a workflow execution
 * @param {string} workflowName - The name of the workflow to execute
 * @param {object} args - Arguments to pass to the workflow
 * @param {string} workflowId - Optional workflow ID (auto-generated if not provided)
 * @returns {Promise<object>} - Workflow handle
 */
async function startWorkflow(workflowName, args, workflowId = null) {
    try {
        const client = await getTemporalClient();
        
        const handle = await client.workflow.start(workflowName, {
            taskQueue: temporalConfig.taskQueue,
            args: [args],
            workflowId: workflowId || `${workflowName}-${Date.now()}`,
        });
        
        logger.info(`Workflow started: ${workflowName} (ID: ${handle.workflowId})`);
        
        return {
            workflowId: handle.workflowId,
            runId: handle.firstExecutionRunId,
            handle,
        };
        
    } catch (error) {
        logger.error(`Failed to start workflow ${workflowName}:`, error);
        throw error;
    }
}

/**
 * Execute a workflow and wait for result
 * @param {string} workflowName - The name of the workflow to execute
 * @param {object} args - Arguments to pass to the workflow
 * @param {string} workflowId - Optional workflow ID
 * @returns {Promise<any>} - Workflow result
 */
async function executeWorkflow(workflowName, args, workflowId = null) {
    try {
        const client = await getTemporalClient();
        
        const handle = await client.workflow.start(workflowName, {
            taskQueue: temporalConfig.taskQueue,
            args: [args],
            workflowId: workflowId || `${workflowName}-${Date.now()}`,
        });
        
        logger.info(`Executing workflow: ${workflowName} (ID: ${handle.workflowId})`);
        
        const result = await handle.result();
        
        logger.info(`Workflow completed: ${workflowName} (ID: ${handle.workflowId})`);
        
        return result;
        
    } catch (error) {
        logger.error(`Failed to execute workflow ${workflowName}:`, error);
        throw error;
    }
}

/**
 * Get workflow handle by ID
 * @param {string} workflowId - The workflow ID
 * @returns {Promise<object>} - Workflow handle
 */
async function getWorkflowHandle(workflowId) {
    try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(workflowId);
        return handle;
    } catch (error) {
        logger.error(`Failed to get workflow handle for ${workflowId}:`, error);
        throw error;
    }
}

/**
 * Cancel a workflow
 * @param {string} workflowId - The workflow ID to cancel
 */
async function cancelWorkflow(workflowId) {
    try {
        const handle = await getWorkflowHandle(workflowId);
        await handle.cancel();
        logger.info(`Workflow cancelled: ${workflowId}`);
    } catch (error) {
        logger.error(`Failed to cancel workflow ${workflowId}:`, error);
        throw error;
    }
}

/**
 * Query a workflow
 * @param {string} workflowId - The workflow ID
 * @param {string} queryType - The query type
 * @param {any} args - Query arguments
 */
async function queryWorkflow(workflowId, queryType, ...args) {
    try {
        const handle = await getWorkflowHandle(workflowId);
        const result = await handle.query(queryType, ...args);
        return result;
    } catch (error) {
        logger.error(`Failed to query workflow ${workflowId}:`, error);
        throw error;
    }
}

/**
 * Signal a workflow
 * @param {string} workflowId - The workflow ID
 * @param {string} signalName - The signal name
 * @param {any} args - Signal arguments
 */
async function signalWorkflow(workflowId, signalName, ...args) {
    try {
        const handle = await getWorkflowHandle(workflowId);
        await handle.signal(signalName, ...args);
        logger.info(`Signal sent to workflow ${workflowId}: ${signalName}`);
    } catch (error) {
        logger.error(`Failed to signal workflow ${workflowId}:`, error);
        throw error;
    }
}

module.exports = {
    getTemporalClient,
    startWorkflow,
    executeWorkflow,
    getWorkflowHandle,
    cancelWorkflow,
    queryWorkflow,
    signalWorkflow,
};
