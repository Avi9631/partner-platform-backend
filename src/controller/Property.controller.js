const PropertyService = require("../service/PropertyService.service");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/responseFormatter");
const { runWorkflowAsync, runWorkflowDirect, WORKFLOWS } = require("../utils/workflowHelper");
const logger = require("../config/winston.config");
const db = require("../entity");
const ListingDraft = db.ListingDraft;
const Property = db.Property;

/**
 * Publish property - Create property record and trigger workflow
 * POST /api/property/publishProperty
 * @body { draftId: number, propertyData: object } - Draft ID and property data
 */
const publishProperty = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { draftId, ...propertyData } = req.body;

    if (!draftId) {
      return sendErrorResponse(res, 'Draft ID is required in the request payload', 400);
    }

    // Fetch the draft from ListingDraft entity
    const draft = await ListingDraft.findOne({
      where: {
        draftId: draftId,
        userId: userId,
        draftType: 'PROPERTY'
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
    if (!propertyData.propertyName && !propertyData.title && !propertyData.customPropertyName) {
      return sendErrorResponse(res, 'Property name or title is required', 400);
    }

    // Check if this draft has already been published
    const existingProperty = await Property.findOne({
      where: { draftId }
    });

    const isUpdate = !!existingProperty;

    // Check if Temporal is enabled
    const temporalEnabled = process.env.TEMPORAL_ENABLED === 'true';
    const workflowId = `property-publish-${userId}-${Date.now()}`;

    let wfId, mode;

    if (temporalEnabled) {
      // Use Temporal workflow
      const result = await runWorkflowAsync(
        WORKFLOWS.PROPERTY_PUBLISHING,
        {
          userId,
          draftId
        },
        workflowId
      );
      wfId = result.workflowId;
      mode = result.mode;
    } else {
      // Use skip-workflow (direct execution)
      const result = await runWorkflowDirect(
        WORKFLOWS.PROPERTY_PUBLISHING,
        {
          userId,
          draftId
        },
        workflowId
      );
      wfId = result.workflowId;
      mode = 'direct';
    }

    logger.info(`Started property publishing workflow: ${wfId} (mode: ${mode})`);

    // Return immediately without waiting for workflow completion
    return sendSuccessResponse(
      res,
      { 
        workflowId: wfId,
        isUpdate,
        executionMode: mode,
        usingTemporal: temporalEnabled,
        message: `Property ${isUpdate ? 'update' : 'publishing'} workflow started successfully`
      },
      `Property is being ${isUpdate ? 'updated' : 'processed'}`,
      202
    );
  } catch (error) {
    logger.error('Error publishing property:', error);
    return sendErrorResponse(
      res,
      'An error occurred while publishing property',
      500
    );
  }
};

/**
 * Get user's properties
 * GET /api/property/my-properties
 */
const getMyProperties = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await PropertyService.getUserProperties(userId);

    if (result.success) {
      return sendSuccessResponse(
        res,
        result.data,
        'Properties fetched successfully'
      );
    } else {
      return sendErrorResponse(
        res,
        result.message || 'Failed to fetch properties',
        result.statusCode || 500
      );
    }
  } catch (error) {
    logger.error('Error fetching user properties:', error);
    return sendErrorResponse(
      res,
      'An error occurred while fetching properties',
      500
    );
  }
};

/**
 * Get property by ID
 * GET /api/property/:propertyId
 */
const getPropertyById = async (req, res) => {
  try {
    const { propertyId } = req.params;

    if (!propertyId) {
      return sendErrorResponse(res, 'Property ID is required', 400);
    }

    const result = await PropertyService.getPropertyById(parseInt(propertyId));

    if (result.success) {
      return sendSuccessResponse(
        res,
        result.data,
        'Property fetched successfully'
      );
    } else {
      return sendErrorResponse(
        res,
        result.message || 'Property not found',
        result.statusCode || 404
      );
    }
  } catch (error) {
    logger.error('Error fetching property:', error);
    return sendErrorResponse(
      res,
      'An error occurred while fetching property',
      500
    );
  }
};

/**
 * List properties with filters and pagination
 * GET /api/property/list
 */
const listProperties = async (req, res) => {
  try {
    const {
      status,
      projectId,
      city,
      locality,
      propertyType,
      listingType,
      bedrooms,
      minPrice,
      maxPrice,
      search,
      page = 1,
      limit = 10
    } = req.query;

    const result = await PropertyService.listProperties({
      status,
      projectId: projectId ? parseInt(projectId) : null,
      city,
      locality,
      propertyType,
      listingType,
      bedrooms,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      maxPrice: maxPrice ? parseFloat(maxPrice) : null,
      search,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    if (result.success) {
      return sendSuccessResponse(
        res,
        result.data,
        'Properties fetched successfully'
      );
    } else {
      return sendErrorResponse(
        res,
        result.message || 'Failed to fetch properties',
        result.statusCode || 500
      );
    }
  } catch (error) {
    logger.error('Error listing properties:', error);
    return sendErrorResponse(
      res,
      'An error occurred while listing properties',
      500
    );
  }
};

/**
 * Update property
 * PUT /api/property/:propertyId
 */
const updateProperty = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { propertyId } = req.params;
    const updateData = req.body;

    if (!propertyId) {
      return sendErrorResponse(res, 'Property ID is required', 400);
    }

    const result = await PropertyService.updateProperty(
      parseInt(propertyId),
      userId,
      updateData
    );

    if (result.success) {
      return sendSuccessResponse(
        res,
        result.data,
        'Property updated successfully'
      );
    } else {
      return sendErrorResponse(
        res,
        result.message || 'Failed to update property',
        result.statusCode || 400
      );
    }
  } catch (error) {
    logger.error('Error updating property:', error);
    return sendErrorResponse(
      res,
      'An error occurred while updating property',
      500
    );
  }
};

/**
 * Delete property (soft delete)
 * DELETE /api/property/:propertyId
 */
const deleteProperty = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { propertyId } = req.params;

    if (!propertyId) {
      return sendErrorResponse(res, 'Property ID is required', 400);
    }

    const result = await PropertyService.deleteProperty(
      parseInt(propertyId),
      userId
    );

    if (result.success) {
      return sendSuccessResponse(
        res,
        result.data,
        'Property deleted successfully'
      );
    } else {
      return sendErrorResponse(
        res,
        result.message || 'Failed to delete property',
        result.statusCode || 400
      );
    }
  } catch (error) {
    logger.error('Error deleting property:', error);
    return sendErrorResponse(
      res,
      'An error occurred while deleting property',
      500
    );
  }
};

module.exports = {
  publishProperty,
  getMyProperties,
  getPropertyById,
  listProperties,
  updateProperty,
  deleteProperty
};
