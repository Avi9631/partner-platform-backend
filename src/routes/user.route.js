const express = require("express");
const router = express.Router();
const UserController = require("../controller/User.controller.js");
const authMiddleware = require("../middleware/authMiddleware");
const { uploadProfileVideo, uploadOwnerVideo, handleUploadError } = require("../middleware/uploadMiddleware");

// Get current authenticated user
router.post("/partnerUser/get", authMiddleware, UserController.getUser);

// Update current authenticated user (also handles profile completion)
// Supports multipart/form-data for video upload
router.patch(
  "/partnerUser/update", 
  authMiddleware, 
  uploadProfileVideo,
  handleUploadError,
  UserController.updateUser
);

// Update business profile information
router.patch(
  "/partnerUser/updateBusiness", 
  authMiddleware, 
  UserController.updateBusinessProfile
);

// Partner onboarding - complete profile setup with verification
// Supports multipart/form-data for video upload
router.post(
  "/partnerUser/onboarding", 
  authMiddleware, 
  uploadProfileVideo,
  handleUploadError,
  UserController.onboardUser
);

// Business partner onboarding - complete business profile setup for verification
// Supports multipart/form-data for owner video upload
router.post(
  "/partnerUser/businessOnboarding", 
  authMiddleware, 
  uploadOwnerVideo,
  handleUploadError,
  UserController.onboardBusinessPartner
);

// Verify phone number for current user
router.post("/partnerUser/verifyPhone", authMiddleware, UserController.verifyPhone);

// Get all users (admin function - consider adding admin middleware)
router.get("/partnerUser/all", authMiddleware, UserController.getAllUsers);

// Update user status (admin function - consider adding admin middleware)
router.patch("/partnerUser/updateStatus", authMiddleware, UserController.updateUserStatus);

// Approve user verification (admin function - consider adding admin middleware)
router.patch("/partnerUser/approveVerification", authMiddleware, UserController.approveVerification);

// Reject user verification (admin function - consider adding admin middleware)
router.patch("/partnerUser/rejectVerification", authMiddleware, UserController.rejectVerification);

module.exports = router;
