/**
 * PG/Colive/Hostel Publishing Activities
 * 
 * Temporal activities for PG/Colive/Hostel publishing and verification workflow.
 * These activities handle validation, database operations, notifications, and status updates.
 * 
 * @module temporal/activities/pgHostel/pgHostelPublishing.activities
 */

const PgColiveHostelService = require("../../../service/PgColiveHostelService.service");
const db = require("../../../entity");
const PgColiveHostel = db.PgColiveHostel;
const PlatformUser = db.PlatformUser;
const ListingDraft = db.ListingDraft;
const logger = require("../../../config/winston.config");

/**
 * Validate PG/Hostel data before publishing
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} params.draftId - Draft ID (required)
 * @param {Object} params.pgHostelData - PG/Hostel data
 * @returns {Promise<Object>} - Validation result
 */
async function validatePgHostelData({ userId, draftId, pgHostelData }) {
  logger.info(`[PG Hostel Publishing] Validating data for user ${userId}, draft ${draftId}`);
  
  try {
    const errors = [];

    // Validate required draftId
    if (!draftId) {
      errors.push('Draft ID is required');
    }

    // Validate required fields
    if (!pgHostelData.propertyName) {
      errors.push('Property name is required');
    }

    if (!pgHostelData.genderAllowed) {
      errors.push('Gender allowed is required');
    }

    // Validate coordinates
    if (pgHostelData.coordinates) {
      if (!pgHostelData.coordinates.lat || !pgHostelData.coordinates.lng) {
        errors.push('Invalid coordinates: both lat and lng are required');
      }
    }

    // Validate room types
    if (!pgHostelData.roomTypes || !Array.isArray(pgHostelData.roomTypes) || pgHostelData.roomTypes.length === 0) {
      errors.push('At least one room type is required');
    } else {
      // Validate each room type
      pgHostelData.roomTypes.forEach((roomType, index) => {
        if (!roomType.name) {
          errors.push(`Room type ${index + 1}: Name is required`);
        }
        if (!roomType.category) {
          errors.push(`Room type ${index + 1}: Category is required`);
        }
        if (!roomType.pricing || !Array.isArray(roomType.pricing) || roomType.pricing.length === 0) {
          errors.push(`Room type ${index + 1}: At least one pricing option is required`);
        }
        if (!roomType.availability) {
          errors.push(`Room type ${index + 1}: Availability information is required`);
        }
      });
    }

    // Validate year built (optional, but if provided must be valid)
    if (pgHostelData.yearBuilt) {
      const currentYear = new Date().getFullYear();
      const year = parseInt(pgHostelData.yearBuilt);
      if (isNaN(year) || year < 1900 || year > currentYear + 5) {
        errors.push('Invalid year built');
      }
    }

    // Check if user exists
    const user = await PlatformUser.findByPk(userId);
    if (!user) {
      errors.push('User not found');
    }

    // Check if this draft has already been published
    if (draftId) {
      const existingPgHostel = await PgColiveHostel.findOne({
        where: { draftId }
      });
      
      if (existingPgHostel) {
        errors.push('This draft has already been published. A draft can only be published once.');
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors
      };
    }

    logger.info(`[PG Hostel Publishing] Validation successful for user ${userId}`);
    return {
      success: true,
      message: 'PG/Hostel data validation passed'
    };

  } catch (error) {
    logger.error(`[PG Hostel Publishing] Validation error:`, error);
    throw error;
  }
}

/**
 * Create PG/Hostel record in database
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} params.draftId - Draft ID
 * @param {Object} params.pgHostelData - PG/Hostel data
 * @returns {Promise<Object>} - Creation result
 */
async function createPgHostelRecord({ userId, draftId, pgHostelData }) {
  logger.info(`[PG Hostel Publishing] Creating record for user ${userId}, draft ${draftId}`);
  
  try {
    const result = await PgColiveHostelService.createPgColiveHostel(
      userId,
      draftId,
      pgHostelData
    );

    if (!result.success) {
      logger.error(`[PG Hostel Publishing] Failed to create record:`, result);
      return result;
    }

    logger.info(`[PG Hostel Publishing] Record created successfully: ${result.data.pgHostelId}`);
    return {
      success: true,
      message: 'PG/Hostel record created successfully',
      data: {
        pgHostelId: result.data.pgHostelId,
        slug: result.data.slug,
        propertyName: result.data.propertyName
      }
    };

  } catch (error) {
    logger.error(`[PG Hostel Publishing] Error creating record:`, error);
    throw error;
  }
}

/**
 * Send notification to user about PG/Hostel publishing status
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {string} params.propertyName - Property name
 * @param {string} params.status - Status (success/failed)
 * @returns {Promise<Object>} - Notification result
 */
async function sendPgHostelPublishingNotification({ userId, propertyName, status }) {
  logger.info(`[PG Hostel Publishing] Sending notification to user ${userId}`);
  
  try {
    // TODO: Implement actual notification sending (email, SMS, in-app)
    // For now, just log the notification
    
    const notificationMessage = status === 'success' 
      ? `Your PG/Hostel "${propertyName}" has been successfully published and is pending review.`
      : `Failed to publish PG/Hostel "${propertyName}". Please contact support.`;

    logger.info(`[PG Hostel Publishing] Notification: ${notificationMessage}`);

    return {
      success: true,
      message: 'Notification sent successfully'
    };

  } catch (error) {
    logger.error(`[PG Hostel Publishing] Error sending notification:`, error);
    // Don't throw error, just log it - notification failure shouldn't fail the workflow
    return {
      success: false,
      message: 'Failed to send notification',
      error: error.message
    };
  }
}

/**
 * Update PG/Hostel verification status
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.pgHostelId - PG Hostel ID
 * @param {string} params.verificationStatus - Verification status
 * @returns {Promise<Object>} - Update result
 */
async function updatePgHostelVerificationStatus({ pgHostelId, verificationStatus }) {
  logger.info(`[PG Hostel Publishing] Updating verification status for ${pgHostelId} to ${verificationStatus}`);
  
  try {
    const pgHostel = await PgColiveHostel.findByPk(pgHostelId);
    
    if (!pgHostel) {
      return {
        success: false,
        message: 'PG/Hostel not found'
      };
    }

    await pgHostel.update({ verificationStatus });

    logger.info(`[PG Hostel Publishing] Verification status updated successfully`);
    return {
      success: true,
      message: 'Verification status updated successfully'
    };

  } catch (error) {
    logger.error(`[PG Hostel Publishing] Error updating verification status:`, error);
    throw error;
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
  logger.info(`[PG Hostel Publishing] Updating ListingDraft status for draft ${draftId} to PUBLISHED`);
  
  try {
    const listingDraft = await ListingDraft.findByPk(draftId);
    
    if (!listingDraft) {
      return {
        success: false,
        message: 'ListingDraft not found'
      };
    }

    await listingDraft.update({ draftStatus: 'PUBLISHED' });

    logger.info(`[PG Hostel Publishing] ListingDraft status updated to PUBLISHED successfully`);
    return {
      success: true,
      message: 'ListingDraft status updated to PUBLISHED'
    };

  } catch (error) {
    logger.error(`[PG Hostel Publishing] Error updating ListingDraft status:`, error);
    throw error;
  }
}

module.exports = {
  validatePgHostelData,
  createPgHostelRecord,
  sendPgHostelPublishingNotification,
  updatePgHostelVerificationStatus,
  updateListingDraftStatus
};
