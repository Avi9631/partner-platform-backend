const express = require("express");
const router = express.Router();
const DeveloperController = require("../controller/Developer.controller.js");
const authenticateToken = require("../middleware/authMiddleware");

/**
 * @route   POST /api/developer/publishDeveloper
 * @desc    Publish a new developer profile (triggers Temporal workflow)
 * @access  Private (requires authentication)
 */
router.post(
  "/publishDeveloper",
  authenticateToken,
  DeveloperController.publishDeveloper
);

/**
 * @route   GET /api/developer/my-profiles
 * @desc    Get current user's developer profiles (all developers created by user)
 * @access  Private (requires authentication)
 */
router.get(
  "/my-profiles",
  authenticateToken,
  DeveloperController.getMyDeveloperProfiles
);

/**
 * @route   GET /api/developer/list
 * @desc    List developers with filters and pagination
 * @access  Public
 * @query   developerType, publishStatus, verificationStatus, operatingState, projectType, search, page, limit
 */
router.get(
  "/list",
  DeveloperController.listDevelopers
);

 
/**
 * @route   GET /api/developer/:developerId
 * @desc    Get developer by ID
 * @access  Public
 */
router.get(
  "/:developerId",
  DeveloperController.getDeveloper
);

/**
 * @route   PATCH /api/developer/updateDeveloper/:developerId
 * @desc    Update developer profile
 * @access  Private (requires authentication and ownership)
 */
router.patch(
  "/updateDeveloper/:developerId",
  authenticateToken,
  DeveloperController.updateDeveloper
);

/**
 * @route   PATCH /api/developer/:developerId/publish-status
 * @desc    Update developer publish status (Admin only)
 * @access  Private (requires authentication and admin role)
 * @body    { status: string, notes: string }
 */
router.patch(
  "/:developerId/publish-status",
  authenticateToken,
  // TODO: Add admin middleware check
  DeveloperController.updatePublishStatus
);

/**
 * @route   PATCH /api/developer/:developerId/verification-status
 * @desc    Update developer verification status (Admin only)
 * @access  Private (requires authentication and admin role)
 * @body    { status: string, notes: string }
 */
router.patch(
  "/:developerId/verification-status",
  authenticateToken,
  // TODO: Add admin middleware check
  DeveloperController.updateVerificationStatus
);

/**
 * @route   DELETE /api/developer/:developerId
 * @desc    Delete developer profile (soft delete)
 * @access  Private (requires authentication and ownership)
 */
router.delete(
  "/:developerId",
  authenticateToken,
  DeveloperController.deleteDeveloper
);

module.exports = router;
