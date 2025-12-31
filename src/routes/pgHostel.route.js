const express = require("express");
const router = express.Router();
const PgColiveHostelController = require("../controller/PgColiveHostel.controller.js");
const authenticateToken = require("../middleware/authMiddleware");

/**
 * @route   POST /api/pg-hostel/publishPgColiveHostel
 * @desc    Publish a new PG/Colive/Hostel (triggers Temporal workflow)
 * @access  Private (requires authentication)
 */
router.post(
  "/publishPgColiveHostel",
  authenticateToken,
  PgColiveHostelController.publishPgColiveHostel
);
 
/**
 * @route   GET /api/pg-hostel/search-nearby
 * @desc    Search PG/Hostels near a location (lat, lng, radius)
 * @access  Public
 * @query   lat, lng, radius (in km), genderAllowed, isBrandManaged, page, limit
 */
router.get(
  "/search-nearby",
  PgColiveHostelController.searchNearbyPgHostels
);

/**
 * @route   GET /api/pg-hostel/list
 * @desc    List PG/Hostels with filters and pagination
 * @access  Public
 * @query   publishStatus, verificationStatus, city, locality, genderAllowed, isBrandManaged, search, page, limit
 */
router.get(
  "/list",
  PgColiveHostelController.listPgHostels
);

/**
 * @route   GET /api/pg-hostel/:pgHostelId
 * @desc    Get PG/Hostel by ID
 * @access  Public
 */
router.get(
  "/:pgHostelId",
  PgColiveHostelController.getPgHostelById
);


/**
 * @route   DELETE /api/pg-hostel/:pgHostelId
 * @desc    Delete PG/Hostel
 * @access  Private (requires authentication, must be owner)
 */
router.delete(
  "/:pgHostelId",
  authenticateToken,
  PgColiveHostelController.deletePgHostel
);

module.exports = router;
