/**
 * Draft Data Transformer Utility
 * 
 * Transforms nested draft data (organized by form sections) into flat Property entity format
 * 
 * @module utils/draftDataTransformer
 */

const logger = require('../config/winston.config');

/**
 * Transform nested draft data to flat property data
 * 
 * @param {Object} draftData - Nested draft data from form sections
 * @returns {Object} - Flat property data matching Property entity schema
 */
function transformDraftToPropertyData(draftData) {
  if (!draftData || typeof draftData !== 'object') {
    logger.warn('[Draft Transformer] Invalid draft data provided');
    return {};
  }

  logger.info('[Draft Transformer] Starting transformation of draft data');

  const propertyData = {};

  try {
    // ============================================
    // Property Type Section
    // ============================================
    if (draftData['property-type']) {
      const section = draftData['property-type'];
      if (section.propertyType) propertyData.propertyType = section.propertyType;
    }

    // ============================================
    // Location Selection Section
    // ============================================
    if (draftData['location-selection']) {
      const section = draftData['location-selection'];
      
      // Coordinates
      if (section.coordinates) {
        if (section.coordinates.lat !== undefined) {
          propertyData.lat = parseFloat(section.coordinates.lat);
        }
        if (section.coordinates.lng !== undefined) {
          propertyData.lng = parseFloat(section.coordinates.lng);
        }
        
        // Create PostGIS geography point
        if (propertyData.lat && propertyData.lng) {
          propertyData.location = {
            type: 'Point',
            coordinates: [propertyData.lng, propertyData.lat],
            crs: { type: 'name', properties: { name: 'EPSG:4326' } }
          };
        }
      }
      
      if (section.showMapExact !== undefined) {
        propertyData.showMapExact = Boolean(section.showMapExact);
      }
      if (section.city) propertyData.city = section.city;
      if (section.locality) propertyData.locality = section.locality;
      if (section.addressText) propertyData.addressText = section.addressText;
      if (section.landmark) propertyData.landmark = section.landmark;
    }

    // ============================================
    // Basic Details Section
    // ============================================
    if (draftData['basic-details']) {
      const section = draftData['basic-details'];
      
      if (section.listingType) propertyData.listingType = section.listingType;
      if (section.ownershipType) propertyData.ownershipType = section.ownershipType;
      if (section.projectName) propertyData.projectName = section.projectName;
      if (section.customPropertyName) propertyData.customPropertyName = section.customPropertyName;
      
      // RERA IDs - ensure it's an array
      if (section.reraIds && Array.isArray(section.reraIds)) {
        propertyData.reraIds = section.reraIds;
      }
      
      if (section.ageOfProperty) propertyData.ageOfProperty = section.ageOfProperty;
      if (section.possessionStatus) propertyData.possessionStatus = section.possessionStatus;
      
      // Possession Date
      if (section.possessionDate) {
        propertyData.possessionDate = new Date(section.possessionDate);
      }
      
      if (section.isNewProperty !== undefined) {
        propertyData.isNewProperty = Boolean(section.isNewProperty);
      }
    }

    // ============================================
    // Basic Configuration Section
    // ============================================
    if (draftData['basic-configuration']) {
      const section = draftData['basic-configuration'];
      
      if (section.bedrooms) propertyData.bedrooms = section.bedrooms;
      if (section.bathrooms) propertyData.bathrooms = section.bathrooms;
      if (section.carpetArea) propertyData.carpetArea = section.carpetArea;
      if (section.superArea) propertyData.superArea = section.superArea;
      if (section.measurementMethod) propertyData.measurementMethod = section.measurementMethod;
      
      // Area Config - ensure it's an array
      if (section.areaConfig && Array.isArray(section.areaConfig)) {
        propertyData.areaConfig = section.areaConfig;
      }
    }

    // ============================================
    // Unit Amenities Section
    // ============================================
    if (draftData['unit-amenities']) {
      const section = draftData['unit-amenities'];
      
      if (section.furnishingStatus) propertyData.furnishingStatus = section.furnishingStatus;
      
      // Flooring Types - ensure it's an array
      if (section.flooringTypes && Array.isArray(section.flooringTypes)) {
        propertyData.flooringTypes = section.flooringTypes;
      }
      
      // Furnishing Details
      if (section.furnishingDetails) {
        propertyData.furnishingDetails = section.furnishingDetails;
      }
      
      // Smart Home Devices - ensure it's an array
      if (section.smartHomeDevices && Array.isArray(section.smartHomeDevices)) {
        propertyData.smartHomeDevices = section.smartHomeDevices;
      }
      
      // Unit Amenities - ensure it's an array
      if (section.amenities && Array.isArray(section.amenities)) {
        // Store as amenities (will be merged with property amenities later)
        propertyData.unitAmenities = section.amenities;
      }
    }

    // ============================================
    // Location Attributes Section
    // ============================================
    if (draftData['location-attributes']) {
      const section = draftData['location-attributes'];
      
      if (section.facing) propertyData.facing = section.facing;
      if (section.view) propertyData.view = section.view;
      if (section.propertyPosition) propertyData.propertyPosition = section.propertyPosition;
    }

    // ============================================
    // Floor Details Section
    // ============================================
    if (draftData['floor-details']) {
      const section = draftData['floor-details'];
      
      if (section.towerName) propertyData.towerName = section.towerName;
      if (section.floorNumber) propertyData.floorNumber = section.floorNumber;
      if (section.totalFloors) propertyData.totalFloors = section.totalFloors;
      if (section.unitNumber) propertyData.unitNumber = section.unitNumber;
      
      if (section.isUnitNumberPrivate !== undefined) {
        propertyData.isUnitNumberPrivate = Boolean(section.isUnitNumberPrivate);
      }
      if (section.hasEmergencyExit !== undefined) {
        propertyData.hasEmergencyExit = Boolean(section.hasEmergencyExit);
      }
      if (section.hasIntercom !== undefined) {
        propertyData.hasIntercom = Boolean(section.hasIntercom);
      }
    }

    // ============================================
    // Pricing Section
    // ============================================
    if (draftData['pricing']) {
      const section = draftData['pricing'];
      
      // Pricing array - ensure it's an array
      if (section.pricing && Array.isArray(section.pricing)) {
        propertyData.pricing = section.pricing;
      }
      
      if (section.isPriceNegotiable !== undefined) {
        propertyData.isPriceNegotiable = Boolean(section.isPriceNegotiable);
      }
      if (section.isPriceVerified !== undefined) {
        propertyData.isPriceVerified = Boolean(section.isPriceVerified);
      }
      
      // Available From
      if (section.availableFrom) {
        propertyData.availableFrom = new Date(section.availableFrom);
      }
      
      // Maintenance Includes - ensure it's an array
      if (section.maintenanceIncludes && Array.isArray(section.maintenanceIncludes)) {
        propertyData.maintenanceIncludes = section.maintenanceIncludes;
      }
    }

    // ============================================
    // Listing Info Section
    // ============================================
    if (draftData['listing-info']) {
      const section = draftData['listing-info'];
      
      if (section.title) propertyData.title = section.title;
      if (section.description) propertyData.description = section.description;
    }

    // ============================================
    // Property Amenities Section
    // ============================================
    if (draftData['property-amenities']) {
      const section = draftData['property-amenities'];
      
      // Features - ensure it's an array
      if (section.features && Array.isArray(section.features)) {
        propertyData.features = section.features;
      }
      
      // Merge with unit amenities if they exist
      if (propertyData.unitAmenities && Array.isArray(propertyData.unitAmenities)) {
        propertyData.amenities = [
          ...(section.amenities || []),
          ...propertyData.unitAmenities
        ];
        // Remove duplicates
        propertyData.amenities = [...new Set(propertyData.amenities)];
      } else if (section.amenities && Array.isArray(section.amenities)) {
        propertyData.amenities = section.amenities;
      }
      
      // Remove temporary unitAmenities field
      delete propertyData.unitAmenities;
      
      // Extract boolean flags from features
      if (propertyData.features) {
        propertyData.isGated = propertyData.features.includes('gated_society');
        propertyData.fireSafety = propertyData.features.includes('fire_safety');
        propertyData.petFriendly = propertyData.features.includes('pet_friendly');
      }
    }

    // ============================================
    // Media Upload Section
    // ============================================
    if (draftData['media-upload']) {
      const section = draftData['media-upload'];
      
      // Media Data - ensure it's an array
      if (section.mediaData && Array.isArray(section.mediaData)) {
        propertyData.mediaData = section.mediaData;
      }
      
      // Property Plans - ensure it's an array
      if (section.propertyPlans && Array.isArray(section.propertyPlans)) {
        propertyData.propertyPlans = section.propertyPlans;
      }
    }

    // ============================================
    // Documents Section
    // ============================================
    if (draftData['documents']) {
      const section = draftData['documents'];
      
      // Documents - ensure it's an array
      if (section.documents && Array.isArray(section.documents)) {
        propertyData.documents = section.documents;
      }
    }

    // ============================================
    // Generate propertyName from available fields
    // ============================================
    if (!propertyData.propertyName) {
      propertyData.propertyName = 
        propertyData.customPropertyName || 
        propertyData.title || 
        propertyData.projectName || 
        'Untitled Property';
    }

    // ============================================
    // Ensure arrays have default values
    // ============================================
    const arrayFields = [
      'features', 'amenities', 'flooringTypes', 'smartHomeDevices',
      'maintenanceIncludes', 'reraIds', 'documents', 'mediaData',
      'propertyPlans', 'areaConfig', 'pricing'
    ];

    arrayFields.forEach(field => {
      if (propertyData[field] === undefined) {
        propertyData[field] = [];
      }
    });

    logger.info('[Draft Transformer] Transformation completed successfully');
    logger.debug('[Draft Transformer] Transformed property data:', {
      hasPropertyName: !!propertyData.propertyName,
      hasLocation: !!propertyData.location,
      hasCoordinates: !!(propertyData.lat && propertyData.lng),
      hasTitle: !!propertyData.title,
      propertyType: propertyData.propertyType,
      listingType: propertyData.listingType,
      city: propertyData.city
    });

    return propertyData;
    
  } catch (error) {
    logger.error('[Draft Transformer] Error transforming draft data:', error);
    throw new Error(`Failed to transform draft data: ${error.message}`);
  }
}

/**
 * Validate that required fields are present after transformation
 * 
 * @param {Object} propertyData - Transformed property data
 * @returns {Object} - Validation result { valid: boolean, errors: string[] }
 */
function validateTransformedData(propertyData) {
  const errors = [];

  // Check required fields
  if (!propertyData.propertyName && !propertyData.title && !propertyData.customPropertyName) {
    errors.push('Property must have a name, title, or custom property name');
  }

  // Validate coordinates if location is provided
  if (propertyData.location || propertyData.lat || propertyData.lng) {
    if (!propertyData.lat || isNaN(propertyData.lat)) {
      errors.push('Invalid latitude coordinate');
    }
    if (!propertyData.lng || isNaN(propertyData.lng)) {
      errors.push('Invalid longitude coordinate');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  transformDraftToPropertyData,
  validateTransformedData
};
