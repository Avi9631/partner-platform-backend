const logger = require("../config/winston.config.js");
const UserService = require("../service/UserService.service.js");
const { ApiResponse } = require("../utils/responseFormatter.js");

/**
 * Get user by userId (from authenticated request)
 * @route POST /partnerUser/get
 */
async function getUser(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const userId = req.user.userId;
    const user = await UserService.getUser(userId);

    apiResponse
      .status(200)
      .withMessage("User retrieved successfully")
      .withData({ user })
      .withMeta({
        userId: userId,
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while fetching user:`, err.message);
    apiResponse
      .status(err.message === "User not found" ? 404 : 500)
      .withMessage(err.message || "Failed to fetch user")
      .withError(err.message, err.code || "GET_USER_ERROR", "getUser")
      .withMeta({
        userId: req.user?.userId,
      })
      .error();
  }
}

/**
 * Update user information
 * @route PATCH /partnerUser/update
 * @body {firstName?, lastName?, phone?, accountType?, completeProfile?: boolean}
 */
async function updateUser(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const userId = req.user.userId;
    const updateData = req.body;
    const isProfileCompletion = updateData.completeProfile === true;

    // Validate update data
    if (!updateData || Object.keys(updateData).length === 0) {
      return apiResponse
        .status(400)
        .withMessage("No update data provided")
        .withError("No fields to update", "VALIDATION_ERROR", "updateUser")
        .error();
    }

    // If completing profile, validate required fields
    if (isProfileCompletion) {
      if (!updateData.firstName || !updateData.lastName || !updateData.phone) {
        return apiResponse
          .status(400)
          .withMessage("First name, last name, and phone are required to complete profile")
          .withError("Missing required fields", "VALIDATION_ERROR", "updateUser")
          .error();
      }
    }

    // Allowed fields to update
    const allowedFields = ['firstName', 'lastName', 'phone', 'accountType'];
    const updateFields = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateFields[field] = updateData[field];
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return apiResponse
        .status(400)
        .withMessage("No valid fields to update")
        .withError("Invalid update fields", "VALIDATION_ERROR", "updateUser")
        .error();
    }

    // Validate phone format if provided
    if (updateFields.phone) {
      const phoneRegex = /^[+]?[\d\s\-()]+$/;
      if (!phoneRegex.test(updateFields.phone)) {
        return apiResponse
          .status(400)
          .withMessage("Invalid phone number format")
          .withError("Phone number must contain only digits, spaces, +, -, ()", "VALIDATION_ERROR", "updateUser")
          .error();
      }
    }

    // Validate account type if provided
    if (updateFields.accountType && !['INDIVIDUAL', 'AGENT', 'ORGANIZATION'].includes(updateFields.accountType)) {
      return apiResponse
        .status(400)
        .withMessage("Invalid account type")
        .withError("Account type must be INDIVIDUAL, AGENT, or ORGANIZATION", "VALIDATION_ERROR", "updateUser")
        .error();
    }

    const updatedUser = await UserService.updateUser(userId, updateFields, isProfileCompletion);

    apiResponse
      .status(200)
      .withMessage(isProfileCompletion ? "Profile completed successfully" : "User updated successfully")
      .withData({ user: updatedUser })
      .withMeta({
        userId: userId,
        updatedFields: Object.keys(updateFields),
        profileCompleted: isProfileCompletion,
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while updating user:`, err.message);
    apiResponse
      .status(err.message === "User not found" ? 404 : 500)
      .withMessage(err.message || "Failed to update user")
      .withError(err.message, err.code || "UPDATE_USER_ERROR", "updateUser")
      .withMeta({
        userId: req.user?.userId,
      })
      .error();
  }
}

/**
 * Verify user phone number
 * @route POST /partnerUser/verifyPhone
 * @body {phone: string, verificationCode?: string}
 */
async function verifyPhone(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const userId = req.user.userId;
    const { phone, verificationCode } = req.body;

    // Validate phone number
    if (!phone) {
      return apiResponse
        .status(400)
        .withMessage("Phone number is required")
        .withError("Missing phone number", "VALIDATION_ERROR", "verifyPhone")
        .error();
    }

    // Basic phone validation (can be enhanced)
    const phoneRegex = /^[+]?[\d\s\-()]+$/;
    if (!phoneRegex.test(phone)) {
      return apiResponse
        .status(400)
        .withMessage("Invalid phone number format")
        .withError("Phone number must contain only digits, spaces, +, -, ()", "VALIDATION_ERROR", "verifyPhone")
        .error();
    }

    const updatedUser = await UserService.verifyPhone(userId, phone, verificationCode);

    apiResponse
      .status(200)
      .withMessage("Phone verified successfully")
      .withData({ user: updatedUser })
      .withMeta({
        userId: userId,
        phone: phone,
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while verifying phone:`, err.message);
    apiResponse
      .status(err.message === "User not found" ? 404 : err.message === "Invalid verification code" ? 400 : 500)
      .withMessage(err.message || "Failed to verify phone")
      .withError(err.message, err.code || "VERIFY_PHONE_ERROR", "verifyPhone")
      .withMeta({
        userId: req.user?.userId,
      })
      .error();
  }
}

/**
 * Get all users (admin function - add auth check for admin role)
 * @route GET /partnerUser/all
 * @query {userStatus?, accountType?, search?, page?, limit?}
 */
async function getAllUsers(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const { userStatus, accountType, search, page = 1, limit = 10 } = req.query;

    const filters = {};
    if (userStatus) filters.userStatus = userStatus;
    if (accountType) filters.accountType = accountType;
    if (search) filters.search = search;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;

    if (limitNum > 100) {
      return apiResponse
        .status(400)
        .withMessage("Limit cannot exceed 100")
        .withError("Maximum limit is 100", "VALIDATION_ERROR", "getAllUsers")
        .error();
    }

    const result = await UserService.getAllUsers(filters, pageNum, limitNum);

    apiResponse
      .status(200)
      .withMessage("Users retrieved successfully")
      .withData(result)
      .withMeta({
        requestedBy: req.user.userId,
        filters: filters,
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while fetching all users:`, err.message);
    apiResponse
      .status(500)
      .withMessage(err.message || "Failed to fetch users")
      .withError(err.message, err.code || "GET_ALL_USERS_ERROR", "getAllUsers")
      .withMeta({
        userId: req.user?.userId,
      })
      .error();
  }
}

/**
 * Update user status (admin function - add auth check for admin role)
 * @route PATCH /partnerUser/updateStatus
 * @body {targetUserId: number, status: string}
 */
async function updateUserStatus(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const { targetUserId, status } = req.body;

    if (!targetUserId || !status) {
      return apiResponse
        .status(400)
        .withMessage("Target user ID and status are required")
        .withError("Missing required fields", "VALIDATION_ERROR", "updateUserStatus")
        .error();
    }

    const updatedUser = await UserService.updateUserStatus(targetUserId, status);

    apiResponse
      .status(200)
      .withMessage("User status updated successfully")
      .withData({ user: updatedUser })
      .withMeta({
        updatedBy: req.user.userId,
        targetUserId: targetUserId,
        newStatus: status,
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while updating user status:`, err.message);
    apiResponse
      .status(err.message === "User not found" ? 404 : err.message.includes("Invalid status") ? 400 : 500)
      .withMessage(err.message || "Failed to update user status")
      .withError(err.message, err.code || "UPDATE_USER_STATUS_ERROR", "updateUserStatus")
      .withMeta({
        userId: req.user?.userId,
      })
      .error();
  }
}

module.exports = {
  getUser,
  updateUser,
  verifyPhone,
  getAllUsers,
  updateUserStatus,
};
