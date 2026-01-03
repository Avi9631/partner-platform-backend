/**
 * Example Controller - Proper Workflow Pattern
 * 
 * This example shows how to properly use workflows with automatic fallback.
 * You can use either temporalClient directly or the workflowHelper for convenience.
 * 
 * @module controller/example
 */

// Option 1: Use temporalClient directly (original approach)
const { startWorkflow, executeWorkflow } = require('../utils/temporalClient');

// Option 2: Use workflowHelper for convenience (recommended)
const { 
    runWorkflowAsync, 
    runWorkflowSync, 
    runWorkflowDirect,
    WORKFLOWS,
    isUsingTemporal 
} = require('../utils/workflowHelper');

const logger = require('../config/winston.config');
const ApiResponse = require('../utils/ApiResponse'); // Adjust path as needed

/**
 * PATTERN 1: Fire-and-forget (Async processing) - Using workflowHelper
 * Use runWorkflowAsync() when you want to return immediately
 * The workflow continues in the background
 * 
 * Automatically uses skip-workflow files when TEMPORAL_ENABLED=false
 */
async function submitPropertyForPublishing(req, res) {
    const apiResponse = new ApiResponse(req, res);
    
    try {
        const { propertyId } = req.body;
        const userId = req.user.userId;
        
        // Validate input
        if (!propertyId) {
            return apiResponse
                .status(400)
                .withMessage("Property ID is required")
                .error();
        }
        
        // Start workflow - Returns immediately
        // Uses skip-workflow/*-non.workflow.js when Temporal is disabled
        const { workflowId, mode } = await runWorkflowAsync(
            WORKFLOWS.PROPERTY_PUBLISHING,  // Using constant
            {
                propertyId,
                userId,
                draftId: req.body.draftId
            },
            `publish-property-${propertyId}-${Date.now()}`
        );
        
        logger.info(`Property publishing started: ${workflowId} (mode: ${mode})`);
        
        // Return 202 Accepted - Processing continues async
        return apiResponse
            .status(202)
            .withMessage("Property submitted for publishing")
            .withData({
                workflowId,
                propertyId,
                status: 'processing',
                executionMode: mode, // 'temporal', 'direct', or 'direct-fallback'
                usingTemporal: isUsingTemporal()
            })
            .success();
            
    } catch (error) {
        logger.error('Failed to submit property for publishing:', error);
        return apiResponse
            .status(500)
            .withMessage("Failed to submit property")
            .withError(error.message)
            .error();
    }
}

/**
 * PATTERN 2: Synchronous execution (Wait for result) - Using workflowHelper
 * Use runWorkflowSync() when you need the result immediately
 * Be careful - this can be slow!
 * 
 * Automatically uses skip-workflow files when TEMPORAL_ENABLED=false
 */
async function submitPropertyAndWait(req, res) {
    const apiResponse = new ApiResponse(req, res);
    
    try {
        const { propertyId } = req.body;
        const userId = req.user.userId;
        
        if (!propertyId) {
            return apiResponse
                .status(400)
                .withMessage("Property ID is required")
                .error();
        }
        
        // Execute workflow and WAIT for completion
        // Uses skip-workflow/*-non.workflow.js when Temporal is disabled
        const { workflowId, result, mode } = await runWorkflowSync(
            WORKFLOWS.PROPERTY_PUBLISHING,  // Using constant
            {
                propertyId,
                userId,
                draftId: req.body.draftId
            },
            `publish-property-sync-${propertyId}-${Date.now()}`
        );
        
        logger.info(`Property published successfully: ${propertyId} (mode: ${mode})`);
        
        // Return 200 OK with result
        return apiResponse
            .status(200)
            .withMessage("Property published successfully")
            .withData({
                ...result,
                workflowId,
                executionMode: mode,
                usingTemporal: isUsingTemporal()
            })
            .success();
            
    } catch (error) {
        logger.error('Failed to publish property:', error);
        
        // Handle specific errors
        if (error.message.includes('Insufficient wallet balance')) {
            return apiResponse
                .status(402) // Payment Required
                .withMessage("Insufficient wallet balance")
                .withError(error.message)
                .error();
        }
        
        return apiResponse
            .status(500)
            .withMessage("Failed to publish property")
            .withError(error.message)
            .error();
    }
}

/**
 * PATTERN 3: Partner Onboarding (Async with validation) - Using workflowHelper
 * Best practice for complex workflows with file uploads
 * 
 * Automatically uses skip-workflow files when TEMPORAL_ENABLED=false
 */
