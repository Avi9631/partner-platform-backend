const db = require("../entity/index.js");
const logger = require("../config/winston.config.js");

const getInitials = (name) => {
  const trimmedName = name.trim();

  if (!trimmedName.includes(" ")) {
    return trimmedName.slice(0, 2).toUpperCase();
  }

  const words = trimmedName.split(" ").filter((word) => word.length > 0);
  const initials = words.map((word) => word.charAt(0).toUpperCase()).join("");

  return initials.slice(0, 2);
};

/**
 * Get user by userId or email
 * @param {number} userId - User ID
 * @param {string} email - User email
 * @returns {Promise<Object>} User data
 */
async function getUser(userId, email) {
  if (!userId && !email) {
    throw new Error("User ID or email is required");
  }

  try {
    const userData = await db.PlatformUser.findOne({
      where: {
        ...(email && { email: email }),
        ...(userId && { userId: userId }),
      },
      attributes: {
        exclude: ["user_deleted_at"], // Exclude sensitive/unnecessary fields
      },
      include: [
        {
          model: db.PartnerBusiness,
          as: "business",
          required: false, // LEFT JOIN - user may not have a business yet
        },
      ],
    });

    if (!userData) {
      logger.warn(`User not found with ${userId ? `ID: ${userId}` : `email: ${email}`}`);
      throw new Error("User not found");
    }

    return userData.toJSON();
  } catch (error) {
    logger.error("Error in getUser:", error);
    throw error;
  }
}

/**
 * Update user information
 * @param {number} userId - User ID
 * @param {Object} updateData - Data to update
 * @param {boolean} isProfileCompletion - Whether this is a profile completion update
 * @returns {Promise<Object>} Updated user data
 */
