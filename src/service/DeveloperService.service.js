const db = require("../entity");
const Developer = db.Developer;
const PlatformUser = db.PlatformUser;
const { Op } = require("sequelize");

/**
 * Create slug from developer name
 * @param {string} name - Developer name
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
 * @param {number} excludeDeveloperId - Developer ID to exclude from check
 * @returns {Promise<string>} - Unique slug
 */
const ensureUniqueSlug = async (baseSlug, excludeDeveloperId = null) => {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const whereClause = { slug };
    if (excludeDeveloperId) {
      whereClause.developerId = { [Op.ne]: excludeDeveloperId };
    }
    
    const existing = await Developer.findOne({ where: whereClause });
    if (!existing) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

/**
 * Create a new developer record from draft data
 * @param {number} userId - User ID
 * @param {number} draftId - Draft ID (required, ensures one draft = one publish)
 * @param {object} developerData - Developer data
 * @returns {Promise<object>} - Result object
 */
const createDeveloper = async (userId, draftId, developerData) => {
  try {
    // Generate unique slug
    const baseSlug = createSlug(developerData.developerName);
    const slug = await ensureUniqueSlug(baseSlug);

    // Create developer record
    const developer = await Developer.create({
      userId,
      draftId,
      developerName: developerData.developerName,
      developerType: developerData.developerType,
      description: developerData.description,
      establishedYear: developerData.establishedYear,
      registrationNumber: developerData.registrationNumber,
      primaryContactEmail: developerData.primaryContactEmail,
      primaryContactPhone: developerData.primaryContactPhone,
      socialLinks: developerData.socialLinks || [],
      totalProjectsCompleted: developerData.totalProjectsCompleted || 0,
      totalProjectsOngoing: developerData.totalProjectsOngoing || 0,
      totalUnitsDelivered: developerData.totalUnitsDelivered || 0,
      projectTypes: developerData.projectTypes || [],
      operatingStates: developerData.operatingStates || [],
      slug,
      publishStatus: 'PENDING_REVIEW',
      verificationStatus: 'PENDING'
    });

    return {
      success: true,
      message: 'Developer profile created successfully',
      data: developer
    };
  } catch (error) {
    console.error('Error creating developer:', error);
    throw error;
  }
};

/**
 * Update developer record
 * @param {number} developerId - Developer ID
 * @param {number} userId - User ID for authorization
 * @param {object} updateData - Data to update
 * @returns {Promise<object>} - Result object
 */
const updateDeveloper = async (developerId, userId, updateData) => {
  try {
    const developer = await Developer.findOne({
      where: {
        developerId,
        userId
      }
    });

    if (!developer) {
      return {
        success: false,
        message: 'Developer not found or unauthorized'
      };
    }

    // If name is being updated, regenerate slug
    if (updateData.developerName && updateData.developerName !== developer.developerName) {
      const baseSlug = createSlug(updateData.developerName);
      updateData.slug = await ensureUniqueSlug(baseSlug, developerId);
    }

    await developer.update(updateData);

    return {
      success: true,
      message: 'Developer profile updated successfully',
      data: developer
    };
  } catch (error) {
    console.error('Error updating developer:', error);
    throw error;
  }
};

/**
 * Get developer by ID
 * @param {number} developerId - Developer ID
 * @returns {Promise<object>} - Result object
 */
const getDeveloperById = async (developerId) => {
  try {
    const developer = await Developer.findByPk(developerId, {
      include: [
        {
          model: PlatformUser,
          as: 'user',
          attributes: ['userId', 'firstName', 'lastName', 'userEmail', 'profileImage']
        }
      ]
    });

    if (!developer) {
      return {
        success: false,
        message: 'Developer not found'
      };
    }

    return {
      success: true,
      data: developer
    };
  } catch (error) {
    console.error('Error getting developer:', error);
    throw error;
  }
};

/**
 * Get developer by slug
 * @param {string} slug - Developer slug
 * @returns {Promise<object>} - Result object
 */
const getDeveloperBySlug = async (slug) => {
  try {
    const developer = await Developer.findOne({
      where: { slug },
      include: [
        {
          model: PlatformUser,
          as: 'user',
          attributes: ['userId', 'firstName', 'lastName', 'userEmail', 'profileImage']
        }
      ]
    });

    if (!developer) {
      return {
        success: false,
        message: 'Developer not found'
      };
    }

    // Increment view count
    await developer.increment('viewCount');

    return {
      success: true,
      data: developer
    };
  } catch (error) {
    console.error('Error getting developer by slug:', error);
    throw error;
  }
};

/**
 * Get developers by user ID (all developers created by this user)
 * @param {number} userId - User ID
 * @returns {Promise<object>} - Result object with array of developers
 */
const getDevelopersByUserId = async (userId) => {
  try {
    const developers = await Developer.findAll({
      where: { userId },
      order: [['developer_created_at', 'DESC']]
    });

    return {
      success: true,
      data: developers,
      count: developers.length
    };
  } catch (error) {
    console.error('Error getting developers by user ID:', error);
    throw error;
  }
};

/**
 * List developers with filters and pagination
 * @param {object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<object>} - Result object with developers and pagination
 */
const listDevelopers = async (filters = {}, page = 1, limit = 20) => {
  try {
    const whereClause = {};

    if (filters.developerType) {
      whereClause.developerType = filters.developerType;
    }

    if (filters.publishStatus) {
      whereClause.publishStatus = filters.publishStatus;
    } else {
      // Default to only showing published developers
      whereClause.publishStatus = 'PUBLISHED';
    }

    if (filters.verificationStatus) {
      whereClause.verificationStatus = filters.verificationStatus;
    }

    if (filters.operatingState) {
      whereClause.operatingStates = {
        [Op.contains]: [filters.operatingState]
      };
    }

    if (filters.projectType) {
      whereClause.projectTypes = {
        [Op.contains]: [filters.projectType]
      };
    }

    if (filters.search) {
      whereClause[Op.or] = [
        { developerName: { [Op.iLike]: `%${filters.search}%` } },
        { description: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Developer.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['developer_created_at', 'DESC']],
      include: [
        {
          model: PlatformUser,
          as: 'user',
          attributes: ['userId', 'firstName', 'lastName', 'profileImage']
        }
      ]
    });

    return {
      success: true,
      data: {
        developers: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    console.error('Error listing developers:', error);
    throw error;
  }
};

/**
 * Update developer publish status
 * @param {number} developerId - Developer ID
 * @param {string} status - New status
 * @param {string} notes - Optional notes
 * @returns {Promise<object>} - Result object
 */
const updatePublishStatus = async (developerId, status, notes = null) => {
  try {
    const developer = await Developer.findByPk(developerId);

    if (!developer) {
      return {
        success: false,
        message: 'Developer not found'
      };
    }

    const updateData = { publishStatus: status };

    if (status === 'PUBLISHED') {
      updateData.publishedAt = new Date();
    }

    if (notes) {
      updateData.verificationNotes = notes;
    }

    await developer.update(updateData);

    return {
      success: true,
      message: `Developer status updated to ${status}`,
      data: developer
    };
  } catch (error) {
    console.error('Error updating publish status:', error);
    throw error;
  }
};

/**
 * Update developer verification status
 * @param {number} developerId - Developer ID
 * @param {string} status - Verification status
 * @param {number} verifiedBy - User ID of verifier
 * @param {string} notes - Verification notes
 * @returns {Promise<object>} - Result object
 */
const updateVerificationStatus = async (developerId, status, verifiedBy, notes = null) => {
  try {
    const developer = await Developer.findByPk(developerId);

    if (!developer) {
      return {
        success: false,
        message: 'Developer not found'
      };
    }

    const updateData = {
      verificationStatus: status,
      verifiedBy,
      verifiedAt: new Date()
    };

    if (notes) {
      updateData.verificationNotes = notes;
    }

    await developer.update(updateData);

    return {
      success: true,
      message: `Developer verification status updated to ${status}`,
      data: developer
    };
  } catch (error) {
    console.error('Error updating verification status:', error);
    throw error;
  }
};

/**
 * Delete developer (soft delete)
 * @param {number} developerId - Developer ID
 * @param {number} userId - User ID for authorization
 * @returns {Promise<object>} - Result object
 */
const deleteDeveloper = async (developerId, userId) => {
  try {
    const developer = await Developer.findOne({
      where: {
        developerId,
        userId
      }
    });

    if (!developer) {
      return {
        success: false,
        message: 'Developer not found or unauthorized'
      };
    }

    await developer.destroy();

    return {
      success: true,
      message: 'Developer profile deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting developer:', error);
    throw error;
  }
};

module.exports = {
  createDeveloper,
  updateDeveloper,
  getDeveloperById,
  getDeveloperBySlug,
  getDevelopersByUserId,
  listDevelopers,
  updatePublishStatus,
  updateVerificationStatus,
  deleteDeveloper
};
