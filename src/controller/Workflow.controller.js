const logger = require("../config/winston.config.js");
const WorkflowService = require("../service/WorkflowService.service.js");
const { ApiResponse } = require("../utils/responseFormatter.js");

/**
 * Get workflow status and details using handle.describe()
 * @route GET /api/workflow/:workflowId/status
 */
async function getWorkflowStatus(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const { workflowId } = req.params;

    if (!workflowId) {
      return apiResponse
        .status(400)
        .withMessage("Workflow ID is required")
        .withError("Workflow ID is required", "MISSING_WORKFLOW_ID", "getWorkflowStatus")
        .error();
    }

    const status = await WorkflowService.getWorkflowStatus(workflowId);

    apiResponse
      .status(200)
      .withMessage("Workflow status retrieved successfully")
      .withData({ workflow: status })
      .withMeta({
        workflowId: workflowId,
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while fetching workflow status:`, err.message);
    apiResponse
      .status(err.code === "TEMPORAL_DISABLED" ? 503 : 500)
      .withMessage(err.message || "Failed to fetch workflow status")
      .withError(err.message, err.code || "GET_WORKFLOW_STATUS_ERROR", "getWorkflowStatus")
      .withMeta({
        workflowId: req.params?.workflowId,
      })
      .error();
  }
}

/**
 * Get workflow result using handle.result()
 * @route GET /api/workflow/:workflowId/result
 */
async function getWorkflowResult(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const { workflowId } = req.params;

    if (!workflowId) {
      return apiResponse
        .status(400)
        .withMessage("Workflow ID is required")
        .withError("Workflow ID is required", "MISSING_WORKFLOW_ID", "getWorkflowResult")
        .error();
    }

    const result = await WorkflowService.getWorkflowResult(workflowId);

    apiResponse
      .status(200)
      .withMessage("Workflow result retrieved successfully")
      .withData({ result })
      .withMeta({
        workflowId: workflowId,
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while fetching workflow result:`, err.message);
    apiResponse
      .status(err.code === "TEMPORAL_DISABLED" ? 503 : 500)
      .withMessage(err.message || "Failed to fetch workflow result")
      .withError(err.message, err.code || "GET_WORKFLOW_RESULT_ERROR", "getWorkflowResult")
      .withMeta({
        workflowId: req.params?.workflowId,
      })
      .error();
  }
}

/**
 * Query workflow for live data using handle.query()
 * @route POST /api/workflow/:workflowId/query
 * @body {queryType: string, queryArgs?: any}
 */
async function queryWorkflow(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const { workflowId } = req.params;
    const { queryType, queryArgs } = req.body;

    if (!workflowId) {
      return apiResponse
        .status(400)
        .withMessage("Workflow ID is required")
        .withError("Workflow ID is required", "MISSING_WORKFLOW_ID", "queryWorkflow")
        .error();
    }

    if (!queryType) {
      return apiResponse
        .status(400)
        .withMessage("Query type is required")
        .withError("Query type is required", "MISSING_QUERY_TYPE", "queryWorkflow")
        .error();
    }

    const result = await WorkflowService.queryWorkflow(workflowId, queryType, queryArgs);

    apiResponse
      .status(200)
      .withMessage("Workflow query executed successfully")
      .withData({ result })
      .withMeta({
        workflowId: workflowId,
        queryType: queryType,
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while querying workflow:`, err.message);
    apiResponse
      .status(err.code === "TEMPORAL_DISABLED" ? 503 : 500)
      .withMessage(err.message || "Failed to query workflow")
      .withError(err.message, err.code || "QUERY_WORKFLOW_ERROR", "queryWorkflow")
      .withMeta({
        workflowId: req.params?.workflowId,
      })
      .error();
  }
}

/**
 * List workflows with filters using client.workflow.list()
 * @route GET /api/workflow/list
 * @query {query?: string, pageSize?: number, maxResults?: number}
 */
async function listWorkflows(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const { query, pageSize, maxResults } = req.query;

    const options = {
      query: query || undefined,
      pageSize: pageSize ? parseInt(pageSize) : 10,
      maxResults: maxResults ? parseInt(maxResults) : 100,
    };

    const result = await WorkflowService.listWorkflows(options);

    apiResponse
      .status(200)
      .withMessage("Workflows listed successfully")
      .withData(result)
      .withMeta({
        query: query || "all",
        pageSize: options.pageSize,
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while listing workflows:`, err.message);
    apiResponse
      .status(err.code === "TEMPORAL_DISABLED" ? 503 : 500)
      .withMessage(err.message || "Failed to list workflows")
      .withError(err.message, err.code || "LIST_WORKFLOWS_ERROR", "listWorkflows")
      .error();
  }
}

