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

    console.log('Property Data Received:', propertyData);

    // Extract data from nested structure (draft format)
    const listingInfo = propertyData['listing-info'] || {};
    const basicDetails = propertyData['basic-details'] || {};
    const propertyTypeData = propertyData['property-type'] || {};
    const locationSelection = propertyData['location-selection'] || {};
    const pricingData = propertyData.pricing || {};
    const mediaUpload = propertyData['media-upload'] || {};
    const propertyAmenities = propertyData['property-amenities'] || {};
    const landAttributes = propertyData['land-attributes'] || {};
    const specifications = propertyData.specifications || {};
    const areaDetails = propertyData['area-details'] || {};

    // Prepare property data
    const propertyRecord = {
      propertyName: basicDetails.customPropertyName || listingInfo.title || propertyData.propertyName,
      projectId: propertyData.projectId || null,
      createdBy: userId,
      draftId: draftId,
      status: propertyData.status || 'ACTIVE',
      
      // Basic Information
      title: listingInfo.title || propertyData.title,
      description: listingInfo.description || propertyData.description,
      propertyType: propertyTypeData.propertyType || propertyData.propertyType,
      listingType: basicDetails.listingType || propertyData.listingType,
      isNewProperty: basicDetails.isNewProperty || propertyData.isNewProperty || false,
      
      // Location
      city: locationSelection.city || propertyData.city,
      locality: locationSelection.locality || propertyData.locality,
      landmark: locationSelection.landmark || propertyData.landmark,
      addressText: locationSelection.addressText || propertyData.addressText,
      lat: locationSelection.coordinates?.lat || propertyData.coordinates?.lat || null,
      lng: locationSelection.coordinates?.lng || propertyData.coordinates?.lng || null,
      location: ((locationSelection.coordinates?.lat && locationSelection.coordinates?.lng) || 
                 (propertyData.coordinates?.lat && propertyData.coordinates?.lng))
        ? db.sequelize.fn(
            'ST_SetSRID',
            db.sequelize.fn(
              'ST_MakePoint',
              locationSelection.coordinates?.lng || propertyData.coordinates?.lng,
              locationSelection.coordinates?.lat || propertyData.coordinates?.lat
            ),
            4326
          )
        : null,
      showMapExact: locationSelection.showMapExact || propertyData.showMapExact || false,
      
      // Specifications
      bedrooms: specifications.bedrooms || propertyData.bedrooms,
      bathrooms: specifications.bathrooms || propertyData.bathrooms,
      facing: specifications.facing || propertyData.facing,
      view: specifications.view || propertyData.view,
      floorNumber: specifications.floorNumber || propertyData.floorNumber,
      totalFloors: specifications.totalFloors || propertyData.totalFloors,
      unitNumber: specifications.unitNumber || propertyData.unitNumber,
      towerName: specifications.towerName || propertyData.towerName,
      isUnitNumberPrivate: specifications.isUnitNumberPrivate || propertyData.isUnitNumberPrivate || false,
      
      // Area
      carpetArea: areaDetails.carpetArea || propertyData.carpetArea,
      superArea: areaDetails.superArea || landAttributes.plotArea || propertyData.superArea,
      areaConfig: areaDetails.areaConfig || propertyData.areaConfig || [],
      measurementMethod: areaDetails.measurementMethod || propertyData.measurementMethod,
      
      // Status & Type
      ownershipType: basicDetails.ownershipType || propertyData.ownershipType,
      furnishingStatus: specifications.furnishingStatus || propertyData.furnishingStatus,
      possessionStatus: basicDetails.possessionStatus || propertyData.possessionStatus,
      ageOfProperty: basicDetails.ageOfProperty || propertyData.ageOfProperty,
      propertyPosition: specifications.propertyPosition || propertyData.propertyPosition,
      availableFrom: validateDate(pricingData.availableFrom || propertyData.availableFrom),
      possessionDate: validateDate(basicDetails.possessionDate || propertyData.possessionDate),
      
      // Pricing
      pricing: pricingData.pricing || propertyData.pricing || [],
      isPriceVerified: pricingData.isPriceVerified || propertyData.isPriceVerified || false,
      isPriceNegotiable: pricingData.isPriceNegotiable || propertyData.isPriceNegotiable || false,
      
      // Project & Names
      projectName: basicDetails.projectName || propertyData.projectName,
      customPropertyName: basicDetails.customPropertyName || propertyData.customPropertyName,
      
      // Features & Amenities
      features: propertyAmenities.features || propertyData.features || [],
      amenities: propertyAmenities.amenities || propertyData.amenities || [],
      flooringTypes: specifications.flooringTypes || propertyData.flooringTypes || [],
      smartHomeDevices: specifications.smartHomeDevices || propertyData.smartHomeDevices || [],
      maintenanceIncludes: pricingData.maintenanceIncludes || propertyData.maintenanceIncludes || [],
      
      // Boolean Flags
      isGated: specifications.isGated || propertyData.isGated || false,
      fireSafety: specifications.fireSafety || propertyData.fireSafety || false,
      hasIntercom: specifications.hasIntercom || propertyData.hasIntercom || false,
      petFriendly: specifications.petFriendly || propertyData.petFriendly || false,
      hasEmergencyExit: specifications.hasEmergencyExit || propertyData.hasEmergencyExit || false,
      
      // RERA & Documents
      reraIds: basicDetails.reraIds || propertyData.reraIds || [],
      documents: propertyData.documents || [],
      
      // Media
      mediaData: mediaUpload.mediaData || propertyData.mediaData || [],
      propertyPlans: mediaUpload.propertyPlans || propertyData.propertyPlans || [],
      
      // Additional Details
      furnishingDetails: specifications.furnishingDetails || propertyData.furnishingDetails || {},
      
      // Land-specific attributes (stored as JSON in appropriate fields)
      landAttributes: landAttributes ? {
        fencing: landAttributes.fencing,
        landUse: landAttributes.landUse,
        areaUnit: landAttributes.areaUnit,
        plotArea: landAttributes.plotArea,
        soilType: landAttributes.soilType,
        roadWidth: landAttributes.roadWidth,
        terrainLevel: landAttributes.terrainLevel,
        plotDimension: landAttributes.plotDimension,
        irrigationSource: landAttributes.irrigationSource
      } : propertyData.landAttributes || {}
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
        updateFields.location = db.sequelize.fn(
          'ST_SetSRID',
          db.sequelize.fn(
            'ST_MakePoint',
            updateData.coordinates.lng,
            updateData.coordinates.lat
          ),
          4326
        );
      }
    }
    
    // Also handle nested location-selection format from draft data
    const locationSelection = updateData['location-selection'];
    if (locationSelection?.coordinates) {
      if (locationSelection.coordinates.lat !== undefined) {
        updateFields.lat = locationSelection.coordinates.lat;
      }
      if (locationSelection.coordinates.lng !== undefined) {
        updateFields.lng = locationSelection.coordinates.lng;
      }
      if (locationSelection.coordinates.lat && locationSelection.coordinates.lng) {
        updateFields.location = db.sequelize.fn(
          'ST_SetSRID',
          db.sequelize.fn(
            'ST_MakePoint',
            locationSelection.coordinates.lng,
            locationSelection.coordinates.lat
          ),
          4326
        );
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

/**
 * Search properties near a location using PostGIS
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {number} radiusKm - Search radius in kilometers
 * @param {object} filters - Additional filter criteria
 * @returns {Promise<object>} - Result object
 */
const searchNearbyProperties = async (latitude, longitude, radiusKm, filters = {}) => {
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
      page = 1,
      limit = 20
    } = filters;

    const whereClause = {};

    // Apply additional filters
    if (status) {
      whereClause.status = status;
    }

    if (projectId) {
      whereClause.projectId = projectId;
    }

    if (city) {
      whereClause.city = city;
    }

    if (locality) {
      whereClause.locality = locality;
    }

    if (propertyType) {
      whereClause.propertyType = propertyType;
    }

    if (listingType) {
      whereClause.listingType = listingType;
    }

    if (bedrooms) {
      whereClause.bedrooms = bedrooms;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) {
        whereClause.price[Op.gte] = parseFloat(minPrice);
      }
      if (maxPrice) {
        whereClause.price[Op.lte] = parseFloat(maxPrice);
      }
    }

    // Convert radius from km to meters for PostGIS
    const radiusMeters = radiusKm * 1000;

    // Pagination
    const offset = (page - 1) * limit;

    // Build base where conditions as array
    const whereConditions = [];
    
    // Add spatial query using raw SQL for PostGIS
    whereConditions.push(
      db.sequelize.literal(
        `ST_DWithin(
          location::geography,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
          ${radiusMeters}
        )`
      )
    );

    // Use PostGIS ST_DWithin for efficient spatial query
    const { rows, count } = await Property.findAndCountAll({
      where: {
        ...whereClause,
        [Op.and]: whereConditions
      },
      attributes: {
        include: [
          // Calculate distance in kilometers and include it in results
          [
            db.sequelize.literal(
              `ROUND(CAST(ST_Distance(location::geography, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography) / 1000 AS numeric), 2)`
            ),
            'distance_km'
          ]
        ]
      },
      include: [
        {
          model: PlatformUser,
          as: 'creator',
          attributes: ['userId', 'firstName', 'lastName', 'email', 'phone']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      // Order by distance (nearest first)
      order: db.sequelize.literal(
        `ST_Distance(location::geography, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography) ASC`
      ),
      subQuery: false
    });

    return {
      success: true,
      data: {
        properties: rows,
        searchCenter: {
          lat: latitude,
          lng: longitude,
          radiusKm
        },
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    logger.error('Error searching nearby properties:', error);
    throw error;
  }
};

module.exports = {
  createProperty,
  updateProperty,
  getPropertyById,
  getUserProperties,
  listProperties,
  deleteProperty,
  searchNearbyProperties
};
