const db = require("../entity");
const Property = db.Property;
const PlatformUser = db.PlatformUser;
const { Op } = require("sequelize");
const logger = require("../config/winston.config");

/**
 * Validate and format date field
 * @param {any} dateValue - Date value to validate
 * @returns {Date|null} - Valid date or null
 */
const validateDate = (dateValue) => {
  if (!dateValue) return null;
  
  // If it's already a Date object
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }
  
  // If it's a string
  if (typeof dateValue === 'string') {
    // Check for "Invalid date" string
    if (dateValue === 'Invalid date' || dateValue.trim() === '') {
      return null;
    }
    
    const parsedDate = new Date(dateValue);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
  
  // Try to convert to date
  const parsedDate = new Date(dateValue);
  return isNaN(parsedDate.getTime()) ? null : parsedDate;
};

/**
 * Create a new property record from draft data
 * @param {number} userId - User ID
 * @param {number} draftId - Draft ID (required, ensures one draft = one publish)
 * @param {object} propertyData - Property data
 * @returns {Promise<object>} - Result object
 */
const createProperty = async (userId, draftId, propertyData) => {
  try {
    logger.info(`Creating property for user ${userId}, draft ${draftId}`);

    // Validate user exists
    const user = await PlatformUser.findByPk(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found',
        statusCode: 404
      };
    }


    // Prepare property data
    const propertyRecord = {
      propertyName: propertyData.propertyName || propertyData.title || propertyData.customPropertyName,
      projectId: propertyData.projectId || null,
      createdBy: userId,
      draftId: draftId,
      status: propertyData.status || 'ACTIVE',
      
      // Basic Information
      title: propertyData.title,
      description: propertyData.description,
      propertyType: propertyData.propertyType,
      listingType: propertyData.listingType,
      isNewProperty: propertyData.isNewProperty || false,
      
      // Location
      city: propertyData.city,
      locality: propertyData.locality,
      landmark: propertyData.landmark,
      addressText: propertyData.addressText,
      lat: propertyData.coordinates?.lat || null,
      lng: propertyData.coordinates?.lng || null,
      location: (propertyData.coordinates?.lat && propertyData.coordinates?.lng) 
        ? { type: 'Point', coordinates: [propertyData.coordinates.lng, propertyData.coordinates.lat] }
        : null,
      showMapExact: propertyData.showMapExact || false,
      
      // Specifications
      bedrooms: propertyData.bedrooms,
      bathrooms: propertyData.bathrooms,
      facing: propertyData.facing,
      view: propertyData.view,
      floorNumber: propertyData.floorNumber,
      totalFloors: propertyData.totalFloors,
      unitNumber: propertyData.unitNumber,
      towerName: propertyData.towerName,
      isUnitNumberPrivate: propertyData.isUnitNumberPrivate || false,
      
      // Area
      carpetArea: propertyData.carpetArea,
      superArea: propertyData.superArea,
      areaConfig: propertyData.areaConfig || [],
      measurementMethod: propertyData.measurementMethod,
      
      // Status & Type
      ownershipType: propertyData.ownershipType,
      furnishingStatus: propertyData.furnishingStatus,
      possessionStatus: propertyData.possessionStatus,
      ageOfProperty: propertyData.ageOfProperty,
      propertyPosition: propertyData.propertyPosition,
      availableFrom: validateDate(propertyData.availableFrom),
      possessionDate: validateDate(propertyData.possessionDate),
      
      // Pricing
      pricing: propertyData.pricing || [],
      isPriceVerified: propertyData.isPriceVerified || false,
      isPriceNegotiable: propertyData.isPriceNegotiable || false,
      
      // Project & Names
      projectName: propertyData.projectName,
      customPropertyName: propertyData.customPropertyName,
      
      // Features & Amenities
      features: propertyData.features || [],
      amenities: propertyData.amenities || [],
      flooringTypes: propertyData.flooringTypes || [],
      smartHomeDevices: propertyData.smartHomeDevices || [],
      maintenanceIncludes: propertyData.maintenanceIncludes || [],
      
      // Boolean Flags
      isGated: propertyData.isGated || false,
      fireSafety: propertyData.fireSafety || false,
      hasIntercom: propertyData.hasIntercom || false,
      petFriendly: propertyData.petFriendly || false,
      hasEmergencyExit: propertyData.hasEmergencyExit || false,
      
      // RERA & Documents
      reraIds: propertyData.reraIds || [],
      documents: propertyData.documents || [],
      
      // Media
      mediaData: propertyData.mediaData || [],
      propertyPlans: propertyData.propertyPlans || [],
      
      // Additional Details
      furnishingDetails: propertyData.furnishingDetails || {}
    };

    // Create property record
    const property = await Property.create(propertyRecord);

    logger.info(`Property created successfully: ${property.propertyId}`);

    return {
      success: true,
      message: 'Property created successfully',
      data: property
    };
  } catch (error) {
    logger.error('Error creating property:', error);
    return {
      success: false,
      message: error.message || 'Failed to create property',
      statusCode: 500
    };
  }
};

