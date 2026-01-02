const db = require("../entity");
const Developer = db.Developer;
const PlatformUser = db.PlatformUser;
const { Op } = require("sequelize");

 

/**
 * Create a new developer record from draft data
 * @param {number} userId - User ID
 * @param {number} draftId - Draft ID (required, ensures one draft = one publish)
 * @param {object} developerData - Developer data
 * @returns {Promise<object>} - Result object
 */
const createDeveloper = async (userId, draftId, developerData) => {
  try {
    // Check if developer already exists for this draft
    const existingDeveloper = await db.Developer.findOne({ where: { draftId } });
    
    if (existingDeveloper) {
      return {
        success: false,
        message: 'Developer already exists for this draft. Use update instead.',
        data: existingDeveloper
      };
    }

    // Create developer record
    const developer = await db.Developer.create({
      userId,
      draftId,
      developerName: developerData.developerName,
      subscribeForDeveloperPage: developerData.subscribeForDeveloperPage || false,
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
    const developer = await db.Developer.findOne({
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

    // Prepare update payload
    const updatePayload = {
      developerName: updateData.developerName,
      subscribeForDeveloperPage: updateData.subscribeForDeveloperPage !== undefined 
        ? updateData.subscribeForDeveloperPage 
        : developer.subscribeForDeveloperPage
    };

    // Reset to PENDING_REVIEW when republishing
    if (developer.publishStatus === 'REJECTED') {
      updatePayload.verificationStatus = 'PENDING';
    }

    await developer.update(updatePayload);

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
    const developer = await db.Developer.findByPk(developerId, {
      include: [
        {
          model: db.PlatformUser,
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
 * Get developers by user ID (all developers created by this user)
 * @param {number} userId - User ID
 * @returns {Promise<object>} - Result object with array of developers
 */
const getDevelopersByUserId = async (userId) => {
  try {
    const developers = await db.Developer.findAll({
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

 

    

    if (filters.search) {
      whereClause[Op.or] = [
        { developerName: { [Op.iLike]: `%${filters.search}%` } },
        { description: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await db.Developer.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [['developer_created_at', 'DESC']],
      include: [
        {
          model: db.PlatformUser,
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
    const developer = await db.Developer.findByPk(developerId);

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
    const developer = await db.Developer.findByPk(developerId);

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
    const developer = await db.Developer.findOne({
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
   getDevelopersByUserId,
  listDevelopers,
  updatePublishStatus,
  updateVerificationStatus,
  deleteDeveloper
};
