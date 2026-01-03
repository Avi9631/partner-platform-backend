/**
 * Workflow Helper - Simplified workflow execution for controllers
 *
 * This helper provides easy access to workflows whether Temporal is enabled or not.
 * Controllers can use this instead of directly importing temporalClient.
 *
 * @module utils/workflowHelper
 */


const { executeWorkflowDirect } = require("../workflowExecutor");
const logger = require("../../config/winston.config");

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
  logger.info(
    `[Workflow Helper] Running ${workflowName} in direct mode (forced)`
  );

  const result = await executeWorkflowDirect(workflowName, input);
  return result.result;
}

// Workflow name constants for easy access
const WORKFLOWS = {
  PARTNER_ONBOARDING: "partnerUserOnboarding",
  PARTNER_BUSINESS_ONBOARDING: "partnerBusinessOnboarding",
  PROPERTY_PUBLISHING: "propertyPublishing",
  DEVELOPER_PUBLISHING: "developerPublishing",
  PROJECT_PUBLISHING: "projectPublishing",
  PG_HOSTEL_PUBLISHING: "pgHostelPublishing",
};

module.exports = {
  runWorkflowDirect,

  // Utility

  // Constants
  WORKFLOWS,
};
