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
 * Fetch property data from ListingDraft entity and transform it
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} params.draftId - Draft ID
 * @returns {Promise<Object>} - Result with transformed property data
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
    if (!draft.draftData || typeof draft.draftData !== 'object') {
      logger.error(`[Property Publishing] Draft ${draftId} has no valid data`);
      return {
        success: false,
        message: 'Draft has no property data'
      };
    }

    // Check draft status
    if (draft.draftStatus === 'PUBLISHED') {
      logger.warn(`[Property Publishing] Draft ${draftId} is already published - allowing re-publish for updates`);
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
 * Transform nested draft data structure to flat property format
 * 
 * @param {Object} params - Activity parameters
 * @param {Object} params.draftData - Raw draft data with nested structure
 * @returns {Promise<Object>} - Result with transformed property data
 */
async function transformPropertyDraftData({ draftData }) {
  logger.info(`[Property Publishing] Transforming draft data structure`);
  
  try {
    // Extract nested sections from draft
    const listingInfo = draftData['listing-info'] || {};
    const basicDetails = draftData['basic-details'] || {};
    const basicConfiguration = draftData['basic-configuration'] || {};
    const propertyTypeData = draftData['property-type'] || {};
    const locationSelection = draftData['location-selection'] || {};
    const locationAttributes = draftData['location-attributes'] || {};
    const pricingData = draftData.pricing || {};
    const mediaUpload = draftData['media-upload'] || {};
    const propertyAmenities = draftData['property-amenities'] || {};
    const unitAmenities = draftData['unit-amenities'] || {};
    const floorDetails = draftData['floor-details'] || {};
    const landAttributes = draftData['land-attributes'] || {};
    const areaDetails = draftData['area-details'] || {};

    // Transform to flat structure expected by PropertyService
    const transformedData = {
      // Basic Information
      propertyName: basicDetails.customPropertyName || listingInfo.title,
      title: listingInfo.title,
      description: listingInfo.description,
      propertyType: propertyTypeData.propertyType,
      listingType: basicDetails.listingType,
      isNewProperty: basicDetails.isNewProperty || false,
      
      // Location
      city: locationSelection.city,
      locality: locationSelection.locality,
      landmark: locationSelection.landmark,
      addressText: locationSelection.addressText,
      coordinates: locationSelection.coordinates,
      showMapExact: locationSelection.showMapExact || false,
      
      // Configuration from basic-configuration
      bedrooms: basicConfiguration.bedrooms,
      bathrooms: basicConfiguration.bathrooms,
      carpetArea: basicConfiguration.carpetArea,
      superArea: basicConfiguration.superArea,
      areaConfig: basicConfiguration.areaConfig || [],
      measurementMethod: basicConfiguration.measurementMethod,
      
      // Floor details
      floorNumber: floorDetails.floorNumber,
      totalFloors: floorDetails.totalFloors,
      unitNumber: floorDetails.unitNumber,
      towerName: floorDetails.towerName,
      isUnitNumberPrivate: floorDetails.isUnitNumberPrivate || false,
      hasIntercom: floorDetails.hasIntercom || false,
      hasEmergencyExit: floorDetails.hasEmergencyExit || false,
      
      // Location attributes
      facing: locationAttributes.facing,
      view: locationAttributes.view,
      propertyPosition: locationAttributes.propertyPosition,
      
      // Status & Type
      ownershipType: basicDetails.ownershipType,
      possessionStatus: basicDetails.possessionStatus,
      ageOfProperty: basicDetails.ageOfProperty,
      possessionDate: basicDetails.possessionDate,
      
      // Pricing - extract from nested pricing.pricing array
      pricing: pricingData.pricing || [],
      availableFrom: pricingData.availableFrom,
      isPriceVerified: pricingData.isPriceVerified || false,
      isPriceNegotiable: pricingData.isPriceNegotiable || false,
      maintenanceIncludes: pricingData.maintenanceIncludes || [],
      
      // Project
      projectName: basicDetails.projectName,
      customPropertyName: basicDetails.customPropertyName,
      
      // Amenities from multiple sections
      features: propertyAmenities.features || [],
      amenities: unitAmenities.amenities || [],
      flooringTypes: unitAmenities.flooringTypes || [],
      smartHomeDevices: unitAmenities.smartHomeDevices || [],
      furnishingStatus: unitAmenities.furnishingStatus,
      furnishingDetails: unitAmenities.furnishingDetails || {},
      
      // Boolean flags
      isGated: propertyAmenities.isGated || false,
      fireSafety: propertyAmenities.fireSafety || false,
      petFriendly: propertyAmenities.petFriendly || false,
      
      // RERA & Documents
      reraIds: basicDetails.reraIds || [],
      documents: draftData.documents || [],
      
      // Media
      mediaData: mediaUpload.mediaData || [],
      propertyPlans: mediaUpload.propertyPlans || [],
      
      // Land-specific attributes (if applicable)
      landAttributes: landAttributes || {},
      
      // Also keep the original nested structure in case PropertyService needs it
      'listing-info': listingInfo,
      'basic-details': basicDetails,
      'basic-configuration': basicConfiguration,
      'property-type': propertyTypeData,
      'location-selection': locationSelection,
      'location-attributes': locationAttributes,
      'pricing': pricingData,
      'media-upload': mediaUpload,
      'property-amenities': propertyAmenities,
      'unit-amenities': unitAmenities,
      'floor-details': floorDetails,
      'land-attributes': landAttributes,
      'area-details': areaDetails
    };

    logger.info(`[Property Publishing] Draft data transformed successfully`);
    logger.debug(`[Property Publishing] Transformed data summary:`, {
      propertyName: transformedData.propertyName,
      title: transformedData.title,
      propertyType: transformedData.propertyType,
      listingType: transformedData.listingType,
      city: transformedData.city,
      locality: transformedData.locality,
      bedrooms: transformedData.bedrooms,
      hasCoordinates: !!transformedData.coordinates
    });
    
    return {
      success: true,
      data: transformedData
    };
  } catch (error) {
    logger.error('[Property Publishing] Error transforming draft data:', error);
    return {
      success: false,
      message: error.message || 'Failed to transform draft data'
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

    // Log key data for debugging
    logger.debug(`[Property Publishing] Validation input - propertyType: ${propertyData.propertyType}, listingType: ${propertyData.listingType}, city: ${propertyData.city}, propertyName: ${propertyData.propertyName}`);

    // Validate required draftId
    if (!draftId) {
      errors.push('Draft ID is required');
    }

    // Handle nested structure
    const listingInfo = propertyData['listing-info'] || {};
    const basicDetails = propertyData['basic-details'] || {};
    const locationSelection = propertyData['location-selection'] || {};
    const basicConfiguration = propertyData['basic-configuration'] || {};

    // Validate required fields - at least one name field (check both nested and flat)
    const hasName = propertyData.propertyName || 
                   propertyData.title || 
                   propertyData.customPropertyName ||
                   listingInfo.title ||
                   basicDetails.customPropertyName;
    
    if (!hasName) {
      errors.push('Property name, title, or custom property name is required');
    }
    
    // Validate at least basic property type
    const propertyType = propertyData.propertyType || propertyData['property-type']?.propertyType;
    if (!propertyType) {
      errors.push('Property type is required');
    }
    
    // Validate listing type
    const listingType = propertyData.listingType || basicDetails.listingType;
    if (!listingType) {
      errors.push('Listing type (sale/rent/lease) is required');
    }
    
    // Validate location
    const hasLocation = (propertyData.city || locationSelection.city) && 
                       (propertyData.locality || locationSelection.locality);
    if (!hasLocation) {
      errors.push('City and locality are required');
    }
    
    // Validate coordinates if provided
    const coords = propertyData.coordinates || locationSelection.coordinates;
    if (coords) {
      if (coords.lat && (isNaN(coords.lat) || coords.lat < -90 || coords.lat > 90)) {
        errors.push('Invalid latitude value (must be between -90 and 90)');
      }
      if (coords.lng && (isNaN(coords.lng) || coords.lng < -180 || coords.lng > 180)) {
        errors.push('Invalid longitude value (must be between -180 and 180)');
      }
    }
    
    // Validate at least one bedroom/configuration specified
    const bedrooms = propertyData.bedrooms || basicConfiguration.bedrooms;
    if (propertyType === 'apartment' || propertyType === 'villa') {
      if (!bedrooms) {
        errors.push('Number of bedrooms is required for apartments and villas');
      }
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
      logger.error(`[Property Publishing] Validation failed with ${errors.length} error(s):`, errors);
      return {
        success: false,
        errors
      };
    }

    logger.info(`[Property Publishing] Validation passed successfully`);
    return {
      success: true,
      existingProperty
    };
  } catch (error) {
    logger.error('[Property Publishing] Validation error (exception):', error);
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
  transformPropertyDraftData,
  validatePropertyData,
  createPropertyRecord,
  updatePropertyRecord,
  sendPropertyPublishingNotification,
  updateListingDraftStatus,
  deductPublishingCredits,
};
