/**
 * Workflows Index
 * 
 * Central registry for all workflow definitions.
 * Import and export all workflows from their respective domain modules.
 * 
 * @module temporal/workflows
 */

const { partnerUserOnboarding } = require('./partnerOnboarding.workflow');
const { partnerBusinessOnboarding } = require('./partnerBusinessOnboarding.workflow');
const { developerPublishing } = require('./developerPublishing.workflow');
const { pgHostelPublishing } = require('./pgHostelPublishing.workflow');
const { propertyPublishing } = require('./propertyPublishing.workflow');
const { projectPublishing } = require('./projectPublishing.workflow');


/**
 * Export all workflows
 * 
 * These workflows are automatically discovered by the Temporal worker
 * when it loads the workflows path.
 */
module.exports = {

    partnerUserOnboarding,
    partnerBusinessOnboarding,
    developerPublishing,
    pgHostelPublishing,
    propertyPublishing,
    projectPublishing,

};
