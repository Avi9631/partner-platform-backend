const db = require("../entity");
const logger = require("../config/winston.config");
const PgColiveHostel = db.PgColiveHostel;
const PlatformUser = db.PlatformUser;
const { Op } = require("sequelize");

/**
 * Create slug from property name
 * @param {string} name - Property name
 * @returns {string} - URL-friendly slug
 */
const createSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/--+/g, '-')      // Replace multiple hyphens with single hyphen
    .trim();
};

/**
 * Ensure slug is unique by appending number if needed
 * @param {string} baseSlug - Base slug
 * @param {number} excludePgHostelId - PgHostel ID to exclude from check
 * @returns {Promise<string>} - Unique slug
 */
const ensureUniqueSlug = async (baseSlug, excludePgHostelId = null) => {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const whereClause = { slug };
    if (excludePgHostelId) {
      whereClause.pgHostelId = { [Op.ne]: excludePgHostelId };
    }
    
    const existing = await PgColiveHostel.findOne({ where: whereClause });
    if (!existing) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

/**
 * Create a new PG/Colive/Hostel record from draft data
 * @param {number} userId - User ID
 * @param {number} draftId - Draft ID (required, ensures one draft = one publish)
 * @param {object} pgHostelData - PG/Hostel data
 * @returns {Promise<object>} - Result object
 */
const createPgColiveHostel = async (userId, draftId, pgHostelData) => {
  try {
    // Generate unique slug
    const baseSlug = createSlug(pgHostelData.propertyName);
    const slug = await ensureUniqueSlug(baseSlug);

    // Validate coordinates are provided (required for location field)
    if (!pgHostelData.coordinates || !pgHostelData.coordinates.lat || !pgHostelData.coordinates.lng) {
      throw new Error('Coordinates (lat, lng) are required for creating PG/Hostel listing');
    }

    // Create location point from coordinates
    const locationPoint = {
      type: 'Point',
      coordinates: [pgHostelData.coordinates.lng, pgHostelData.coordinates.lat], // [longitude, latitude] for PostGIS
      crs: { type: 'name', properties: { name: 'EPSG:4326' } }
    };

    // Create PG/Hostel record
    const pgHostel = await PgColiveHostel.create({
      userId,
      draftId,
      propertyName: pgHostelData.propertyName,
      slug,
      genderAllowed: pgHostelData.genderAllowed,
      description: pgHostelData.description,
      isBrandManaged: pgHostelData.isBrandManaged || false,
      brandName: pgHostelData.brandName,
      yearBuilt: pgHostelData.yearBuilt,
      location: locationPoint,
      lat: pgHostelData.coordinates.lat,
      lng: pgHostelData.coordinates.lng,
      city: pgHostelData.city,
      locality: pgHostelData.locality,
      addressText: pgHostelData.addressText,
      landmark: pgHostelData.landmark,
      roomTypes: pgHostelData.roomTypes || [],
      commonAmenities: pgHostelData.commonAmenities || [],
      commonAmenitiesLegacy: pgHostelData.commonAmenitiesLegacy || [],
      roomAmenities: pgHostelData.roomAmenities || [],
      foodMess: pgHostelData.foodMess,
      rules: pgHostelData.rules || [],
      mediaData: pgHostelData.mediaData || [],
      publishStatus: 'PENDING_REVIEW',
      verificationStatus: 'PENDING'
    });

    return {
      success: true,
      message: 'PG/Colive/Hostel created successfully',
      data: pgHostel
    };
  } catch (error) {
    logger.error('Error creating PG/Colive/Hostel:', error);
    throw error;
  }
};

/**
 * Update PG/Hostel record
 * @param {number} pgHostelId - PG Hostel ID
 * @param {number} userId - User ID for authorization
 * @param {object} updateData - Data to update
 * @returns {Promise<object>} - Result object
 */
const updatePgColiveHostel = async (pgHostelId, userId, updateData) => {
  try {
    // Find the PG/Hostel
    const pgHostel = await PgColiveHostel.findOne({
      where: {
        pgHostelId,
        userId
      }
    });

    if (!pgHostel) {
      return {
        success: false,
        message: 'PG/Hostel not found or unauthorized',
        statusCode: 404
      };
    }

    // Update slug if property name changed
    if (updateData.propertyName && updateData.propertyName !== pgHostel.propertyName) {
      const baseSlug = createSlug(updateData.propertyName);
      updateData.slug = await ensureUniqueSlug(baseSlug, pgHostelId);
    }

    // Update location if coordinates changed
    if (updateData.coordinates && updateData.coordinates.lat && updateData.coordinates.lng) {
      updateData.location = {
        type: 'Point',
        coordinates: [updateData.coordinates.lng, updateData.coordinates.lat], // [longitude, latitude] for PostGIS
        crs: { type: 'name', properties: { name: 'EPSG:4326' } }
      };
      updateData.lat = updateData.coordinates.lat;
      updateData.lng = updateData.coordinates.lng;
      delete updateData.coordinates; // Remove coordinates object as it's not a DB field
    }

    // Update the record
    await pgHostel.update(updateData);

    return {
      success: true,
      message: 'PG/Hostel updated successfully',
      data: pgHostel
    };
  } catch (error) {
    logger.error('Error updating PG/Hostel:', error);
    throw error;
  }
};

/**
 * Get PG/Hostel by ID
 * @param {number} pgHostelId - PG Hostel ID
 * @returns {Promise<object>} - Result object
 */
const getPgColiveHostelById = async (pgHostelId) => {
  try {
    const pgHostel = await PgColiveHostel.findByPk(pgHostelId, {
      include: [
        {
          model: PlatformUser,
          as: 'user',
          attributes: ['userId', 'firstName', 'lastName', 'email', 'phone']
        }
      ]
    });

    if (!pgHostel) {
      return {
        success: false,
        message: 'PG/Hostel not found',
        statusCode: 404
      };
    }

    return {
      success: true,
      data: pgHostel
    };
  } catch (error) {
    logger.error('Error fetching PG/Hostel:', error);
    throw error;
  }
};

/**
 * Get PG/Hostel by slug
 * @param {string} slug - PG Hostel slug
 * @returns {Promise<object>} - Result object
 */
const getPgColiveHostelBySlug = async (slug) => {
  try {
    const pgHostel = await PgColiveHostel.findOne({
      where: { slug },
      include: [
        {
          model: PlatformUser,
          as: 'user',
          attributes: ['userId', 'firstName', 'lastName', 'email', 'phone']
        }
      ]
    });

    if (!pgHostel) {
      return {
        success: false,
        message: 'PG/Hostel not found',
        statusCode: 404
      };
    }

    return {
      success: true,
      data: pgHostel
    };
  } catch (error) {
    logger.error('Error fetching PG/Hostel by slug:', error);
    throw error;
  }
};

/**
 * List PG/Hostels with filters and pagination
 * @param {object} filters - Filter criteria
 * @returns {Promise<object>} - Result object
 */
const listPgColiveHostels = async (filters = {}) => {
  try {
    const {
      publishStatus,
      verificationStatus,
      city,
      locality,
      genderAllowed,
      isBrandManaged,
      search,
      page = 1,
      limit = 20
    } = filters;

    const whereClause = {};

    // Apply filters
    if (publishStatus) {
      whereClause.publishStatus = publishStatus;
    }

    if (verificationStatus) {
      whereClause.verificationStatus = verificationStatus;
    }

    if (city) {
      whereClause.city = city;
    }

    if (locality) {
      whereClause.locality = locality;
    }

    if (genderAllowed) {
      whereClause.genderAllowed = genderAllowed;
    }

    if (isBrandManaged !== undefined) {
      whereClause.isBrandManaged = isBrandManaged;
    }

    // Search in property name and description
    if (search) {
      whereClause[Op.or] = [
        { propertyName: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { brandName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Pagination
    const offset = (page - 1) * limit;

    const { rows, count } = await PgColiveHostel.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: PlatformUser,
          as: 'user',
          attributes: ['userId', 'firstName', 'lastName', 'email', 'phone']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['pg_hostel_created_at', 'DESC']]
    });

    return {
      success: true,
      data: {
        pgHostels: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    logger.error('Error listing PG/Hostels:', error);
    throw error;
  }
};

/**
 * Search PG/Hostels near a location using PostGIS spatial query
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {number} radiusKm - Search radius in kilometers
 * @param {object} filters - Additional filter criteria
 * @returns {Promise<object>} - Result object
 */
const searchNearbyPgHostels = async (latitude, longitude, radiusKm, filters = {}) => {
  try {
    const {
      genderAllowed,
      isBrandManaged,
      page = 1,
      limit = 20
    } = filters;

    const whereClause = {
      // publishStatus: 'PUBLISHED',
      // verificationStatus: 'VERIFIED'
    };

    // Apply additional filters
    if (genderAllowed) {
      whereClause.genderAllowed = genderAllowed;
    }

    if (isBrandManaged !== undefined) {
      whereClause.isBrandManaged = isBrandManaged;
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
    const { rows, count } = await PgColiveHostel.findAndCountAll({
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
          as: 'user',
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
        pgHostels: rows,
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
    logger.error('Error searching nearby PG/Hostels:', error);
    throw error;
  }
};

/**
 * Get user's PG/Hostel profiles
 * @param {number} userId - User ID
 * @returns {Promise<object>} - Result object
 */
const getUserPgColiveHostels = async (userId) => {
  try {
    const pgHostels = await PgColiveHostel.findAll({
      where: { userId },
      order: [['pg_hostel_created_at', 'DESC']]
    });

    return {
      success: true,
      data: pgHostels
    };
  } catch (error) {
    logger.error('Error fetching user PG/Hostels:', error);
    throw error;
  }
};

/**
 * Delete PG/Colive/Hostel
 * @param {number} pgHostelId - PG/Hostel ID
 * @param {number} userId - User ID (for authorization)
 * @returns {Promise<object>} - Result object
 */
const deletePgColiveHostel = async (pgHostelId, userId) => {
  try {
    // Find the PG/Hostel
    const pgHostel = await PgColiveHostel.findOne({
      where: { pgHostelId }
    });

    if (!pgHostel) {
      return {
        success: false,
        message: 'PG/Hostel not found',
        statusCode: 404
      };
    }

    // Check if user is the owner
    if (pgHostel.userId !== userId) {
      return {
        success: false,
        message: 'Unauthorized: You are not the owner of this PG/Hostel',
        statusCode: 403
      };
    }

    // Delete the PG/Hostel
    await pgHostel.destroy();

    return {
      success: true,
      message: 'PG/Hostel deleted successfully'
    };
  } catch (error) {
    logger.error('Error deleting PG/Hostel:', error);
    return {
      success: false,
      message: 'An error occurred while deleting PG/Hostel',
      statusCode: 500
    };
  }
};

module.exports = {
  createPgColiveHostel,
  updatePgColiveHostel,
  getPgColiveHostelById,
  getPgColiveHostelBySlug,
  listPgColiveHostels,
  searchNearbyPgHostels,
  getUserPgColiveHostels,
  deletePgColiveHostel
};
