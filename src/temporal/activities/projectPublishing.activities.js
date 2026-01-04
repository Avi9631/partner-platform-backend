/**
 * Project Publishing Activities
 * 
 * Temporal activities for project publishing and verification workflow.
 * These activities handle validation, database operations, notifications, and status updates.
 * 
 * @module temporal/activities/projectPublishing.activities
 */

const ProjectService = require("../../service/ProjectService.service");
const { debitFromWallet, getWalletBalance } = require("./wallet.activities");
const db = require("../../entity");
const Project = db.Project;
const PlatformUser = db.PlatformUser;
const ListingDraft = db.ListingDraft;
const logger = require("../../config/winston.config");

/**
 * Validate project data before publishing
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} [params.draftId] - Draft ID (optional)
 * @param {Object} params.projectData - Project data
 * @returns {Promise<Object>} - Validation result
 */
async function validateProjectData({ userId, draftId, projectData }) {
  logger.info(`[Project Publishing] Validating data for user ${userId}, draft ${draftId || 'none'}`);
  
  try {
    const errors = [];

    // Validate required fields - project name
    if (!projectData.projectName && !projectData.name) {
      errors.push('Project name is required');
    }

    // Validate project name length if provided
    const nameToCheck = projectData.projectName || projectData.name;
    if (nameToCheck && nameToCheck.length > 255) {
      errors.push('Project name must not exceed 255 characters');
    }

    // Validate status if provided
    const validStatuses = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];
    if (projectData.status && !validStatuses.includes(projectData.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    // Validate coordinates if provided
    if (projectData.coordinates) {
      if (projectData.coordinates.lat && (isNaN(projectData.coordinates.lat) || 
          projectData.coordinates.lat < -90 || projectData.coordinates.lat > 90)) {
        errors.push('Invalid latitude value (must be between -90 and 90)');
      }
      if (projectData.coordinates.lng && (isNaN(projectData.coordinates.lng) || 
          projectData.coordinates.lng < -180 || projectData.coordinates.lng > 180)) {
        errors.push('Invalid longitude value (must be between -180 and 180)');
      }
    } else if (projectData.lat || projectData.lng) {
      // Validate lat/lng directly
      if (projectData.lat && (isNaN(projectData.lat) || 
          projectData.lat < -90 || projectData.lat > 90)) {
        errors.push('Invalid latitude value (must be between -90 and 90)');
      }
      if (projectData.lng && (isNaN(projectData.lng) || 
          projectData.lng < -180 || projectData.lng > 180)) {
        errors.push('Invalid longitude value (must be between -180 and 180)');
      }
    }

    // Validate arrays if provided
    const arrayFields = ['amenities', 'features', 'images', 'videos', 'floorPlans'];
    
    arrayFields.forEach(field => {
      if (projectData[field] && !Array.isArray(projectData[field])) {
        errors.push(`${field} must be an array`);
      }
    });

    // Validate numeric fields if provided
    const numericFields = ['totalUnits', 'totalTowers', 'totalAcres'];
    numericFields.forEach(field => {
      if (projectData[field] && isNaN(parseFloat(projectData[field]))) {
        errors.push(`${field} must be a valid number`);
      }
    });

    // Check if user exists
    const user = await PlatformUser.findByPk(userId);
    if (!user) {
      errors.push('User not found');
    }

    let existingProject = null;

    // If draftId provided, validate draft
    if (draftId) {
      const draft = await ListingDraft.findOne({
        where: {
          draftId,
          userId,
          draftType: 'PROJECT'
        }
      });

      if (!draft) {
        errors.push('Draft not found or unauthorized');
      }

      // Check if project already exists for this draft
      existingProject = await Project.findOne({
        where: { draftId }
      });
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors
      };
    }

    return {
      success: true,
      existingProject
    };
  } catch (error) {
    logger.error('[Project Publishing] Validation error:', error);
    return {
      success: false,
      errors: [error.message || 'Validation failed']
    };
  }
}

/**
 * Create project record in database
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} [params.draftId] - Draft ID (optional)
 * @param {Object} params.projectData - Project data
 * @returns {Promise<Object>} - Result with created project
 */
async function createProjectRecord({ userId, draftId, projectData }) {
  logger.info(`[Project Publishing] Creating project record for user ${userId}`);
  
  try {
    const result = await ProjectService.createProject(userId, draftId, projectData);
    
    if (!result.success) {
      logger.error('[Project Publishing] Failed to create project:', result.message);
      return result;
    }

    logger.info(`[Project Publishing] Project created successfully: ${result.data.projectId}`);
    return result;
  } catch (error) {
    logger.error('[Project Publishing] Error creating project:', error);
    return {
      success: false,
      message: error.message || 'Failed to create project',
      statusCode: 500
    };
  }
}

/**
 * Update project record in database
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.projectId - Project ID
 * @param {number} params.userId - User ID
 * @param {Object} params.projectData - Updated project data
 * @returns {Promise<Object>} - Result with updated project
 */
