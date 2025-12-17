const { getTemporalClient } = require("../utils/temporalClient.js");
const logger = require("../config/winston.config.js");

/**
 * Get workflow status and details using handle.describe()
 * @param {string} workflowId - Workflow ID
 * @returns {Promise<Object>} Workflow description
 */
async function getWorkflowStatus(workflowId) {
  if (!workflowId) {
    throw new Error("Workflow ID is required");
  }

  try {
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(workflowId);
    const description = await handle.describe();

    logger.info(`Retrieved workflow status for: ${workflowId}`);

    return {
      workflowId: description.workflowId,
      runId: description.runId,
      type: description.type,
      status: description.status,
      historyLength: description.historyLength,
      startTime: description.startTime,
      executionTime: description.executionTime,
      closeTime: description.closeTime,
      taskQueue: description.taskQueue,
      memo: description.memo,
      searchAttributes: description.searchAttributes,
    };
  } catch (error) {
    logger.error(`Failed to get workflow status for ${workflowId}:`, error);
    throw error;
  }
}

/**
 * Get workflow result using handle.result()
 * @param {string} workflowId - Workflow ID
 * @returns {Promise<any>} Workflow result
 */
async function getWorkflowResult(workflowId) {
  if (!workflowId) {
    throw new Error("Workflow ID is required");
  }

  try {
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(workflowId);
    const result = await handle.result();

    logger.info(`Retrieved workflow result for: ${workflowId}`);
    return result;
  } catch (error) {
    logger.error(`Failed to get workflow result for ${workflowId}:`, error);
    throw error;
  }
}

/**
 * Query workflow for live data using handle.query()
 * @param {string} workflowId - Workflow ID
 * @param {string} queryType - Query name/type
 * @param {any} queryArgs - Query arguments
 * @returns {Promise<any>} Query result
 */
async function queryWorkflow(workflowId, queryType, queryArgs = {}) {
  if (!workflowId) {
    throw new Error("Workflow ID is required");
  }
  if (!queryType) {
    throw new Error("Query type is required");
  }

  try {
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(workflowId);
    const result = await handle.query(queryType, queryArgs);

    logger.info(`Queried workflow ${workflowId} with query type: ${queryType}`);
    return result;
  } catch (error) {
    logger.error(`Failed to query workflow ${workflowId} with query ${queryType}:`, error);
    throw error;
  }
}

/**
 * List workflows with optional filters using client.workflow.list()
 * @param {Object} options - List options
 * @param {string} options.query - Temporal query string (e.g., "WorkflowType='MyWorkflow'")
 * @param {number} options.pageSize - Number of results per page (default: 10)
 * @returns {Promise<Object>} List of workflows
 */
async function listWorkflows(options = {}) {
  try {
    const client = await getTemporalClient();
    
    const listOptions = {
      pageSize: options.pageSize || 10,
    };

    if (options.query) {
      listOptions.query = options.query;
    }

    const workflows = [];
    for await (const workflow of client.workflow.list(listOptions)) {
      workflows.push({
        workflowId: workflow.workflowId,
        runId: workflow.runId,
        type: workflow.type,
        status: workflow.status,
        startTime: workflow.startTime,
        executionTime: workflow.executionTime,
        closeTime: workflow.closeTime,
        taskQueue: workflow.taskQueue,
        historyLength: workflow.historyLength,
        memo: workflow.memo,
        searchAttributes: workflow.searchAttributes,
      });

      // Limit to prevent memory issues
      if (workflows.length >= (options.maxResults || 100)) {
        break;
      }
    }

    logger.info(`Listed ${workflows.length} workflows`);

    return {
      workflows,
      count: workflows.length,
    };
  } catch (error) {
    logger.error("Failed to list workflows:", error);
    throw error;
  }
}

/**
 * Signal a workflow using handle.signal()
 * @param {string} workflowId - Workflow ID
 * @param {string} signalName - Signal name
 * @param {any} signalArgs - Signal arguments
 * @returns {Promise<void>}
 */
async function signalWorkflow(workflowId, signalName, signalArgs = {}) {
  if (!workflowId) {
    throw new Error("Workflow ID is required");
  }
  if (!signalName) {
    throw new Error("Signal name is required");
  }

  try {
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal(signalName, signalArgs);

    logger.info(`Sent signal '${signalName}' to workflow ${workflowId}`);
  } catch (error) {
    logger.error(`Failed to signal workflow ${workflowId} with signal ${signalName}:`, error);
    throw error;
  }
}

/**
 * Cancel a workflow using handle.cancel()
 * @param {string} workflowId - Workflow ID
 * @returns {Promise<void>}
 */
async function cancelWorkflow(workflowId) {
  if (!workflowId) {
    throw new Error("Workflow ID is required");
  }

  try {
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(workflowId);
    await handle.cancel();

    logger.info(`Cancelled workflow: ${workflowId}`);
  } catch (error) {
    logger.error(`Failed to cancel workflow ${workflowId}:`, error);
    throw error;
  }
}

/**
 * Terminate a workflow using handle.terminate()
 * @param {string} workflowId - Workflow ID
 * @param {string} reason - Termination reason
 * @returns {Promise<void>}
 */
async function terminateWorkflow(workflowId, reason = "Manual termination") {
  if (!workflowId) {
    throw new Error("Workflow ID is required");
  }

  try {
    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(workflowId);
    await handle.terminate(reason);

    logger.info(`Terminated workflow ${workflowId}: ${reason}`);
  } catch (error) {
    logger.error(`Failed to terminate workflow ${workflowId}:`, error);
    throw error;
  }
}

module.exports = {
  getWorkflowStatus,
  getWorkflowResult,
  queryWorkflow,
  listWorkflows,
  signalWorkflow,
  cancelWorkflow,
  terminateWorkflow,
};
