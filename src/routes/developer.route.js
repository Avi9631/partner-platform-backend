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