/**
 * Signal a workflow using handle.signal()
 * @route POST /api/workflow/:workflowId/signal
 * @body {signalName: string, signalArgs?: any}
 */
async function signalWorkflow(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const { workflowId } = req.params;
    const { signalName, signalArgs } = req.body;

    if (!workflowId) {
      return apiResponse
        .status(400)
        .withMessage("Workflow ID is required")
        .withError("Workflow ID is required", "MISSING_WORKFLOW_ID", "signalWorkflow")
        .error();
    }

    if (!signalName) {
      return apiResponse
        .status(400)
        .withMessage("Signal name is required")
        .withError("Signal name is required", "MISSING_SIGNAL_NAME", "signalWorkflow")
        .error();
    }

    await WorkflowService.signalWorkflow(workflowId, signalName, signalArgs);

    apiResponse
      .status(200)
      .withMessage("Workflow signal sent successfully")
      .withMeta({
        workflowId: workflowId,
        signalName: signalName,
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while signaling workflow:`, err.message);
    apiResponse
      .status(err.code === "TEMPORAL_DISABLED" ? 503 : 500)
      .withMessage(err.message || "Failed to signal workflow")
      .withError(err.message, err.code || "SIGNAL_WORKFLOW_ERROR", "signalWorkflow")
      .withMeta({
        workflowId: req.params?.workflowId,
      })
      .error();
  }
}

/**
 * Cancel a workflow using handle.cancel()
 * @route POST /api/workflow/:workflowId/cancel
 */
async function cancelWorkflow(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const { workflowId } = req.params;

    if (!workflowId) {
      return apiResponse
        .status(400)
        .withMessage("Workflow ID is required")
        .withError("Workflow ID is required", "MISSING_WORKFLOW_ID", "cancelWorkflow")
        .error();
    }

    await WorkflowService.cancelWorkflow(workflowId);

    apiResponse
      .status(200)
      .withMessage("Workflow cancelled successfully")
      .withMeta({
        workflowId: workflowId,
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while cancelling workflow:`, err.message);
    apiResponse
      .status(err.code === "TEMPORAL_DISABLED" ? 503 : 500)
      .withMessage(err.message || "Failed to cancel workflow")
      .withError(err.message, err.code || "CANCEL_WORKFLOW_ERROR", "cancelWorkflow")
      .withMeta({
        workflowId: req.params?.workflowId,
      })
      .error();
  }
}

/**
 * Terminate a workflow using handle.terminate()
 * @route POST /api/workflow/:workflowId/terminate
 * @body {reason?: string}
 */
async function terminateWorkflow(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const { workflowId } = req.params;
    const { reason } = req.body;

    if (!workflowId) {
      return apiResponse
        .status(400)
        .withMessage("Workflow ID is required")
        .withError("Workflow ID is required", "MISSING_WORKFLOW_ID", "terminateWorkflow")
        .error();
    }

    await WorkflowService.terminateWorkflow(workflowId, reason);

    apiResponse
      .status(200)
      .withMessage("Workflow terminated successfully")
      .withMeta({
        workflowId: workflowId,
        reason: reason || "Manual termination",
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while terminating workflow:`, err.message);
    apiResponse
      .status(err.code === "TEMPORAL_DISABLED" ? 503 : 500)
      .withMessage(err.message || "Failed to terminate workflow")
      .withError(err.message, err.code || "TERMINATE_WORKFLOW_ERROR", "terminateWorkflow")
      .withMeta({
        workflowId: req.params?.workflowId,
      })
      .error();
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
