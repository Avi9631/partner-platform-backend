/**
 * User Onboarding Workflow
 * 
 * Handles the complete user onboarding process including welcome emails,
 * profile setup, and initial configuration.
 * 
 * @module temporal/workflows/user/onboarding.workflow
 */

const { proxyActivities } = require('@temporalio/workflow');
const { ACTIVITY_OPTIONS } = require('../../config/constants');

/** @typedef {import('../../types').UserData} UserData */
/** @typedef {import('../../types').WorkflowResult} WorkflowResult */

// Proxy user activities
const {
    sendEmail,
    processNotification,
    updateUserStatus,
    sendWelcomePackage,
} = proxyActivities(ACTIVITY_OPTIONS.notification);

/**
 * User Onboarding Workflow
 * 
 * Orchestrates the new user onboarding process with multiple touchpoints.
 * 
 * @param {UserData} userData - User data for onboarding
 * @returns {Promise<WorkflowResult>} - Onboarding result
 * 
 * @example
 * await executeWorkflow('userOnboardingWorkflow', {
 *   userId: 'user123',
 *   email: 'newuser@example.com',
 *   name: 'John Doe'
 * });
 */
async function userOnboardingWorkflow(userData) {
    const { userId, email, name } = userData;
    
    console.log(`[Onboarding Workflow] Starting for user ${userId}`);
    
    try {
        // Step 1: Update user status to onboarding
        await updateUserStatus({
            userId,
            status: 'onboarding',
        });
        
        console.log(`[Onboarding Workflow] User status updated to onboarding`);
        
        // Step 2: Send welcome package (welcome email + initial setup info)
        await sendWelcomePackage({
            userId,
            email,
            name,
        });
        
        console.log(`[Onboarding Workflow] Welcome package sent`);
        
        // Step 3: Send onboarding started notification
        await processNotification({
            userId,
            type: 'onboarding_started',
            status: 'in_progress',
        });
        
        console.log(`[Onboarding Workflow] Onboarding notification sent`);
        
        // Step 4: Update user status to active
        await updateUserStatus({
            userId,
            status: 'active',
        });
        
        console.log(`[Onboarding Workflow] User status updated to active`);
        
        // Step 5: Send onboarding completion notification
        await sendEmail({
            to: email,
            subject: 'Welcome to Partner Platform - Setup Complete!',
            body: `
                <h1>Welcome ${name}!</h1>
                <p>Your account setup is complete. You can now start using all features of Partner Platform.</p>
                <p>If you need any help, our support team is here for you 24/7.</p>
            `,
        });
        
        return {
            success: true,
            userId,
            message: 'User onboarding completed successfully',
        };
        
    } catch (error) {
        console.error(`[Onboarding Workflow] Failed for user ${userId}:`, error);
        
        // Update user status to indicate onboarding failure
        await updateUserStatus({
            userId,
            status: 'onboarding_failed',
        });
        
        throw error;
    }
}

module.exports = {
    userOnboardingWorkflow,
};
