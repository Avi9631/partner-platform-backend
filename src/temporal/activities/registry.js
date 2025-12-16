/**
 * Activities Index
 * 
 * Central registry for all activity implementations.
 * Import and export all activities from their respective domain modules.
 * 
 * @module temporal/activities
 */

// User activities
const userActivities = require('./user/user.activities');
const partnerOnboardingActivities = require('./user/partnerOnboarding.activities');
const partnerBusinessOnboardingActivities = require('./user/partnerBusinessOnboarding.activities');

// Developer activities
const developerPublishingActivities = require('./developer/developerPublishing.activities');

 
/**
 * Export all activities
 * 
 * All activities are exported as a flat object for easy registration
 * with the Temporal worker. Activities are namespaced by their domain
 * in separate files but exported together for worker configuration.
 */
module.exports = {
    // User activities
    ...userActivities,
    
    // Partner onboarding activities
    ...partnerOnboardingActivities,
    
    // Partner business onboarding activities
    ...partnerBusinessOnboardingActivities,
    
    // Developer publishing activities
    ...developerPublishingActivities,
 
};
