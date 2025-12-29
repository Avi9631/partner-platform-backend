const express = require("express");
const router = express.Router();
const PropertyController = require("../controller/Property.controller.js");
const authenticateToken = require("../middleware/authMiddleware");

/**
 * @route   POST /api/property/publishProperty
 * @desc    Publish a new property (triggers Temporal workflow)
 * @access  Private (requires authentication)
 */
router.post(
  "/publishProperty",
  authenticateToken,
  PropertyController.publishProperty
);

/**
 * @route   GET /api/property/my-properties
 * @desc    Get current user's properties
 * @access  Private (requires authentication)
 */
router.get(
  "/my-properties",
  authenticateToken,
  PropertyController.getMyProperties
);

/**
 * @route   GET /api/property/list
 * @desc    List properties with filters and pagination
 * @access  Public
 * @query   status, projectId, city, locality, propertyType, listingType, bedrooms, minPrice, maxPrice, search, page, limit
 */
router.get(
  "/list",
  PropertyController.listProperties
);

/**
 * @route   GET /api/property/:propertyId
 * @desc    Get property by ID
 * @access  Public
 */
router.get(
  "/:propertyId",
  PropertyController.getPropertyById
);

/**
 * @route   PUT /api/property/:propertyId
 * @desc    Update property
 * @access  Private (requires authentication, must be owner)
 */
router.put(
  "/:propertyId",
  authenticateToken,
  PropertyController.updateProperty
);

/**
 * @route   DELETE /api/property/:propertyId
 * @desc    Delete property (soft delete)
 * @access  Private (requires authentication, must be owner)
 */
router.delete(
  "/:propertyId",
  authenticateToken,
  PropertyController.deleteProperty
);

module.exports = router;
