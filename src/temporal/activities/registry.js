/**
 * Activities Index
 * 
 * Central registry for all activity implementations.
 * Import and export all activities from their respective domain modules.
 * 
 * @module temporal/activities
 */

// User activities
const userActivities = require('./user.activities');
const partnerOnboardingActivities = require('./partnerOnboarding.activities');
const partnerBusinessOnboardingActivities = require('./partnerBusinessOnboarding.activities');

// Wallet activities
const walletActivities = require('./wallet.activities');

// Developer activities
const developerPublishingActivities = require('./developerPublishing.activities');

// PG/Colive/Hostel activities
const pgHostelPublishingActivities = require('./pgHostelPublishing.activities');

// Property activities
const propertyPublishingActivities = require('./propertyPublishing.activities');

// Project activities
const projectPublishingActivities = require('./projectPublishing.activities');

 
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
    
    // Wallet activities
    ...walletActivities,
    
    // Developer publishing activities
    ...developerPublishingActivities,
    
    // PG/Colive/Hostel publishing activities
    ...pgHostelPublishingActivities,
    
    // Property publishing activities
    ...propertyPublishingActivities,
    
    // Project publishing activities
    ...projectPublishingActivities,
 
};
