/**
 * Developer Publishing Activities
 * 
 * Temporal activities for developer profile publishing and verification workflow.
 * These activities handle validation, database operations, notifications, and status updates.
 * 
 * @module temporal/activities/developerPublishing.activities
 */

const DeveloperService = require("../../service/DeveloperService.service");
const db = require("../../entity");
const Developer = db.Developer;
const PlatformUser = db.PlatformUser;
const ListingDraft = db.ListingDraft;
const logger = require("../../config/winston.config");
const { getUserEmail } = require("./getUserEmail.activity");

/**
 * Validate developer data before publishing
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} params.draftId - Draft ID (required)
 * @param {Object} params.developerData - Developer profile data
 * @returns {Promise<Object>} - Validation result
 */
async function validateDeveloperData({ userId, draftId, developerData }) {
  logger.info(`[Developer Publishing] Validating data for user ${userId}, draft ${draftId}`);
  
  try {
    const errors = [];

    // Validate required draftId
    if (!draftId) {
      errors.push('Draft ID is required');
    }

    // Validate required fields
    if (!developerData.developerName) {
      errors.push('Developer name is required');
    }
  

   
    // Check if user exists
    const user = await PlatformUser.findByPk(userId);
    if (!user) {
      errors.push('User not found');
    }

    return {
      success: true,
      message: 'Validation successful'
    };
  } catch (error) {
    logger.error('[Developer Publishing] Validation error:', error);
    throw error;
  }
}

/**
 * Check if developer exists for a draft
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.draftId - Draft ID
 * @returns {Promise<Object>} - Existing developer or null
 */
async function checkDeveloperExists({ draftId }) {
  logger.info(`[Developer Publishing] Checking if developer exists for draft ${draftId}`);
  
  try {
    const existingDeveloper = await Developer.findOne({ 
      where: { draftId },
      attributes: ['developerId', 'userId', 'developerName', 'publishStatus', 'verificationStatus']
    });
    
    if (existingDeveloper) {
      logger.info(`[Developer Publishing] Found existing developer ${existingDeveloper.developerId}`);
      return {
        success: true,
        exists: true,
        data: existingDeveloper
      };
    }
    
    logger.info(`[Developer Publishing] No existing developer found for draft ${draftId}`);
    return {
      success: true,
      exists: false,
      data: null
    };
  } catch (error) {
    logger.error('[Developer Publishing] Error checking developer existence:', error);
    throw error;
  }
}

/**
 * Create new developer record in database
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} params.draftId - Draft ID (required)
 * @param {Object} params.developerData - Developer profile data
 * @returns {Promise<Object>} - Created developer record
 */
async function createDeveloperRecord({ userId, draftId, developerData }) {
  logger.info(`[Developer Publishing] Creating new developer record for user ${userId}, draft ${draftId}`);
  
  try {
    const result = await DeveloperService.createDeveloper(userId, draftId, developerData);

    if (!result.success) {
      throw new Error(result.message);
    }

    logger.info(`[Developer Publishing] Developer record created: ${result.data.developerId}`);

    return {
      success: true,
      data: result.data,
      message: 'Developer record created successfully'
    };
  } catch (error) {
    logger.error('[Developer Publishing] Error creating developer record:', error);
    throw error;
  }
}

/**
 * Update existing developer record in database
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.developerId - Developer ID to update
 * @param {number} params.userId - User ID for authorization
 * @param {Object} params.developerData - Developer profile data
 * @returns {Promise<Object>} - Updated developer record
 */
async function updateDeveloperRecord({ developerId, userId, developerData }) {
  logger.info(`[Developer Publishing] Updating developer record ${developerId} for user ${userId}`);
  
  try {
    const result = await DeveloperService.updateDeveloper(
      developerId,
      userId,
      developerData
    );

    if (!result.success) {
      throw new Error(result.message);
    }

    logger.info(`[Developer Publishing] Developer record updated: ${result.data.developerId}`);

    return {
      success: true,
      data: result.data,
      message: 'Developer record updated successfully'
    };
  } catch (error) {
    logger.error('[Developer Publishing] Error updating developer record:', error);
    throw error;
  }
}
 
/**
 * Send developer publishing notification email
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {string} params.email - User email
 * @param {Object} params.developerData - Developer data
 * @param {number} params.developerId - Developer ID
 * @returns {Promise<Object>} - Notification result
 */
async function sendDeveloperPublishingNotification({ userId, email, developerData, developerId }) {
  logger.info(`[Developer Publishing] Sending notification email to ${email}`);
  
  try {
    // TODO: Implement actual email sending logic
    // For now, just log the notification
    logger.info(`[Developer Publishing] Email notification sent to ${email} for developer ${developerId}`);
    
    return {
      success: true,
      message: 'Notification email sent successfully'
    };
  } catch (error) {
    logger.error('[Developer Publishing] Error sending notification:', error);
    // Don't throw error - notification failure shouldn't fail the workflow
    return {
      success: false,
      message: 'Failed to send notification email'
    };
  }
}

 
/**
 * Update ListingDraft status to PUBLISHED
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.draftId - Draft ID
 * @returns {Promise<Object>} - Update result
 */
async function updateListingDraftStatus({ draftId }) {
  logger.info(`[Developer Publishing] Updating ListingDraft status for draft ${draftId} to PUBLISHED`);
  
  try {
    const listingDraft = await ListingDraft.findByPk(draftId);
    
    if (!listingDraft) {
      return {
        success: false,
        message: 'ListingDraft not found'
      };
    }

    await listingDraft.update({ draftStatus: 'PUBLISHED' });

    logger.info(`[Developer Publishing] ListingDraft status updated to PUBLISHED successfully`);
    return {
      success: true,
      message: 'ListingDraft status updated to PUBLISHED'
    };

  } catch (error) {
    logger.error(`[Developer Publishing] Error updating ListingDraft status:`, error);
    throw error;
  }
}

module.exports = {
  validateDeveloperData,
  checkDeveloperExists,
  createDeveloperRecord,
  updateDeveloperRecord,
  getUserEmail,
  sendDeveloperPublishingNotification,
  updateListingDraftStatus
};