/**
 * Update property record
 * @param {number} propertyId - Property ID
 * @param {number} userId - User ID for authorization
 * @param {object} updateData - Data to update
 * @returns {Promise<object>} - Result object
 */
const updateProperty = async (propertyId, userId, updateData) => {
  try {
    logger.info(`Updating property ${propertyId} for user ${userId}`);

    // Find the property
    const property = await Property.findOne({
      where: {
        propertyId,
        createdBy: userId
      }
    });

    if (!property) {
      return {
        success: false,
        message: 'Property not found or unauthorized',
        statusCode: 404
      };
    }

    // Define all updatable fields
    const allowedFields = [
      'propertyName', 'projectId', 'status',
      // Basic Information
      'title', 'description', 'propertyType', 'listingType', 'isNewProperty',
      // Location
      'city', 'locality', 'landmark', 'addressText', 'lat', 'lng', 'showMapExact',
      // Specifications
      'bedrooms', 'bathrooms', 'facing', 'view', 'floorNumber', 'totalFloors',
      'unitNumber', 'towerName', 'isUnitNumberPrivate',
      // Area
      'carpetArea', 'superArea', 'areaConfig', 'measurementMethod',
      // Status & Type
      'ownershipType', 'furnishingStatus', 'possessionStatus', 'ageOfProperty',
      'propertyPosition', 'availableFrom', 'possessionDate',
      // Pricing
      'pricing', 'isPriceVerified', 'isPriceNegotiable',
      // Project & Names
      'projectName', 'customPropertyName',
      // Features & Amenities
      'features', 'amenities', 'flooringTypes', 'smartHomeDevices', 'maintenanceIncludes',
      // Boolean Flags
      'isGated', 'fireSafety', 'hasIntercom', 'petFriendly', 'hasEmergencyExit',
      // RERA & Documents
      'reraIds', 'documents',
      // Media
      'mediaData', 'propertyPlans',
      // Additional Details
      'furnishingDetails'
    ];

    const updateFields = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updateFields[field] = updateData[field];
      }
    });

    // Validate date fields specifically
    if (updateData.availableFrom !== undefined) {
      updateFields.availableFrom = validateDate(updateData.availableFrom);
    }
    if (updateData.possessionDate !== undefined) {
      updateFields.possessionDate = validateDate(updateData.possessionDate);
    }

    // Handle coordinates separately
    if (updateData.coordinates) {
      if (updateData.coordinates.lat !== undefined) {
        updateFields.lat = updateData.coordinates.lat;
      }
      if (updateData.coordinates.lng !== undefined) {
        updateFields.lng = updateData.coordinates.lng;
      }
      // Update location GEOGRAPHY field if both lat and lng are provided
      if (updateData.coordinates.lat && updateData.coordinates.lng) {
        updateFields.location = {
          type: 'Point',
          coordinates: [updateData.coordinates.lng, updateData.coordinates.lat]
        };
      }
    }

    await property.update(updateFields);

    logger.info(`Property updated successfully: ${propertyId}`);

    return {
      success: true,
      message: 'Property updated successfully',
      data: property
    };
  } catch (error) {
    logger.error('Error updating property:', error);
    return {
      success: false,
      message: error.message || 'Failed to update property',
      statusCode: 500
    };
  }
};

