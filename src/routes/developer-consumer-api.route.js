const express = require("express");
const router = express.Router();
const DeveloperConsumerApiController = require("../controller/DeveloperConsumerApiController.controller.js");

/**
 * @route   GET /api/developer-consumer-api/list
 * @desc    Get developers with pagination
 * @access  Public
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 10, max: 100)
 */
router.get(
  "/list",
  DeveloperConsumerApiController.getDevelopersByPagination
);

/**
 * @route   GET /api/developer-consumer-api/search
 * @desc    Search developers by name
 * @access  Public
 * @query   name - Search term for developer name (required)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 10, max: 100)
 */
router.get(
  "/search",
  DeveloperConsumerApiController.searchDevelopersByName
);

/**
 * @route   GET /api/developer-consumer-api/metadata
 * @desc    Get metadata from developer data
 * @access  Public
 */
router.get(
  "/metadata",
  DeveloperConsumerApiController.getMetadata
);

/**
 * @route   GET /api/developer-consumer-api/:developerId
 * @desc    Get developer by ID
 * @access  Public
 * @param   developerId - Developer unique identifier (e.g., "prestige-group", "dlf-limited")
 */
router.get(
  "/:developerId",
  DeveloperConsumerApiController.getDeveloperById
);

module.exports = router;
