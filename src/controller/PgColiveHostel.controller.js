const PgColiveHostelService = require("../service/PgColiveHostelService.service");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/responseFormatter");
const { getTemporalClient } = require("../utils/temporalClient");
const logger = require("../config/winston.config");
const db = require("../entity");
const ListingDraft = db.ListingDraft;
const PgColiveHostel = db.PgColiveHostel;

/**
 * Publish PG/Colive/Hostel - Create record and trigger workflow
 * POST /api/pg-hostel/publishPgColiveHostel
 * @body { draftId: number } - ID of the draft containing PG/Hostel data
 */
const publishPgColiveHostel = async (req, res) => {
  try {
    const userId = req.user.userId;
    const pgHostelData = req.body;

    // Extract draftId from the request body
    const draftId = pgHostelData.draftId;

    if (!draftId) {
      return sendErrorResponse(res, 'Draft ID is required in the request payload', 400);
    }

    // Fetch the draft from ListingDraft entity
    const draft = await ListingDraft.findOne({
      where: {
        draftId: draftId,
        userId: userId,
        draftType: 'PG'
      }
    });

    if (!draft) {
      return sendErrorResponse(
        res,
        'Draft not found or unauthorized. Please ensure the draft exists and belongs to you.',
        404
      );
    }

    // Validate required fields
    if (!pgHostelData.propertyName) {
      return sendErrorResponse(res, 'Property name is required', 400);
    }

    if (!pgHostelData.genderAllowed) {
      return sendErrorResponse(res, 'Gender allowed is required', 400);
    }

    if (!pgHostelData.roomTypes || !Array.isArray(pgHostelData.roomTypes) || pgHostelData.roomTypes.length === 0) {
      return sendErrorResponse(res, 'At least one room type is required', 400);
    }

    // Check if this draft has already been published
    const existingPgHostel = await PgColiveHostel.findOne({
      where: { draftId }
    });

    const isUpdate = !!existingPgHostel;

    // Start Temporal workflow for PG/Hostel publishing (non-blocking)
    try {
      const temporalClient = await getTemporalClient();
      const workflowId = `pg-hostel-publish-${userId}-${Date.now()}`;

      await temporalClient.workflow.start('pgHostelPublishing', {
        taskQueue: 'partner-platform-queue',
        workflowId,
        args: [{
          userId,
          draftId,
          pgHostelData
        }]
      });

      logger.info(`Started PG/Hostel publishing workflow: ${workflowId}`);

      // Return immediately without waiting for workflow completion
      return sendSuccessResponse(
        res,
        { 
          workflowId,
          isUpdate,
          message: `PG/Hostel ${isUpdate ? 'update' : 'publishing'} workflow started successfully`
        },
        `PG/Colive/Hostel is being ${isUpdate ? 'updated' : 'processed'}`,
        202
      );
    } catch (temporalError) {
      logger.error('Temporal workflow error:', temporalError);
      
      // Fallback: Create or Update PG/Hostel directly without workflow
      let fallbackResult;
      
      if (isUpdate) {
        fallbackResult = await PgColiveHostelService.updatePgColiveHostel(
          existingPgHostel.pgHostelId,
          userId,
          pgHostelData
        );
      } else {
        fallbackResult = await PgColiveHostelService.createPgColiveHostel(userId, draftId, pgHostelData);
      }
      
      if (fallbackResult.success) {
        return sendSuccessResponse(
          res,
          fallbackResult.data,
          `PG/Colive/Hostel ${isUpdate ? 'updated' : 'published'} successfully (direct mode)`,
          isUpdate ? 200 : 201
        );
      } else {
        return sendErrorResponse(
          res,
          fallbackResult.message || `Failed to ${isUpdate ? 'update' : 'publish'} PG/Colive/Hostel`,
          fallbackResult.statusCode || 500
        );
      }
    }
  } catch (error) {
    logger.error('Error publishing PG/Colive/Hostel:', error);
    return sendErrorResponse(
      res,
      'An error occurred while publishing PG/Colive/Hostel',
      500
    );
  }
};

/**
 * Get user's PG/Hostel profiles
 * GET /api/pg-hostel/my-profiles
 */
const getMyPgHostelProfiles = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await PgColiveHostelService.getUserPgColiveHostels(userId);

    if (result.success) {
      return sendSuccessResponse(
        res,
        result.data,
        'PG/Hostel profiles fetched successfully'
      );
    } else {
      return sendErrorResponse(
        res,
        result.message,
        result.statusCode || 500
      );
    }
  } catch (error) {
    logger.error('Error fetching user PG/Hostel profiles:', error);
    return sendErrorResponse(
      res,
      'An error occurred while fetching PG/Hostel profiles',
      500
    );
  }
};

/**
 * List PG/Hostels with filters
 * GET /api/pg-hostel/list
 */
