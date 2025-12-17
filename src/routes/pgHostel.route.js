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
 * @route   GET /api/pg-hostel/my-profiles
 * @desc    Get current user's PG/Hostel profiles
 * @access  Private (requires authentication)
 */
router.get(
  "/my-profiles",
  authenticateToken,
  PgColiveHostelController.getMyPgHostelProfiles
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
 * @route   GET /api/pg-hostel/slug/:slug
 * @desc    Get PG/Hostel by slug (for public pages)
 * @access  Public
 */
router.get(
  "/slug/:slug",
  PgColiveHostelController.getPgHostelBySlug
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
 * @route   PUT /api/pg-hostel/:pgHostelId
 * @desc    Update PG/Hostel
 * @access  Private (requires authentication, must be owner)
 */
router.put(
  "/:pgHostelId",
  authenticateToken,
  PgColiveHostelController.updatePgHostel
);

module.exports = router;
