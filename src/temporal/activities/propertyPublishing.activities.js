/**
 * Property Publishing Activities
 * 
 * Temporal activities for property publishing and verification workflow.
 * These activities handle validation, database operations, notifications, and status updates.
 * 
 * @module temporal/activities/propertyPublishing.activities
 */

const PropertyService = require("../../service/PropertyService.service");
const { debitFromWallet, getWalletBalance } = require("./wallet.activities");
const db = require("../../entity");
const Property = db.Property;
const PlatformUser = db.PlatformUser;
const ListingDraft = db.ListingDraft;
const logger = require("../../config/winston.config");

/**
 * Fetch property data from ListingDraft entity
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} params.draftId - Draft ID
 * @returns {Promise<Object>} - Result with property data from draft
 */
async function fetchListingDraftData({ userId, draftId }) {
  logger.info(`[Property Publishing] Fetching draft data for draft ${draftId}, user ${userId}`);
  
  try {
    // Fetch the draft
    const draft = await ListingDraft.findOne({
      where: {
        draftId,
        userId,
        draftType: 'PROPERTY'
      }
    });

    if (!draft) {
      logger.error(`[Property Publishing] Draft not found or unauthorized - draftId: ${draftId}, userId: ${userId}`);
      return {
        success: false,
        message: 'Draft not found or unauthorized'
      };
    }

    // Check if draft has data
    if (!draft.draftData) {
      logger.error(`[Property Publishing] Draft ${draftId} has no data`);
      return {
        success: false,
        message: 'Draft has no property data'
      };
    }

    // Check draft status
    if (draft.draftStatus === 'PUBLISHED') {
      logger.warn(`[Property Publishing] Draft ${draftId} is already published`);
      // Allow re-publishing for updates
    }

    logger.info(`[Property Publishing] Draft data fetched successfully for draft ${draftId}`);
    
    return {
      success: true,
      data: draft.draftData
    };
  } catch (error) {
    logger.error('[Property Publishing] Error fetching draft data:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch draft data'
    };
  }
}

/**
 * Validate property data before publishing
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} params.draftId - Draft ID (required)
 * @param {Object} params.propertyData - Property data
 * @returns {Promise<Object>} - Validation result
 */
