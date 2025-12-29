/**
 * Workflows Index
 * 
 * Central registry for all workflow definitions.
 * Import and export all workflows from their respective domain modules.
 * 
 * @module temporal/workflows
 */

const { partnerUserOnboarding } = require('./user/partnerOnboarding.workflow');
const { partnerBusinessOnboarding } = require('./user/partnerBusinessOnboarding.workflow');
const { developerPublishing } = require('./developer/developerPublishing.workflow');
const { pgHostelPublishing } = require('./pgHostel/pgHostelPublishing.workflow');
const { propertyPublishing } = require('./property/propertyPublishing.workflow');
const { projectPublishing } = require('./project/projectPublishing.workflow');


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
