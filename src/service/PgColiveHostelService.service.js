const db = require("../entity");
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
      coordinates: pgHostelData.coordinates,
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
    console.error('Error creating PG/Colive/Hostel:', error);
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

    // Update the record
    await pgHostel.update(updateData);

    return {
      success: true,
      message: 'PG/Hostel updated successfully',
      data: pgHostel
    };
  } catch (error) {
    console.error('Error updating PG/Hostel:', error);
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
          attributes: ['userId', 'name', 'email', 'phoneNumber']
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
    console.error('Error fetching PG/Hostel:', error);
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
          attributes: ['userId', 'name', 'email', 'phoneNumber']
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
    console.error('Error fetching PG/Hostel by slug:', error);
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
          attributes: ['userId', 'name', 'email']
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
    console.error('Error listing PG/Hostels:', error);
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
    console.error('Error fetching user PG/Hostels:', error);
    throw error;
  }
};

module.exports = {
  createPgColiveHostel,
  updatePgColiveHostel,
  getPgColiveHostelById,
  getPgColiveHostelBySlug,
  listPgColiveHostels,
  getUserPgColiveHostels
};
