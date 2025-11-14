/**
 * Workflows Index
 * 
 * Central registry for all workflow definitions.
 * Import and export all workflows from their respective domain modules.
 * 
 * @module temporal/workflows
 */

const { partnerUserOnboarding } = require('./user/partnerOnboarding.workflow');


/**
 * Export all workflows
 * 
 * These workflows are automatically discovered by the Temporal worker
 * when it loads the workflows path.
 */
module.exports = {

    partnerUserOnboarding,

};
