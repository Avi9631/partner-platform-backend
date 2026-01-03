const DeveloperConsumerApiService = require("../service/DeveloperConsumerApiService.service");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/responseFormatter");
const logger = require("../config/winston.config");

/**
 * Get developers with pagination
 * GET /api/developer-api/list
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 10)
 */
const getDevelopersByPagination = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Validate pagination parameters
    if (page < 1) {
      return sendErrorResponse(res, 'Page number must be greater than 0', 400);
    }

    if (limit < 1 || limit > 100) {
      return sendErrorResponse(res, 'Limit must be between 1 and 100', 400);
    }

    const result = DeveloperConsumerApiService.getDevelopersByPagination(page, limit);

    return res.status(200).json({
      status: 200,
      success: true,
      message: 'Developers fetched successfully',
      data: result.data,
      pagination: result.pagination,
      warnings: [],
      error: null
    });
  } catch (error) {
    logger.error('Error fetching developers:', error);
    return sendErrorResponse(
      res,
      'Failed to fetch developers',
      500
    );
  }
};

/**
 * Search developers by name
 * GET /api/developer-api/search
 * @query name - Search term for developer name
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 10)
 */
const searchDevelopersByName = async (req, res) => {
  try {
    const searchTerm = req.query.name;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!searchTerm) {
      return sendErrorResponse(res, 'Search term (name) is required', 400);
    }

    // Validate pagination parameters
    if (page < 1) {
      return sendErrorResponse(res, 'Page number must be greater than 0', 400);
    }

    if (limit < 1 || limit > 100) {
      return sendErrorResponse(res, 'Limit must be between 1 and 100', 400);
    }

    const result = DeveloperConsumerApiService.searchDevelopersByName(searchTerm, page, limit);

    return res.status(200).json({
      status: 200,
      success: true,
      message: `Found ${result.pagination.totalItems} developer(s) matching "${searchTerm}"`,
      data: result.data,
      searchTerm: result.searchTerm,
      pagination: result.pagination,
      warnings: [],
      error: null
    });
  } catch (error) {
    logger.error('Error searching developers:', error);
    return sendErrorResponse(
      res,
      'Failed to search developers',
      500
    );
  }
};

/**
 * Get developer by ID
 * GET /api/developer-api/:developerId
 * @param developerId - Developer unique ID
 */
const getDeveloperById = async (req, res) => {
  try {
    const { developerId } = req.params;

    if (!developerId) {
      return sendErrorResponse(res, 'Developer ID is required', 400);
    }

    const result = DeveloperConsumerApiService.getDeveloperById(developerId);

    if (!result || !result.data) {
      return sendErrorResponse(
        res,
        `Developer with ID "${developerId}" not found`,
        404
      );
    }

    return sendSuccessResponse(
      res,
      result.data,
      'Developer fetched successfully',
      200
    );
  } catch (error) {
    logger.error('Error fetching developer by ID:', error);
    return sendErrorResponse(
      res,
      'Failed to fetch developer',
      500
    );
  }
};

/**
 * Get metadata
 * GET /api/developer-api/metadata
 */
const getMetadata = async (req, res) => {
  try {
    const result = DeveloperConsumerApiService.getMetadata();

    if (!result) {
      return sendErrorResponse(res, 'Metadata not available', 404);
    }

    return sendSuccessResponse(
      res,
      result.metadata,
      'Metadata fetched successfully',
      200
    );
  } catch (error) {
    logger.error('Error fetching metadata:', error);
    return sendErrorResponse(
      res,
      'Failed to fetch metadata',
      500
    );
  }
};

module.exports = {
  getDevelopersByPagination,
  searchDevelopersByName,
  getDeveloperById,
  getMetadata
};
