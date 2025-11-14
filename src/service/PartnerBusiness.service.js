const db = require("../entity/index.js");
const logger = require("../config/winston.config.js");

/**
 * Create or update partner business information
 * @param {number} userId - User ID
 * @param {Object} businessData - Business data
 * @returns {Promise<Object>} Business record
 */
async function createOrUpdateBusiness(userId, businessData) {
  try {
    // Check if business already exists for this user
    let business = await db.PartnerBusiness.findOne({
      where: { userId: userId }
    });

    const businessFields = {
      userId: userId,
      businessName: businessData.agencyName,
      registrationNumber: businessData.agencyRegistrationNumber,
      businessAddress: businessData.agencyAddress,
      businessEmail: businessData.agencyEmail,
      businessPhone: businessData.agencyPhone,
      businessType: 'AGENCY',
      businessStatus: 'PENDING_VERIFICATION',
      verificationStatus: 'PENDING'
    };

    if (business) {
      // Update existing business
      await business.update(businessFields);
      logger.info(`Updated business profile for user ${userId}`);
    } else {
      // Create new business
      business = await db.PartnerBusiness.create(businessFields);
      logger.info(`Created business profile for user ${userId}`);
    }

    return business.toJSON();
  } catch (error) {
    logger.error(`Error creating/updating business for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get business by userId
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Business data or null
 */
async function getBusinessByUserId(userId) {
  try {
    const business = await db.PartnerBusiness.findOne({
      where: { userId: userId }
    });

    if (!business) {
      return null;
    }

    return business.toJSON();
  } catch (error) {
    logger.error(`Error fetching business for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get business by businessId
 * @param {number} businessId - Business ID
 * @returns {Promise<Object>} Business data
 */
async function getBusinessById(businessId) {
  try {
    const business = await db.PartnerBusiness.findByPk(businessId, {
      include: [{
        model: db.PlatformUser,
        as: 'user',
        attributes: ['userId', 'firstName', 'lastName', 'email', 'phone']
      }]
    });

    if (!business) {
      throw new Error("Business not found");
    }

    return business.toJSON();
  } catch (error) {
    logger.error(`Error fetching business ${businessId}:`, error);
    throw error;
  }
}

/**
 * Update business verification status
 * @param {number} businessId - Business ID
 * @param {string} status - Verification status (PENDING, VERIFIED, REJECTED)
 * @param {string} notes - Verification notes
 * @param {number} verifiedBy - User ID of verifier
 * @returns {Promise<Object>} Updated business data
 */
async function updateVerificationStatus(businessId, status, notes = null, verifiedBy = null) {
  const validStatuses = ['PENDING', 'VERIFIED', 'REJECTED'];
  
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid verification status. Must be one of: ${validStatuses.join(', ')}`);
  }

  try {
    const business = await db.PartnerBusiness.findByPk(businessId);

    if (!business) {
      throw new Error("Business not found");
    }

    const updateFields = {
      verificationStatus: status,
      verificationNotes: notes
    };

    if (status === 'VERIFIED') {
      updateFields.verifiedAt = new Date();
      updateFields.verifiedBy = verifiedBy;
      updateFields.businessStatus = 'ACTIVE';
    }

    await business.update(updateFields);

    logger.info(`Business ${businessId} verification status updated to ${status}`);
    return business.toJSON();
  } catch (error) {
    logger.error(`Error updating verification status for business ${businessId}:`, error);
    throw error;
  }
}

/**
 * Get all businesses with filters
 * @param {Object} filters - Filter options
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Paginated businesses data
 */
async function getAllBusinesses(filters = {}, page = 1, limit = 10) {
  try {
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    if (filters.businessStatus) {
      whereClause.businessStatus = filters.businessStatus;
    }
    
    if (filters.verificationStatus) {
      whereClause.verificationStatus = filters.verificationStatus;
    }

    if (filters.businessType) {
      whereClause.businessType = filters.businessType;
    }

    if (filters.search) {
      whereClause[db.Sequelize.Op.or] = [
        { businessName: { [db.Sequelize.Op.like]: `%${filters.search}%` } },
        { businessEmail: { [db.Sequelize.Op.like]: `%${filters.search}%` } },
        { registrationNumber: { [db.Sequelize.Op.like]: `%${filters.search}%` } },
      ];
    }

    const { count, rows } = await db.PartnerBusiness.findAndCountAll({
      where: whereClause,
      limit: limit,
      offset: offset,
      order: [["business_created_at", "DESC"]],
      include: [{
        model: db.PlatformUser,
        as: 'user',
        attributes: ['userId', 'firstName', 'lastName', 'email', 'phone', 'accountType']
      }]
    });

    return {
      businesses: rows.map(business => business.toJSON()),
      pagination: {
        total: count,
        page: page,
        limit: limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  } catch (error) {
    logger.error("Error fetching all businesses:", error);
    throw error;
  }
}

/**
 * Delete business
 * @param {number} businessId - Business ID
 * @returns {Promise<void>}
 */
async function deleteBusiness(businessId) {
  try {
    const business = await db.PartnerBusiness.findByPk(businessId);

    if (!business) {
      throw new Error("Business not found");
    }

    await business.destroy();
    logger.info(`Business ${businessId} deleted`);
  } catch (error) {
    logger.error(`Error deleting business ${businessId}:`, error);
    throw error;
  }
}

module.exports = {
  createOrUpdateBusiness,
  getBusinessByUserId,
  getBusinessById,
  updateVerificationStatus,
  getAllBusinesses,
  deleteBusiness,
};