async function validatePropertyData({ userId, draftId, propertyData }) {
  logger.info(`[Property Publishing] Validating data for user ${userId}, draft ${draftId}`);
  
  try {
    const errors = [];

    // Validate required draftId
    if (!draftId) {
      errors.push('Draft ID is required');
    }

    // Validate required fields - at least one name field
    if (!propertyData.propertyName && !propertyData.title && !propertyData.customPropertyName) {
      errors.push('Property name, title, or custom property name is required');
    }

    // Validate property name length if provided
    const nameToCheck = propertyData.propertyName || propertyData.title || propertyData.customPropertyName;
    if (nameToCheck && nameToCheck.length > 255) {
      errors.push('Property name must not exceed 255 characters');
    }

    // Validate title length if provided
    if (propertyData.title && propertyData.title.length > 500) {
      errors.push('Title must not exceed 500 characters');
    }

    // Validate projectId if provided
    if (propertyData.projectId && isNaN(parseInt(propertyData.projectId))) {
      errors.push('Project ID must be a valid number');
    }

    // Validate status if provided
    const validStatuses = ['ACTIVE', 'INACTIVE', 'ARCHIVED'];
    if (propertyData.status && !validStatuses.includes(propertyData.status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    // Validate listingType if provided
    const validListingTypes = ['sale', 'rent', 'lease'];
    if (propertyData.listingType && !validListingTypes.includes(propertyData.listingType)) {
      errors.push(`Listing type must be one of: ${validListingTypes.join(', ')}`);
    }

    // Validate coordinates if provided
    if (propertyData.coordinates) {
      if (propertyData.coordinates.lat && (isNaN(propertyData.coordinates.lat) || 
          propertyData.coordinates.lat < -90 || propertyData.coordinates.lat > 90)) {
        errors.push('Invalid latitude value (must be between -90 and 90)');
      }
      if (propertyData.coordinates.lng && (isNaN(propertyData.coordinates.lng) || 
          propertyData.coordinates.lng < -180 || propertyData.coordinates.lng > 180)) {
        errors.push('Invalid longitude value (must be between -180 and 180)');
      }
    }

    // Validate pricing array if provided
    if (propertyData.pricing && !Array.isArray(propertyData.pricing)) {
      errors.push('Pricing must be an array');
    }

    // Validate arrays if provided
    const arrayFields = ['features', 'amenities', 'flooringTypes', 'smartHomeDevices', 
                        'maintenanceIncludes', 'reraIds', 'documents', 'mediaData', 
                        'propertyPlans', 'areaConfig'];
    
    arrayFields.forEach(field => {
      if (propertyData[field] && !Array.isArray(propertyData[field])) {
        errors.push(`${field} must be an array`);
      }
    });

    // Check if user exists
    const user = await PlatformUser.findByPk(userId);
    if (!user) {
      errors.push('User not found');
    }

    // Check if draft exists and belongs to user
    const draft = await ListingDraft.findOne({
      where: {
        draftId,
        userId,
        draftType: 'PROPERTY'
      }
    });

    if (!draft) {
      errors.push('Draft not found or unauthorized');
    }

    // Check if property already exists for this draft
    const existingProperty = await Property.findOne({
      where: { draftId }
    });

    if (errors.length > 0) {
      return {
        success: false,
        errors
      };
    }

    return {
      success: true,
      existingProperty
    };
  } catch (error) {
    logger.error('[Property Publishing] Validation error:', error);
    return {
      success: false,
      errors: [error.message || 'Validation failed']
    };
  }
}

/**
 * Create property record in database
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} params.draftId - Draft ID
 * @param {Object} params.propertyData - Property data
 * @returns {Promise<Object>} - Result with created property
 */
async function createPropertyRecord({ userId, draftId, propertyData }) {
  logger.info(`[Property Publishing] Creating property record for user ${userId}`);
  
  try {
    const result = await PropertyService.createProperty(userId, draftId, propertyData);
    
    if (!result.success) {
      logger.error('[Property Publishing] Failed to create property:', result.message);
      return {
        success: false,
        message: result.message
      };
    }

    logger.info(`[Property Publishing] Property created: ${result.data.propertyId}`);
    
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    logger.error('[Property Publishing] Error creating property:', error);
    return {
      success: false,
      message: error.message || 'Failed to create property'
    };
  }
}

/**
 * Update property record in database
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.propertyId - Property ID
 * @param {number} params.userId - User ID
 * @param {Object} params.propertyData - Property data to update
 * @returns {Promise<Object>} - Result with updated property
 */
async function updatePropertyRecord({ propertyId, userId, propertyData }) {
  logger.info(`[Property Publishing] Updating property ${propertyId} for user ${userId}`);
  
  try {
    const result = await PropertyService.updateProperty(propertyId, userId, propertyData);
    
    if (!result.success) {
      logger.error('[Property Publishing] Failed to update property:', result.message);
      return {
        success: false,
        message: result.message
      };
    }

    logger.info(`[Property Publishing] Property updated: ${propertyId}`);
    
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    logger.error('[Property Publishing] Error updating property:', error);
    return {
      success: false,
      message: error.message || 'Failed to update property'
    };
  }
}

/**
 * Send property publishing notification to user
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} params.propertyId - Property ID
 * @param {string} params.propertyName - Property name
 * @param {boolean} params.isUpdate - Whether this is an update
 * @returns {Promise<Object>} - Result
 */
async function sendPropertyPublishingNotification({ userId, propertyId, propertyName, isUpdate }) {
  logger.info(`[Property Publishing] Sending notification to user ${userId} for property ${propertyId}`);
  
  try {
    // Get user details
    const user = await PlatformUser.findByPk(userId);
    
    if (!user) {
      logger.warn(`[Property Publishing] User ${userId} not found for notification`);
      return {
        success: false,
        message: 'User not found'
      };
    }

    // TODO: Implement actual notification logic (email, push notification, etc.)
    // For now, just log the notification
    logger.info(`[Property Publishing] Notification sent to ${user.email}:`, {
      propertyId,
      propertyName,
      isUpdate,
      message: `Your property "${propertyName}" has been ${isUpdate ? 'updated' : 'published'} successfully.`
    });

    return {
      success: true,
      message: 'Notification sent successfully'
    };
  } catch (error) {
    logger.error('[Property Publishing] Error sending notification:', error);
    return {
      success: false,
      message: error.message || 'Failed to send notification'
    };
  }
}

/**
 * Update listing draft status
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.draftId - Draft ID
 * @param {string} params.status - New status
 * @returns {Promise<Object>} - Result
 */
async function updateListingDraftStatus({ draftId, status }) {
  logger.info(`[Property Publishing] Updating draft ${draftId} status to ${status}`);
  
  try {
    const draft = await ListingDraft.findByPk(draftId);
    
    if (!draft) {
      logger.warn(`[Property Publishing] Draft ${draftId} not found`);
      return {
        success: false,
        message: 'Draft not found'
      };
    }

    await draft.update({ status });
    
    logger.info(`[Property Publishing] Draft status updated successfully`);
    
    return {
      success: true,
      message: 'Draft status updated'
    };
  } catch (error) {
    logger.error('[Property Publishing] Error updating draft status:', error);
    return {
      success: false,
      message: error.message || 'Failed to update draft status'
    };
  }
}

/**
 * Deduct credits for property publishing
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} params.propertyId - Property ID
 * @param {number} [params.amount=10] - Amount of credits to deduct (default: 10)
 * @returns {Promise<Object>} - Result of credit deduction
 */
async function deductPublishingCredits({ userId, propertyId, amount = 10 }) {
  logger.info(`[Property Publishing] Deducting ${amount} credits from user ${userId} for property ${propertyId}`);
  
  try {
    // Check if user has sufficient funds
    const balanceResult = await getWalletBalance({ userId });
    
    if (!balanceResult.success || balanceResult.balance < amount) {
      logger.error(`[Property Publishing] Insufficient credits for user ${userId}. Required: ${amount}, Available: ${balanceResult.balance || 0}`);
      return {
        success: false,
        message: `Insufficient credits. Required: ${amount}, Available: ${balanceResult.balance || 0}`
      };
    }

    // Deduct funds using wallet activity
    const deductResult = await debitFromWallet({
      userId,
      amount,
      reason: 'Property listing published',
      metadata: { propertyId, type: 'PROPERTY_PUBLISH' }
    });

    if (!deductResult.success) {
      logger.error(`[Property Publishing] Failed to deduct credits:`, deductResult.message);
      return {
        success: false,
        message: deductResult.message || 'Failed to deduct credits'
      };
    }

    logger.info(`[Property Publishing] Successfully deducted ${amount} credits from user ${userId}. New balance: ${deductResult.newBalance}`);
    
    return {
      success: true,
      message: `Successfully deducted ${amount} credits`,
      transaction: deductResult.transaction
    };
  } catch (error) {
    logger.error('[Property Publishing] Error deducting credits:', error);
    return {
      success: false,
      message: error.message || 'Failed to deduct credits'
    };
  }
}

module.exports = {
  fetchListingDraftData,
  validatePropertyData,
  createPropertyRecord,
  updatePropertyRecord,
  sendPropertyPublishingNotification,
  updateListingDraftStatus,
  deductPublishingCredits,
};