async function updateProjectRecord({ projectId, userId, projectData }) {
  logger.info(`[Project Publishing] Updating project record ${projectId} for user ${userId}`);
  
  try {
    const result = await ProjectService.updateProject(projectId, userId, projectData);
    
    if (!result.success) {
      logger.error('[Project Publishing] Failed to update project:', result.message);
      return result;
    }

    logger.info(`[Project Publishing] Project updated successfully: ${projectId}`);
    return result;
  } catch (error) {
    logger.error('[Project Publishing] Error updating project:', error);
    return {
      success: false,
      message: error.message || 'Failed to update project',
      statusCode: 500
    };
  }
}

/**
 * Send project publishing notification to user
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} params.projectId - Project ID
 * @param {string} params.projectName - Project name
 * @param {boolean} params.isUpdate - Whether this is an update or new project
 * @returns {Promise<Object>} - Notification result
 */
async function sendProjectPublishingNotification({ userId, projectId, projectName, isUpdate }) {
  logger.info(`[Project Publishing] Sending notification to user ${userId} for project ${projectId}`);
  
  try {
    // Get user details
    const user = await PlatformUser.findByPk(userId);
    
    if (!user) {
      logger.warn(`[Project Publishing] User ${userId} not found for notification`);
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Prepare notification message
    const message = isUpdate
      ? `Your project "${projectName}" has been updated successfully.`
      : `Your project "${projectName}" has been published successfully and is now live!`;

    // Log notification (in production, integrate with email/SMS service)
    logger.info(`[Project Publishing] Notification to ${user.email}: ${message}`);

    // TODO: Integrate with actual notification service (email/SMS/push notification)
    // Example:
    // await emailService.send({
    //   to: user.email,
    //   subject: isUpdate ? 'Project Updated' : 'Project Published',
    //   body: message
    // });

    return {
      success: true,
      message: 'Notification sent successfully'
    };
  } catch (error) {
    logger.error('[Project Publishing] Error sending notification:', error);
    return {
      success: false,
      message: error.message || 'Failed to send notification'
    };
  }
}

/**
 * Update listing draft status after publishing
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.draftId - Draft ID
 * @param {string} params.status - New status (e.g., 'PUBLISHED')
 * @param {number} params.publishedId - Published project ID
 * @param {string} params.publishedType - Type of published entity (e.g., 'PROJECT')
 * @returns {Promise<Object>} - Update result
 */
async function updateListingDraftStatus({ draftId, status, publishedId, publishedType }) {
  logger.info(`[Project Publishing] Updating draft ${draftId} status to ${status}`);
  
  try {
    const draft = await ListingDraft.findByPk(draftId);
    
    if (!draft) {
      logger.warn(`[Project Publishing] Draft ${draftId} not found`);
      return {
        success: false,
        message: 'Draft not found'
      };
    }

    await draft.update({
      status,
      publishedId,
      publishedType
    });

    logger.info(`[Project Publishing] Draft ${draftId} status updated successfully`);
    
    return {
      success: true,
      message: 'Draft status updated successfully'
    };
  } catch (error) {
    logger.error('[Project Publishing] Error updating draft status:', error);
    return {
      success: false,
      message: error.message || 'Failed to update draft status'
    };
  }
}

/**
 * Deduct credits for project publishing
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} params.projectId - Project ID
 * @param {number} [params.amount=10] - Amount of credits to deduct (default: 10)
 * @returns {Promise<Object>} - Result of credit deduction
 */
async function deductPublishingCredits({ userId, projectId, amount = 10 }) {
  logger.info(`[Project Publishing] Deducting ${amount} credits from user ${userId} for project ${projectId}`);
  
  try {
    // Check if user has sufficient funds
    const balanceResult = await getWalletBalance({ userId });
    
    if (!balanceResult.success || balanceResult.balance < amount) {
      logger.error(`[Project Publishing] Insufficient credits for user ${userId}. Required: ${amount}, Available: ${balanceResult.balance || 0}`);
      return {
        success: false,
        message: `Insufficient credits. Required: ${amount}, Available: ${balanceResult.balance || 0}`
      };
    }

    // Deduct funds using wallet activity
    const deductResult = await debitFromWallet({
      userId,
      amount,
      reason: 'Project listing published',
      metadata: { projectId, type: 'PROJECT_PUBLISH' }
    });

    if (!deductResult.success) {
      logger.error(`[Project Publishing] Failed to deduct credits:`, deductResult.message);
      return {
        success: false,
        message: deductResult.message || 'Failed to deduct credits'
      };
    }

    logger.info(`[Project Publishing] Successfully deducted ${amount} credits from user ${userId}. New balance: ${deductResult.newBalance}`);
    
    return {
      success: true,
      message: `Successfully deducted ${amount} credits`,
      transaction: deductResult.transaction
    };
  } catch (error) {
    logger.error('[Project Publishing] Error deducting credits:', error);
    return {
      success: false,
      message: error.message || 'Failed to deduct credits'
    };
  }
}

module.exports = {
  validateProjectData,
  createProjectRecord,
  updateProjectRecord,
  sendProjectPublishingNotification,
  updateListingDraftStatus,
  deductPublishingCredits,
};