async function updateUser(userId, updateData, isProfileCompletion = false) {
  try {
    const user = await db.PlatformUser.findByPk(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Update name initial if firstName or lastName changed
    if (updateData.firstName || updateData.lastName) {
      const firstName = updateData.firstName || user.firstName;
      const lastName = updateData.lastName || user.lastName;
      updateData.nameInitial = getInitials(`${firstName} ${lastName}`);
    }

    // If completing profile, mark as completed and activate user
    if (isProfileCompletion) {
      updateData.profileCompleted = true;
      updateData.userStatus = 'ACTIVE';
    }

    // Prevent updating sensitive fields
    delete updateData.userId;
    delete updateData.emailVerifiedAt;
    delete updateData.phoneVerifiedAt;
    delete updateData.completeProfile; // Remove the flag from actual update

    // Update user
    await user.update(updateData);

    logger.info(`User ${userId} updated successfully${isProfileCompletion ? ' (profile completed)' : ''}`);
    return user.toJSON();
  } catch (error) {
    logger.error(`Error updating user ${userId}:`, error);
    throw error;
  }
}

/**
 * Verify user phone number
 * @param {number} userId - User ID
 * @param {string} phone - Phone number
 * @param {string} verificationCode - Verification code (for future OTP implementation)
 * @returns {Promise<Object>} Updated user data
 */
async function verifyPhone(userId, phone, verificationCode = null) {
  try {
    const user = await db.PlatformUser.findByPk(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // TODO: Implement actual OTP verification logic here
    // For now, we'll just update the phone and mark as verified

    if (verificationCode) {
      // In production, verify the code against stored OTP
      // const isValid = await verifyOTP(phone, verificationCode);
      // if (!isValid) throw new Error("Invalid verification code");
    }

    await user.update({
      phone: phone,
      phoneVerifiedAt: new Date(),
    });

    logger.info(`Phone verified for user ${userId}`);
    return user.toJSON();
  } catch (error) {
    logger.error(`Error verifying phone for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get all users with optional filters
 * @param {Object} filters - Filter options
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} Paginated users data
 */
async function getAllUsers(filters = {}, page = 1, limit = 10) {
  try {
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    if (filters.userStatus) {
      whereClause.userStatus = filters.userStatus;
    }
    
    if (filters.accountType) {
      whereClause.accountType = filters.accountType;
    }

    if (filters.search) {
      whereClause[db.Sequelize.Op.or] = [
        { firstName: { [db.Sequelize.Op.like]: `%${filters.search}%` } },
        { lastName: { [db.Sequelize.Op.like]: `%${filters.search}%` } },
        { email: { [db.Sequelize.Op.like]: `%${filters.search}%` } },
      ];
    }

    const { count, rows } = await db.PlatformUser.findAndCountAll({
      where: whereClause,
      limit: limit,
      offset: offset,
      order: [["user_created_at", "DESC"]],
      attributes: {
        exclude: ["user_deleted_at"],
      },
    });

    return {
      users: rows.map(user => user.toJSON()),
      pagination: {
        total: count,
        page: page,
        limit: limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  } catch (error) {
    logger.error("Error fetching all users:", error);
    throw error;
  }
}

/**
 * Update user status
 * @param {number} userId - User ID
 * @param {string} newStatus - New status (PENDING, APPROVED, REJECTED, ACTIVE, INACTIVE, SUSPENDED)
 * @returns {Promise<Object>} Updated user data
 */
async function updateUserStatus(userId, newStatus) {
  const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE', 'SUSPENDED'];
  
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  try {
    const user = await db.PlatformUser.findByPk(userId);

    if (!user) {
      throw new Error("User not found");
    }

    await user.update({ userStatus: newStatus });

    logger.info(`User ${userId} status updated to ${newStatus}`);
    return user.toJSON();
  } catch (error) {
    logger.error(`Error updating status for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Approve user verification
 * Sets verificationStatus to APPROVED and profileCompleted to true
 * @param {number} userId - User ID
 * @param {string} verificationNotes - Optional verification notes
 * @param {number} verifiedBy - Admin user ID who approved
 * @returns {Promise<Object>} Updated user data
 */
async function approveVerification(userId, verificationNotes = null, verifiedBy = null) {
  try {
    const user = await db.PlatformUser.findByPk(userId);

    if (!user) {
      throw new Error("User not found");
    }

    await user.update({ 
      verificationStatus: 'APPROVED',
      profileCompleted: true, // Only set to true upon approval
      verificationNotes: verificationNotes,
      verifiedAt: new Date(),
      verifiedBy: verifiedBy
    });

    logger.info(`User ${userId} verification approved by ${verifiedBy || 'system'}`);
    return user.toJSON();
  } catch (error) {
    logger.error(`Error approving verification for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Reject user verification
 * Sets verificationStatus to REJECTED
 * @param {number} userId - User ID
 * @param {string} verificationNotes - Rejection reason (required)
 * @returns {Promise<Object>} Updated user data
 */
async function rejectVerification(userId, verificationNotes) {
  try {
    const user = await db.PlatformUser.findByPk(userId);

    if (!user) {
      throw new Error("User not found");
    }

    await user.update({ 
      verificationStatus: 'REJECTED',
      verificationNotes: verificationNotes,
      profileCompleted: false // Ensure it stays false on rejection
    });

    logger.info(`User ${userId} verification rejected`);
    return user.toJSON();
  } catch (error) {
    logger.error(`Error rejecting verification for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Update last login timestamp
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
async function updateLastLogin(userId) {
  try {
    await db.PlatformUser.update(
      { lastLoginAt: new Date() },
      { where: { userId: userId } }
    );
    logger.info(`Last login updated for user ${userId}`);
  } catch (error) {
    logger.error(`Error updating last login for user ${userId}:`, error);
    // Don't throw error as this is not critical
  }
}

/**
 * Determine account type based on business verification
 * Account is BUSINESS if a verified partner business exists, otherwise INDIVIDUAL
 * @param {Object} user - User object with business relationship loaded
 * @returns {string} Account type ('BUSINESS' or 'INDIVIDUAL')
 */
function getAccountType(user) {
  return (user.business && user.business.verificationStatus === 'APPROVED') 
    ? 'BUSINESS' 
    : 'INDIVIDUAL';
}

module.exports = {
  getUser,
  updateUser,
  verifyPhone,
  getAllUsers,
  updateUserStatus,
  approveVerification,
  rejectVerification,
  updateLastLogin,
  getAccountType,
};