/**
 * Get property by ID
 * @param {number} propertyId - Property ID
 * @returns {Promise<object>} - Result object
 */
const getPropertyById = async (propertyId) => {
  try {
    const property = await Property.findOne({
      where: { propertyId },
      include: [
        {
          model: PlatformUser,
          as: 'creator',
          attributes: ['userId', 'name', 'email']
        }
      ]
    });

    if (!property) {
      return {
        success: false,
        message: 'Property not found',
        statusCode: 404
      };
    }

    return {
      success: true,
      data: property
    };
  } catch (error) {
    logger.error('Error fetching property:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch property',
      statusCode: 500
    };
  }
};

/**
 * Get user's properties
 * @param {number} userId - User ID
 * @returns {Promise<object>} - Result object
 */
const getUserProperties = async (userId) => {
  try {
    const properties = await Property.findAll({
      where: { createdBy: userId },
      order: [['property_created_at', 'DESC']],
      include: [
        {
          model: PlatformUser,
          as: 'creator',
          attributes: ['userId', 'name', 'email']
        }
      ]
    });

    return {
      success: true,
      data: properties
    };
  } catch (error) {
    logger.error('Error fetching user properties:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch properties',
      statusCode: 500
    };
  }
};

/**
 * List properties with filters and pagination
 * @param {object} filters - Filter options
 * @returns {Promise<object>} - Result object
 */
const listProperties = async (filters) => {
  try {
    const {
      status,
      projectId,
      city,
      locality,
      propertyType,
      listingType,
      bedrooms,
      minPrice,
      maxPrice,
      search,
      page = 1,
      limit = 10
    } = filters;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    if (city) {
      where.city = {
        [Op.iLike]: `%${city}%`
      };
    }

    if (locality) {
      where.locality = {
        [Op.iLike]: `%${locality}%`
      };
    }

    if (propertyType) {
      where.propertyType = propertyType;
    }

    if (listingType) {
      where.listingType = listingType;
    }

    if (bedrooms) {
      where.bedrooms = bedrooms;
    }

    if (search) {
      where[Op.or] = [
        { propertyName: { [Op.iLike]: `%${search}%` } },
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { locality: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Property.findAndCountAll({
      where,
      limit,
      offset,
      order: [['property_created_at', 'DESC']],
      include: [
        {
          model: PlatformUser,
          as: 'creator',
          attributes: ['userId', 'name', 'email']
        }
      ]
    });

    return {
      success: true,
      data: {
        properties: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    logger.error('Error listing properties:', error);
    return {
      success: false,
      message: error.message || 'Failed to list properties',
      statusCode: 500
    };
  }
};

/**
 * Delete property (soft delete)
 * @param {number} propertyId - Property ID
 * @param {number} userId - User ID for authorization
 * @returns {Promise<object>} - Result object
 */
const deleteProperty = async (propertyId, userId) => {
  try {
    logger.info(`Deleting property ${propertyId} for user ${userId}`);

    // Find the property
    const property = await Property.findOne({
      where: {
        propertyId,
        createdBy: userId
      }
    });

    if (!property) {
      return {
        success: false,
        message: 'Property not found or unauthorized',
        statusCode: 404
      };
    }

    // Soft delete (paranoid is enabled in entity)
    await property.destroy();

    logger.info(`Property deleted successfully: ${propertyId}`);

    return {
      success: true,
      message: 'Property deleted successfully',
      data: { propertyId }
    };
  } catch (error) {
    logger.error('Error deleting property:', error);
    return {
      success: false,
      message: error.message || 'Failed to delete property',
      statusCode: 500
    };
  }
};

module.exports = {
  createProperty,
  updateProperty,
  getPropertyById,
  getUserProperties,
  listProperties,
  deleteProperty
};