async function onboardPartner(req, res) {
    const apiResponse = new ApiResponse(req, res);
    
    try {
        const userId = req.user.userId;
        const profileVideo = req.files?.profileVideo?.[0];
        
        // Input validation
        if (!profileVideo) {
            return apiResponse
                .status(400)
                .withMessage("Profile verification video is required")
                .error();
        }
        
        if (!req.body.firstName || !req.body.lastName) {
            return apiResponse
                .status(400)
                .withMessage("First name and last name are required")
                .error();
        }
        
        // Get current user for email
        const currentUser = await getUserById(userId); // Your user service
        
        // Start workflow - No try/catch needed!
        // Uses skip-workflow/*-non.workflow.js when Temporal is disabled
        const { workflowId, mode } = await runWorkflowAsync(
            WORKFLOWS.PARTNER_ONBOARDING,  // Using constant
            {
                userId,
                email: currentUser.email,
                profileData: {
                    firstName: req.body.firstName,
                    lastName: req.body.lastName,
                    phone: req.body.phone,
                    latitude: req.body.latitude,
                    longitude: req.body.longitude,
                    address: req.body.address,
                },
                videoBuffer: profileVideo.buffer,
                originalFilename: profileVideo.originalname,
                videoMimetype: profileVideo.mimetype,
                videoSize: profileVideo.size,
            },
            `partner-onboarding-${userId}-${Date.now()}`
        );
        
        logger.info(`Partner onboarding workflow started: ${workflowId} (mode: ${mode})`);
        
        // Return 202 Accepted
        return apiResponse
            .status(202)
            .withMessage("Onboarding profile submitted for verification")
            .withData({
                workflowId,
                status: 'processing',
                message: 'Your profile is being processed. You will receive an email once complete.',
                executionMode: mode,
                usingTemporal: isUsingTemporal()
            })
            .withMeta({
                userId,
                onboardingSubmitted: true,
                workflowStarted: true
            })
            .success();
            
    } catch (error) {
        logger.error('Partner onboarding failed:', error);
        
        // All errors bubble up from workflow executor
        // No need for manual fallback logic!
        return apiResponse
            .status(500)
            .withMessage("Failed to submit onboarding profile")
            .withError(error.message)
            .error();
    }
}

/**
 * PATTERN 4: Business Onboarding - Using workflowHelper
 * 
 * Automatically uses skip-workflow files when TEMPORAL_ENABLED=false
 */
async function onboardBusiness(req, res) {
    const apiResponse = new ApiResponse(req, res);
    
    try {
        const userId = req.user.userId;
        const ownerVideo = req.files?.ownerVideo?.[0];
        
        if (!ownerVideo) {
            return apiResponse
                .status(400)
                .withMessage("Owner verification video is required")
                .error();
        }
        
        const currentUser = await getUserById(userId);
        
        // Uses skip-workflow/*-non.workflow.js when Temporal is disabled
        const { workflowId, mode } = await runWorkflowAsync(
            WORKFLOWS.PARTNER_BUSINESS_ONBOARDING,  // Using constant
            {
                userId,
                email: currentUser.email,
                businessData: {
                    agencyName: req.body.agencyName,
                    agencyRegistrationNumber: req.body.agencyRegistrationNumber,
                    agencyAddress: req.body.agencyAddress,
                    agencyEmail: req.body.agencyEmail,
                    agencyPhone: req.body.agencyPhone,
                },
                ownerVideoBuffer: ownerVideo.buffer,
                originalFilename: ownerVideo.originalname,
                videoMimetype: ownerVideo.mimetype,
                videoSize: ownerVideo.size,
            },
            `business-onboarding-${userId}-${Date.now()}`
        );
        
        logger.info(`Business onboarding workflow started: ${workflowId} (mode: ${mode})`);
        
        return apiResponse
            .status(202)
            .withMessage("Business profile submitted for verification")
            .withData({
                workflowId,
                status: 'processing',
                executionMode: mode,
                usingTemporal: isUsingTemporal()
            })
            .success();
            
    } catch (error) {
        logger.error('Business onboarding failed:', error);
        return apiResponse
            .status(500)
            .withMessage("Failed to submit business profile")
            .withError(error.message)
            .error();
    }
}

/**
 * PATTERN 5: Force Direct Execution (Skip Temporal even if enabled)
 * Use runWorkflowDirect() when you explicitly want to bypass Temporal
 * Useful for testing or debugging
 */
async function publishPropertyDirect(req, res) {
    const apiResponse = new ApiResponse(req, res);
    
    try {
        const { propertyId } = req.body;
        const userId = req.user.userId;
        
        if (!propertyId) {
            return apiResponse
                .status(400)
                .withMessage("Property ID is required")
                .error();
        }
        
        // Force direct execution using skip-workflow files
        // Even if TEMPORAL_ENABLED=true
        const { workflowId, result } = await runWorkflowDirect(
            WORKFLOWS.PROPERTY_PUBLISHING,
            {
                propertyId,
                userId,
                draftId: req.body.draftId
            },
            `publish-property-direct-${propertyId}-${Date.now()}`
        );
        
        logger.info(`Property published directly: ${workflowId}`);
        
        return apiResponse
            .status(200)
            .withMessage("Property published successfully (direct execution)")
            .withData({
                ...result,
                workflowId,
                executionMode: 'direct-forced'
            })
            .success();
            
    } catch (error) {
        logger.error('Failed to publish property:', error);
        return apiResponse
            .status(500)
            .withMessage("Failed to publish property")
            .withError(error.message)
            .error();
    }
}

/**
 * Helper function (mock - replace with your actual user service)
 */
async function getUserById(userId) {
    // Your actual implementation
    return { userId, email: 'user@example.com' };
}

module.exports = {
    submitPropertyForPublishing,
    submitPropertyAndWait,
    onboardPartner,
    onboardBusiness,
    publishPropertyDirect, // New: force direct execution
};
