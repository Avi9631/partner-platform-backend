const logger = require("../config/winston.config.js");
const UserService = require("../service/UserService.service.js");
const PartnerBusinessService = require("../service/PartnerBusiness.service.js");
const { ApiResponse } = require("../utils/responseFormatter.js");
const { startWorkflow } = require("../utils/temporalClient.js");

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
 * @body {firstName?, lastName?, phone?, accountType?, latitude?, longitude?, address?}
 * @file profileVideo (multipart/form-data)
 */
async function updateUser(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const userId = req.user.userId;
    const updateData = req.body;
    const profileVideo = req.file;

    // Validate update data
    if ((!updateData || Object.keys(updateData).length === 0) && !profileVideo) {
      return apiResponse
        .status(400)
        .withMessage("No update data provided")
        .withError("No fields to update", "VALIDATION_ERROR", "updateUser")
        .error();
    }

    // Allowed fields to update
    const allowedFields = [
      'firstName', 
      'lastName', 
      'phone', 
      'accountType',
      'latitude',
      'longitude',
      'address'
    ];
    const updateFields = {};
    
    // Extract agency/business fields separately
    const businessFields = {
      agencyName: updateData.agencyName,
      agencyRegistrationNumber: updateData.agencyRegistrationNumber,
      agencyAddress: updateData.agencyAddress,
      agencyEmail: updateData.agencyEmail,
      agencyPhone: updateData.agencyPhone
    };

    for (const field of allowedFields) {
      if (updateData[field] !== undefined && updateData[field] !== '') {
        updateFields[field] = updateData[field];
      }
    }

    // Add profile video if uploaded
    if (profileVideo) {
      updateFields.profileVideo = `/uploads/profile-videos/${profileVideo.filename}`;
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
    if (updateFields.accountType && !['INDIVIDUAL', 'AGENT', 'AGENCY'].includes(updateFields.accountType)) {
      return apiResponse
        .status(400)
        .withMessage("Invalid account type")
        .withError("Account type must be INDIVIDUAL, AGENT, or AGENCY", "VALIDATION_ERROR", "updateUser")
        .error();
    }

    // Validate business email format if provided
    if (businessFields.agencyEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(businessFields.agencyEmail)) {
        return apiResponse
          .status(400)
          .withMessage("Invalid business email format")
          .withError("Business email must be a valid email address", "VALIDATION_ERROR", "updateUser")
          .error();
      }
    }

    // Validate business phone format if provided
    if (businessFields.agencyPhone) {
      const phoneRegex = /^[+]?[\d\s\-()]+$/;
      if (!phoneRegex.test(businessFields.agencyPhone)) {
        return apiResponse
          .status(400)
          .withMessage("Invalid business phone number format")
          .withError("Business phone must contain only digits, spaces, +, -, ()", "VALIDATION_ERROR", "updateUser")
          .error();
      }
    }

    // Validate coordinates if provided
    if (updateFields.latitude) {
      const lat = parseFloat(updateFields.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return apiResponse
          .status(400)
          .withMessage("Invalid latitude value")
          .withError("Latitude must be between -90 and 90", "VALIDATION_ERROR", "updateUser")
          .error();
      }
      updateFields.latitude = lat;
    }

    if (updateFields.longitude) {
      const lon = parseFloat(updateFields.longitude);
      if (isNaN(lon) || lon < -180 || lon > 180) {
        return apiResponse
          .status(400)
          .withMessage("Invalid longitude value")
          .withError("Longitude must be between -180 and 180", "VALIDATION_ERROR", "updateUser")
          .error();
      }
      updateFields.longitude = lon;
    }

    // Update business profile if AGENCY account type and business fields provided
    if (updateData.accountType === 'AGENCY' && businessFields.agencyName) {
      try {
        await PartnerBusinessService.createOrUpdateBusiness(userId, businessFields);
        logger.info(`Business profile updated for user ${userId}`);
      } catch (businessError) {
        logger.error(`Failed to update business profile for user ${userId}:`, businessError);
        // Continue with user update even if business update fails
      }
    }

    // Update user
    const updatedUser = await UserService.updateUser(userId, updateFields, false);
    
    // Include business data in response if AGENCY account type
    let businessData = null;
    if (updatedUser.accountType === 'AGENCY') {
      try {
        businessData = await PartnerBusinessService.getBusinessByUserId(userId);
      } catch (businessError) {
        logger.warn(`Could not fetch business data for user ${userId}:`, businessError);
      }
    }

    apiResponse
      .status(200)
      .withMessage("User updated successfully")
      .withData({ 
        user: updatedUser,
        business: businessData
      })
      .withMeta({
        userId: userId,
        updatedFields: Object.keys(updateFields),
        profileVideoUploaded: !!profileVideo,
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
 * Onboard user - complete profile setup for verification
 * @route POST /partnerUser/onboarding
 * @body {firstName, lastName, phone, accountType, latitude, longitude, address?, agencyName?, agencyRegistrationNumber?, agencyAddress?, agencyEmail?, agencyPhone?}
 * @file profileVideo (multipart/form-data)
 * 
 * This endpoint handles the initial partner onboarding with all required fields.
 * Profile is submitted for verification and profileCompleted is set when approved.
 */
async function onboardUser(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const userId = req.user.userId;
    const onboardingData = req.body;
    const profileVideo = req.file;

    // Validate all required fields for onboarding
    const missingFields = [];
    if (!onboardingData.firstName) missingFields.push("firstName");
    if (!onboardingData.lastName) missingFields.push("lastName");
    if (!onboardingData.phone) missingFields.push("phone");
    if (!onboardingData.accountType) missingFields.push("accountType");
    if (!onboardingData.latitude || !onboardingData.longitude) missingFields.push("location");
    if (!profileVideo) missingFields.push("profileVideo");

    // Additional validation for AGENCY account type
    if (onboardingData.accountType === 'AGENCY') {
      if (!onboardingData.agencyName) missingFields.push("agencyName");
      if (!onboardingData.agencyRegistrationNumber) missingFields.push("agencyRegistrationNumber");
      if (!onboardingData.agencyAddress) missingFields.push("agencyAddress");
      if (!onboardingData.agencyEmail) missingFields.push("agencyEmail");
      if (!onboardingData.agencyPhone) missingFields.push("agencyPhone");
    }

    if (missingFields.length > 0) {
      return apiResponse
        .status(400)
        .withMessage(`Missing required fields for onboarding: ${missingFields.join(", ")}`)
        .withError("Missing required fields", "VALIDATION_ERROR", "onboardUser")
        .withMeta({ missingFields })
        .error();
    }

    // Validate account type
    if (!['INDIVIDUAL', 'AGENT', 'AGENCY'].includes(onboardingData.accountType)) {
      return apiResponse
        .status(400)
        .withMessage("Invalid account type")
        .withError("Account type must be INDIVIDUAL, AGENT, or AGENCY", "VALIDATION_ERROR", "onboardUser")
        .error();
    }

    // Validate phone format
    const phoneRegex = /^[+]?[\d\s\-()]+$/;
    if (!phoneRegex.test(onboardingData.phone)) {
      return apiResponse
        .status(400)
        .withMessage("Invalid phone number format")
        .withError("Phone number must contain only digits, spaces, +, -, ()", "VALIDATION_ERROR", "onboardUser")
        .error();
    }

    // Validate business email format if provided
    if (onboardingData.agencyEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(onboardingData.agencyEmail)) {
        return apiResponse
          .status(400)
          .withMessage("Invalid business email format")
          .withError("Business email must be a valid email address", "VALIDATION_ERROR", "onboardUser")
          .error();
      }
    }

    // Validate business phone format if provided
    if (onboardingData.agencyPhone) {
      if (!phoneRegex.test(onboardingData.agencyPhone)) {
        return apiResponse
          .status(400)
          .withMessage("Invalid business phone number format")
          .withError("Business phone must contain only digits, spaces, +, -, ()", "VALIDATION_ERROR", "onboardUser")
          .error();
      }
    }

    // Validate coordinates
    const lat = parseFloat(onboardingData.latitude);
    const lon = parseFloat(onboardingData.longitude);
    
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return apiResponse
        .status(400)
        .withMessage("Invalid latitude value")
        .withError("Latitude must be between -90 and 90", "VALIDATION_ERROR", "onboardUser")
        .error();
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      return apiResponse
        .status(400)
        .withMessage("Invalid longitude value")
        .withError("Longitude must be between -180 and 180", "VALIDATION_ERROR", "onboardUser")
        .error();
    }

    // Prepare update fields
    const updateFields = {
      firstName: onboardingData.firstName,
      lastName: onboardingData.lastName,
      phone: onboardingData.phone,
      accountType: onboardingData.accountType,
      latitude: lat,
      longitude: lon,
      address: onboardingData.address || null,
      profileVideo: `/uploads/profile-videos/${profileVideo.filename}`,
      verificationStatus: 'PENDING',
      userStatus: 'ACTIVE'
    };

    // Prepare business fields for AGENCY accounts
    const businessFields = onboardingData.accountType === 'AGENCY' ? {
      agencyName: onboardingData.agencyName,
      agencyRegistrationNumber: onboardingData.agencyRegistrationNumber,
      agencyAddress: onboardingData.agencyAddress,
      agencyEmail: onboardingData.agencyEmail,
      agencyPhone: onboardingData.agencyPhone
    } : null;

    // Get user email for notification
    const currentUser = await UserService.getUser(userId);
    
    // Check if Temporal is available
    const temporalEnabled = process.env.TEMPORAL_ENABLED === 'true';
    
    if (temporalEnabled) {
      // Start temporal workflow for partner user onboarding
      const workflowId = `partner-onboarding-${userId}-${Date.now()}`;
      
      try {
        const { workflowId: wfId } = await startWorkflow(
          'partnerUserOnboarding',
          {
            userId,
            email: currentUser.email,
            profileData: {
              firstName: updateFields.firstName,
              lastName: updateFields.lastName,
              phone: updateFields.phone,
              latitude: updateFields.latitude,
              longitude: updateFields.longitude,
              address: updateFields.address,
              accountType: updateFields.accountType,
            },
            businessData: businessFields,
            videoPath: profileVideo.path,
            originalFilename: profileVideo.originalname,
          },
          workflowId
        );

        logger.info(`Partner onboarding workflow started for user ${userId}: ${wfId}`);

        // Return accepted status immediately - workflow processes async
        return apiResponse
          .status(202)
          .withMessage("Onboarding profile submitted for verification. Processing in progress.")
          .withData({ 
            workflowId: wfId,
            status: 'processing',
            message: 'Your profile is being processed. You will receive an email once verification is approved.'
          })
          .withMeta({
            userId: userId,
            onboardingSubmitted: true,
            workflowStarted: true,
            note: 'profileCompleted will be set to true when admin approves verification'
          })
          .success();

      } catch (workflowError) {
        logger.error(`Failed to start partner onboarding workflow for user ${userId}. Falling back to direct update.`, workflowError);
        // Fall through to direct update
      }
    }
    
    // Fallback: Direct database update (when Temporal is disabled or fails)
    logger.info(`Processing onboarding directly for user ${userId} (Temporal: ${temporalEnabled ? 'failed' : 'disabled'})`);
    
    // Create business profile if AGENCY account type
    if (businessFields) {
      try {
        await PartnerBusinessService.createOrUpdateBusiness(userId, businessFields);
        logger.info(`Business profile created during onboarding for user ${userId}`);
      } catch (businessError) {
        logger.error(`Failed to create business profile during onboarding for user ${userId}:`, businessError);
        return apiResponse
          .status(500)
          .withMessage("Failed to create business profile")
          .withError(businessError.message, "BUSINESS_PROFILE_ERROR", "onboardUser")
          .error();
      }
    }

    // Update user with onboarding data
    const updatedUser = await UserService.updateUser(userId, updateFields, false);
    
    // Include business data in response if AGENCY account type
    let businessData = null;
    if (updatedUser.accountType === 'AGENCY') {
      try {
        businessData = await PartnerBusinessService.getBusinessByUserId(userId);
      } catch (businessError) {
        logger.warn(`Could not fetch business data for user ${userId}:`, businessError);
      }
    }

    apiResponse
      .status(200)
      .withMessage("Onboarding profile submitted for verification successfully")
      .withData({ 
        user: updatedUser,
        business: businessData
      })
      .withMeta({
        userId: userId,
        onboardingSubmitted: true,
        profileVideoUploaded: true,
        verificationStatus: 'PENDING',
        note: 'profileCompleted will be set to true when admin approves verification'
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred during user onboarding:`, err.message);
    apiResponse
      .status(err.message === "User not found" ? 404 : 500)
      .withMessage(err.message || "Failed to complete onboarding")
      .withError(err.message, err.code || "ONBOARD_USER_ERROR", "onboardUser")
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

/**
 * Approve user verification (admin function - add auth check for admin role)
 * @route PATCH /partnerUser/approveVerification
 * @body {targetUserId: number, verificationNotes?: string}
 * 
 * This sets verificationStatus to APPROVED and profileCompleted to true
 */
async function approveVerification(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const { targetUserId, verificationNotes } = req.body;

    if (!targetUserId) {
      return apiResponse
        .status(400)
        .withMessage("Target user ID is required")
        .withError("Missing required field", "VALIDATION_ERROR", "approveVerification")
        .error();
    }

    const updatedUser = await UserService.approveVerification(
      targetUserId, 
      verificationNotes,
      req.user.userId // verifiedBy
    );

    apiResponse
      .status(200)
      .withMessage("User verification approved successfully")
      .withData({ user: updatedUser })
      .withMeta({
        approvedBy: req.user.userId,
        targetUserId: targetUserId,
        verificationStatus: 'APPROVED',
        profileCompleted: true,
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while approving verification:`, err.message);
    apiResponse
      .status(err.message === "User not found" ? 404 : 500)
      .withMessage(err.message || "Failed to approve verification")
      .withError(err.message, err.code || "APPROVE_VERIFICATION_ERROR", "approveVerification")
      .withMeta({
        userId: req.user?.userId,
      })
      .error();
  }
}

/**
 * Reject user verification (admin function - add auth check for admin role)
 * @route PATCH /partnerUser/rejectVerification
 * @body {targetUserId: number, verificationNotes: string}
 * 
 * This sets verificationStatus to REJECTED
 */
async function rejectVerification(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const { targetUserId, verificationNotes } = req.body;

    if (!targetUserId) {
      return apiResponse
        .status(400)
        .withMessage("Target user ID is required")
        .withError("Missing required field", "VALIDATION_ERROR", "rejectVerification")
        .error();
    }

    if (!verificationNotes) {
      return apiResponse
        .status(400)
        .withMessage("Verification notes are required for rejection")
        .withError("Missing required field", "VALIDATION_ERROR", "rejectVerification")
        .error();
    }

    const updatedUser = await UserService.rejectVerification(
      targetUserId, 
      verificationNotes
    );

    apiResponse
      .status(200)
      .withMessage("User verification rejected")
      .withData({ user: updatedUser })
      .withMeta({
        rejectedBy: req.user.userId,
        targetUserId: targetUserId,
        verificationStatus: 'REJECTED',
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while rejecting verification:`, err.message);
    apiResponse
      .status(err.message === "User not found" ? 404 : 500)
      .withMessage(err.message || "Failed to reject verification")
      .withError(err.message, err.code || "REJECT_VERIFICATION_ERROR", "rejectVerification")
      .withMeta({
        userId: req.user?.userId,
      })
      .error();
  }
}

module.exports = {
  getUser,
  updateUser,
  onboardUser,
  verifyPhone,
  getAllUsers,
  updateUserStatus,
  approveVerification,
  rejectVerification,
};
