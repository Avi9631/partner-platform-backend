const logger = require("../config/winston.config.js");
const UserService = require("../service/UserService.service.js");
const PartnerBusinessService = require("../service/PartnerBusiness.service.js");
const { ApiResponse } = require("../utils/responseFormatter.js");
const { runWorkflowAsync, runWorkflowDirect, WORKFLOWS } = require("../temporal/utils/workflowHelper.js");

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
      'latitude',
      'longitude',
      'address'
    ];
    const updateFields = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined && updateData[field] !== '') {
        updateFields[field] = updateData[field];
      }
    }

    // Note: Profile video is handled separately through workflow
    // If video is uploaded, it will be processed by temporal workflow
    if (profileVideo) {
      // Video will be uploaded to S3 via workflow, not saved locally
      logger.info(`Profile video received for user ${userId}, size: ${profileVideo.size} bytes`);
    }

    if (Object.keys(updateFields).length === 0 && !profileVideo) {
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
    // if (updateFields.accountType && !['INDIVIDUAL', 'AGENT', 'BUSINESS'].includes(updateFields.accountType)) {
    //   return apiResponse
    //     .status(400)
    //     .withMessage("Invalid account type")
    //     .withError("Account type must be INDIVIDUAL, AGENT, or BUSINESS", "VALIDATION_ERROR", "updateUser")
    //     .error();
    // }

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

    // Update user
    const updatedUser = await UserService.updateUser(userId, updateFields, false);
    
    // Include business data in response if BUSINESS account type
    let businessData = null;
      try {
        businessData = await PartnerBusinessService.getBusinessByUserId(userId);
      } catch (businessError) {
        logger.warn(`Could not fetch business data for user ${userId}:`, businessError);
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
    // if (!onboardingData.accountType) missingFields.push("accountType");
    if (!onboardingData.latitude || !onboardingData.longitude) missingFields.push("location");
    if (!profileVideo) missingFields.push("profileVideo");

    // Additional validation for BUSINESS account type
    // if (onboardingData.accountType === 'BUSINESS') {
    //   if (!onboardingData.agencyName) missingFields.push("agencyName");
    //   if (!onboardingData.agencyRegistrationNumber) missingFields.push("agencyRegistrationNumber");
    //   if (!onboardingData.agencyAddress) missingFields.push("agencyAddress");
    //   if (!onboardingData.agencyEmail) missingFields.push("agencyEmail");
    //   if (!onboardingData.agencyPhone) missingFields.push("agencyPhone");
    // }

    if (missingFields.length > 0) {
      return apiResponse
        .status(400)
        .withMessage(`Missing required fields for onboarding: ${missingFields.join(", ")}`)
        .withError("Missing required fields", "VALIDATION_ERROR", "onboardUser")
        .withMeta({ missingFields })
        .error();
    }

    // Validate account type
    // if (!['INDIVIDUAL', 'AGENT', 'BUSINESS'].includes(onboardingData.accountType)) {
    //   return apiResponse
    //     .status(400)
    //     .withMessage("Invalid account type")
    //     .withError("Account type must be INDIVIDUAL, AGENT, or BUSINESS", "VALIDATION_ERROR", "onboardUser")
    //     .error();
    // }

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
      // accountType: onboardingData.accountType,
      latitude: lat,
      longitude: lon,
      address: onboardingData.address || null,
      verificationStatus: 'PENDING',
      userStatus: 'ACTIVE'
      // Note: profileVideo will be set by the workflow after S3 upload
    };

    // Prepare business fields for BUSINESS accounts
    // const businessFields = onboardingData.accountType === 'BUSINESS' ? {
    //   agencyName: onboardingData.agencyName,
    //   agencyRegistrationNumber: onboardingData.agencyRegistrationNumber,
    //   agencyAddress: onboardingData.agencyAddress,
    //   agencyEmail: onboardingData.agencyEmail,
    //   agencyPhone: onboardingData.agencyPhone
    // } : null;

    // Get user email for notification
    const currentUser = await UserService.getUser(userId);
    
    // Use skip-workflow (direct execution)
    const workflowId = `partner-onboarding-${userId}-${Date.now()}`;
    
    const result = await runWorkflowDirect(
      WORKFLOWS.PARTNER_ONBOARDING,
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
        },
        videoBuffer: profileVideo.buffer,
        originalFilename: profileVideo.originalname,
        videoMimetype: profileVideo.mimetype,
        videoSize: profileVideo.size,
      },
      workflowId
    );

    logger.info(`Partner onboarding workflow started for user ${userId}: ${result.workflowId} (mode: direct)`);

    // Return accepted status immediately - workflow processes async
    return apiResponse
      .status(202)
      .withMessage("Onboarding profile submitted for verification. Processing in progress.")
      .withData({ 
        workflowId: result.workflowId,
        status: 'processing',
        message: 'Your profile is being processed. You will receive an email once verification is approved.',
        executionMode: 'direct'
      })
      .withMeta({
        userId: userId,
        onboardingSubmitted: true,
        workflowStarted: true,
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
    // if (accountType) filters.accountType = accountType;
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
 * Onboard business partner - complete business profile setup for verification
 * @route POST /partnerUser/businessOnboarding
 * @body {businessName, registrationNumber, businessAddress, businessEmail, businessPhones: [{phone: string}]}
 * 
 * This endpoint handles business partner onboarding with all required business details.
 * Business profile is submitted for verification.
 */
async function onboardBusinessPartner(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const userId = req.user.userId;
    const businessData = req.body;

    // Validate all required fields for business onboarding
    const missingFields = [];
    if (!businessData.businessName) missingFields.push("businessName");
    if (!businessData.registrationNumber) missingFields.push("registrationNumber");
    if (!businessData.businessAddress) missingFields.push("businessAddress");
    if (!businessData.businessEmail) missingFields.push("businessEmail");

    // Parse businessPhones if it's a JSON string
    if (businessData.businessPhones) {
      try {
        if (typeof businessData.businessPhones === 'string') {
          businessData.businessPhones = JSON.parse(businessData.businessPhones);
        }
      } catch (parseError) {
        return apiResponse
          .status(400)
          .withMessage("Invalid businessPhones format. Must be a JSON array of objects with 'phone' property.")
          .withError("JSON parse error", "VALIDATION_ERROR", "onboardBusinessPartner")
          .error();
      }
    }

    // Validate businessPhones array
    if (!businessData.businessPhones || !Array.isArray(businessData.businessPhones) || businessData.businessPhones.length === 0) {
      missingFields.push("businessPhones");
    }

    if (missingFields.length > 0) {
      return apiResponse
        .status(400)
        .withMessage(`Missing required fields for business onboarding: ${missingFields.join(", ")}`)
        .withError("Missing required fields", "VALIDATION_ERROR", "onboardBusinessPartner")
        .withMeta({ missingFields })
        .error();
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(businessData.businessEmail)) {
      return apiResponse
        .status(400)
        .withMessage("Invalid business email format")
        .withError("Business email must be a valid email address", "VALIDATION_ERROR", "onboardBusinessPartner")
        .error();
    }

    // Validate phone format for each phone in the array
    const phoneRegex = /^[+]?[\d\s\-()]+$/;
    for (let i = 0; i < businessData.businessPhones.length; i++) {
      const phoneObj = businessData.businessPhones[i];
      if (!phoneObj.phone || !phoneRegex.test(phoneObj.phone)) {
        return apiResponse
          .status(400)
          .withMessage(`Invalid phone number format at index ${i}`)
          .withError("Phone number must contain only digits, spaces, +, -, ()", "VALIDATION_ERROR", "onboardBusinessPartner")
          .error();
      }
    }

    // Get user email for notification
    const currentUser = await UserService.getUser(userId);
    
    // Use skip-workflow (direct execution)
    const workflowId = `business-onboarding-${userId}-${Date.now()}`;
    
    const result = await runWorkflowDirect(
      WORKFLOWS.PARTNER_BUSINESS_ONBOARDING,
      {
        userId,
        email: currentUser.email,
        businessData: {
          businessName: businessData.businessName,
          registrationNumber: businessData.registrationNumber,
          businessAddress: businessData.businessAddress,
          businessEmail: businessData.businessEmail,
          businessPhones: businessData.businessPhones,
        },
      },
      workflowId
    );

    logger.info(`Business onboarding workflow started for user ${userId}: ${result.workflowId} (mode: direct)`);

    // Return accepted status immediately - workflow processes async
    return apiResponse
      .status(202)
      .withMessage("Business profile submitted for verification. Processing in progress.")
      .withData({ 
        workflowId: result.workflowId,
        status: 'processing',
        message: 'Your business profile is being processed. You will receive an email once verification is complete.',
        executionMode: 'direct'
      })
      .withMeta({
        userId: userId,
        businessOnboardingSubmitted: true,
        workflowStarted: true,
      })
      .success();
    
    // Create business profile using service
    try {
      const business = await PartnerBusinessService.createOrUpdateBusiness(userId, {
        agencyName: businessData.businessName,
        agencyRegistrationNumber: businessData.registrationNumber,
        agencyAddress: businessData.businessAddress,
        agencyEmail: businessData.businessEmail,
        agencyPhone: businessData.businessPhones,
      });
      
      logger.info(`Business profile created for user ${userId}, ID: ${business.businessId}`);

      apiResponse
        .status(200)
        .withMessage("Business profile submitted for verification successfully")
        .withData({ 
          business,
          verificationStatus: 'PENDING'
        })
        .withMeta({
          userId: userId,
          businessOnboardingSubmitted: true,
        })
        .success();
    } catch (businessError) {
      logger.error(`Failed to create business profile for user ${userId}:`, businessError);
      return apiResponse
        .status(500)
        .withMessage("Failed to create business profile")
        .withError(businessError.message, "BUSINESS_CREATION_ERROR", "onboardBusinessPartner")
        .error();
    }
  } catch (err) {
    logger.error(`Error occurred during business partner onboarding:`, err.message);
    apiResponse
      .status(err.message === "User not found" ? 404 : 500)
      .withMessage(err.message || "Failed to complete business onboarding")
      .withError(err.message, err.code || "ONBOARD_BUSINESS_ERROR", "onboardBusinessPartner")
      .withMeta({
        userId: req.user?.userId,
      })
      .error();
  }
}

/**
 * Update business profile information
 * @route PATCH /partnerUser/updateBusiness
 * @body {businessName?, registrationNumber?, businessAddress?, businessEmail?, businessPhones?: [{phone: string}]}
 */
async function updateBusinessProfile(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const userId = req.user.userId;
    const updateData = req.body;

    // Validate that user has a verified business (BUSINESS account type)
    const user = await UserService.getUser(userId);
    const accountType = UserService.getAccountType(user);
    
    if (accountType !== 'BUSINESS') {
      return apiResponse
        .status(403)
        .withMessage("Business profile update is only available for BUSINESS accounts")
        .withError("User does not have a verified business account", "AUTHORIZATION_ERROR", "updateBusinessProfile")
        .error();
    }

    // Validate update data
    if (!updateData || Object.keys(updateData).length === 0) {
      return apiResponse
        .status(400)
        .withMessage("No update data provided")
        .withError("No fields to update", "VALIDATION_ERROR", "updateBusinessProfile")
        .error();
    }

    // Parse businessPhones if it's a JSON string
    if (updateData.businessPhones) {
      try {
        if (typeof updateData.businessPhones === 'string') {
          updateData.businessPhones = JSON.parse(updateData.businessPhones);
        }
      } catch (parseError) {
        return apiResponse
          .status(400)
          .withMessage("Invalid businessPhones format. Must be a JSON array of objects with 'phone' property.")
          .withError("JSON parse error", "VALIDATION_ERROR", "updateBusinessProfile")
          .error();
      }
    }

    // Prepare business fields
    const businessFields = {};
    if (updateData.businessName) businessFields.agencyName = updateData.businessName;
    if (updateData.registrationNumber) businessFields.agencyRegistrationNumber = updateData.registrationNumber;
    if (updateData.businessAddress) businessFields.agencyAddress = updateData.businessAddress;
    if (updateData.businessEmail) businessFields.agencyEmail = updateData.businessEmail;
    if (updateData.businessPhones) businessFields.agencyPhone = updateData.businessPhones;

    if (Object.keys(businessFields).length === 0) {
      return apiResponse
        .status(400)
        .withMessage("No valid business fields to update")
        .withError("Invalid update fields", "VALIDATION_ERROR", "updateBusinessProfile")
        .error();
    }

    // Validate email format if provided
    if (businessFields.agencyEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(businessFields.agencyEmail)) {
        return apiResponse
          .status(400)
          .withMessage("Invalid business email format")
          .withError("Business email must be a valid email address", "VALIDATION_ERROR", "updateBusinessProfile")
          .error();
      }
    }

    // Validate phone format for each phone in the array
    if (businessFields.agencyPhone) {
      if (!Array.isArray(businessFields.agencyPhone) || businessFields.agencyPhone.length === 0) {
        return apiResponse
          .status(400)
          .withMessage("businessPhones must be a non-empty array")
          .withError("Invalid phone format", "VALIDATION_ERROR", "updateBusinessProfile")
          .error();
      }

      const phoneRegex = /^[+]?[\d\s\-()]+$/;
      for (let i = 0; i < businessFields.agencyPhone.length; i++) {
        const phoneObj = businessFields.agencyPhone[i];
        if (!phoneObj.phone || !phoneRegex.test(phoneObj.phone)) {
          return apiResponse
            .status(400)
            .withMessage(`Invalid phone number format at index ${i}`)
            .withError("Phone number must contain only digits, spaces, +, -, ()", "VALIDATION_ERROR", "updateBusinessProfile")
            .error();
        }
      }
    }

    // Update business profile
    const updatedBusiness = await PartnerBusinessService.createOrUpdateBusiness(userId, businessFields);
    
    logger.info(`Business profile updated for user ${userId}`);

    apiResponse
      .status(200)
      .withMessage("Business profile updated successfully")
      .withData({ 
        business: updatedBusiness
      })
      .withMeta({
        userId: userId,
        updatedFields: Object.keys(businessFields),
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while updating business profile:`, err.message);
    apiResponse
      .status(err.message === "User not found" ? 404 : 500)
      .withMessage(err.message || "Failed to update business profile")
      .withError(err.message, err.code || "UPDATE_BUSINESS_ERROR", "updateBusinessProfile")
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
  updateBusinessProfile,
  onboardUser,
  onboardBusinessPartner,
  verifyPhone,
  getAllUsers,
  updateUserStatus,
  approveVerification,
  rejectVerification,
};
