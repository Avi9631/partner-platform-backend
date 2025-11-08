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

// Payment activities
const paymentActivities = require('./payment/payment.activities');

// Listing activities
const listingActivities = require('./listing/listing.activities');

// Analytics activities
const analyticsActivities = require('./analytics/analytics.activities');

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
    
    // Payment activities
    ...paymentActivities,
    
    // Listing activities
    ...listingActivities,
    
    // Analytics activities
    ...analyticsActivities,
};