const listPgHostels = async (req, res) => {
  try {
    const filters = {
      publishStatus: req.query.publishStatus,
      verificationStatus: req.query.verificationStatus,
      city: req.query.city,
      locality: req.query.locality,
      genderAllowed: req.query.genderAllowed,
      isBrandManaged: req.query.isBrandManaged,
      search: req.query.search,
      page: req.query.page || 1,
      limit: req.query.limit || 20
    };

    const result = await PgColiveHostelService.listPgColiveHostels(filters);

    if (result.success) {
      return sendSuccessResponse(
        res,
        result.data,
        'PG/Hostels fetched successfully'
      );
    } else {
      return sendErrorResponse(
        res,
        result.message,
        result.statusCode || 500
      );
    }
  } catch (error) {
    logger.error('Error listing PG/Hostels:', error);
    return sendErrorResponse(
      res,
      'An error occurred while listing PG/Hostels',
      500
    );
  }
};

/**
 * Search PG/Hostels near a location
 * GET /api/pg-hostel/search-nearby
 */
const searchNearbyPgHostels = async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;

    // Validate required parameters
    if (!lat || !lng || !radius) {
      return sendErrorResponse(
        res,
        'Latitude, longitude, and radius are required',
        400
      );
    }

    // Validate numeric values
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusKm)) {
      return sendErrorResponse(
        res,
        'Invalid latitude, longitude, or radius value',
        400
      );
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return sendErrorResponse(
        res,
        'Invalid coordinate values. Latitude must be between -90 and 90, longitude between -180 and 180',
        400
      );
    }

    if (radiusKm <= 0 || radiusKm > 100) {
      return sendErrorResponse(
        res,
        'Radius must be between 0 and 100 km',
        400
      );
    }

    const filters = {
      genderAllowed: req.query.genderAllowed,
      isBrandManaged: req.query.isBrandManaged,
      page: req.query.page || 1,
      limit: req.query.limit || 20
    };

    const result = await PgColiveHostelService.searchNearbyPgHostels(
      latitude,
      longitude,
      radiusKm,
      filters
    );

    if (result.success) {
      return sendSuccessResponse(
        res,
        result.data,
        'Nearby PG/Hostels fetched successfully'
      );
    } else {
      return sendErrorResponse(
        res,
        result.message,
        result.statusCode || 500
      );
    }
  } catch (error) {
    logger.error('Error searching nearby PG/Hostels:', error);
    return sendErrorResponse(
      res,
      'An error occurred while searching nearby PG/Hostels',
      500
    );
  }
};

/**
 * Get PG/Hostel by slug
 * GET /api/pg-hostel/slug/:slug
 */
const getPgHostelBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await PgColiveHostelService.getPgColiveHostelBySlug(slug);

    if (result.success) {
      return sendSuccessResponse(
        res,
        result.data,
        'PG/Hostel fetched successfully'
      );
    } else {
      return sendErrorResponse(
        res,
        result.message,
        result.statusCode || 404
      );
    }
  } catch (error) {
    logger.error('Error fetching PG/Hostel by slug:', error);
    return sendErrorResponse(
      res,
      'An error occurred while fetching PG/Hostel',
      500
    );
  }
};

/**
 * Get PG/Hostel by ID
 * GET /api/pg-hostel/:pgHostelId
 */
const getPgHostelById = async (req, res) => {
  try {
    const { pgHostelId } = req.params;

    const result = await PgColiveHostelService.getPgColiveHostelById(pgHostelId);

    if (result.success) {
      return sendSuccessResponse(
        res,
        result.data,
        'PG/Hostel fetched successfully'
      );
    } else {
      return sendErrorResponse(
        res,
        result.message,
        result.statusCode || 404
      );
    }
  } catch (error) {
    logger.error('Error fetching PG/Hostel by ID:', error);
    return sendErrorResponse(
      res,
      'An error occurred while fetching PG/Hostel',
      500
    );
  }
};

/**
 * Update PG/Hostel
 * PUT /api/pg-hostel/:pgHostelId
 */
const updatePgHostel = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { pgHostelId } = req.params;
    const updateData = req.body;

    const result = await PgColiveHostelService.updatePgColiveHostel(
      pgHostelId,
      userId,
      updateData
    );

    if (result.success) {
      return sendSuccessResponse(
        res,
        result.data,
        'PG/Hostel updated successfully'
      );
    } else {
      return sendErrorResponse(
        res,
        result.message,
        result.statusCode || 500
      );
    }
  } catch (error) {
    logger.error('Error updating PG/Hostel:', error);
    return sendErrorResponse(
      res,
      'An error occurred while updating PG/Hostel',
      500
    );
  }
};

/**
 * Delete PG/Hostel
 * DELETE /api/pg-hostel/:pgHostelId
 */
const deletePgHostel = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { pgHostelId } = req.params;

    const result = await PgColiveHostelService.deletePgColiveHostel(
      pgHostelId,
      userId
    );

    if (result.success) {
      return sendSuccessResponse(
        res,
        null,
        'PG/Hostel deleted successfully'
      );
    } else {
      return sendErrorResponse(
        res,
        result.message,
        result.statusCode || 500
      );
    }
  } catch (error) {
    logger.error('Error deleting PG/Hostel:', error);
    return sendErrorResponse(
      res,
      'An error occurred while deleting PG/Hostel',
      500
    );
  }
};

module.exports = {
  publishPgColiveHostel,
  getMyPgHostelProfiles,
  listPgHostels,
  searchNearbyPgHostels,
  getPgHostelBySlug,
  getPgHostelById,
  updatePgHostel,
  deletePgHostel
};
