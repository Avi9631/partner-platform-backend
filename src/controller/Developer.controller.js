const DeveloperService = require("../service/DeveloperService.service");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/responseFormatter");
const { getTemporalClient } = require("../utils/temporalClient");
const logger = require("../config/winston.config");
const db = require("../entity");
const ListingDraft = db.ListingDraft;

/**
 * Publish developer - Create developer record and trigger workflow
 * POST /api/developer/publishDeveloper
 * @body { draftId: number } - ID of the draft containing developer data
 */
const publishDeveloper = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { draftId } = req.body;

    if (!draftId) {
      return sendErrorResponse(res, 'Draft ID is required', 400);
    }

    // Fetch the draft from ListingDraft entity
    const draft = await ListingDraft.findOne({
      where: {
        draftId: draftId,
        userId: userId,
        draftType: 'DEVELOPER'
      }
    });

    if (!draft) {
      return sendErrorResponse(
        res,
        'Draft not found or unauthorized. Please ensure the draft exists and belongs to you.',
        404
      );
    }

    // Extract developer data from draft
    const developerData = draft.draftData;

    if (!developerData || Object.keys(developerData).length === 0) {
      return sendErrorResponse(
        res,
        'Draft data is empty. Please save developer information before publishing.',
        400
      );
    }

    // Validate required fields
    const requiredFields = [
      'developerName'
    ];

    const missingFields = requiredFields.filter(field => !developerData[field]);
    if (missingFields.length > 0) {
      return sendErrorResponse(
        res,
        `Missing required fields in draft: ${missingFields.join(', ')}`,
        400
      );
    }

    // Start Temporal workflow for developer publishing (non-blocking)
    try {
      const temporalClient = await getTemporalClient();
      const workflowId = `developer-publish-${userId}-${Date.now()}`;

      await temporalClient.workflow.start('developerPublishing', {
        taskQueue: 'partner-platform-queue',
        workflowId,
        args: [{
          userId,
          draftId,
          developerData
        }]
      });

      logger.info(`Started developer publishing workflow: ${workflowId}`);

      // Return immediately without waiting for workflow completion
      return sendSuccessResponse(
        res,
        { 
          workflowId,
          message: 'Developer publishing workflow started successfully'
        },
        'Developer profile is being processed',
        202
      );
    } catch (temporalError) {
      logger.error('Temporal workflow error:', temporalError);
      
      // Fallback: Create developer directly without workflow
      const fallbackResult = await DeveloperService.createDeveloper(userId, developerData);
      
      if (fallbackResult.success) {
        return sendSuccessResponse(
          res,
          fallbackResult.data,
          'Developer profile created successfully (workflow unavailable)',
          201
        );
      } else {
        return sendErrorResponse(res, fallbackResult.message, 400);
      }
    }
  } catch (error) {
    logger.error('Error in publishDeveloper:', error);
    return sendErrorResponse(res, 'Failed to publish developer profile', 500);
  }
};

/**
 * Update developer profile
 * PATCH /api/developer/updateDeveloper/:developerId
 */
const updateDeveloper = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { developerId } = req.params;
    const updateData = req.body;

    if (!developerId) {
      return sendErrorResponse(res, 'Developer ID is required', 400);
    }

    const result = await DeveloperService.updateDeveloper(
      parseInt(developerId),
      userId,
      updateData
    );

    if (result.success) {
      return sendSuccessResponse(res, result.data, result.message);
    } else {
      return sendErrorResponse(res, result.message, 400);
    }
  } catch (error) {
    logger.error('Error in updateDeveloper:', error);
    return sendErrorResponse(res, 'Failed to update developer profile', 500);
  }
};

/**
 * Get developer by ID
 * GET /api/developer/:developerId
 */
const getDeveloper = async (req, res) => {
  try {
    const { developerId } = req.params;

    if (!developerId) {
      return sendErrorResponse(res, 'Developer ID is required', 400);
    }

    const result = await DeveloperService.getDeveloperById(parseInt(developerId));

    if (result.success) {
      return sendSuccessResponse(res, result.data);
    } else {
      return sendErrorResponse(res, result.message, 404);
    }
  } catch (error) {
    logger.error('Error in getDeveloper:', error);
    return sendErrorResponse(res, 'Failed to get developer profile', 500);
  }
};

 
/**
 * Get current user's developer profiles (all developers created by user)
 * GET /api/developer/my-profiles
 */
const getMyDeveloperProfiles = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await DeveloperService.getDevelopersByUserId(userId);

    if (result.success) {
      return sendSuccessResponse(res, {
        developers: result.data,
        count: result.count
      });
    } else {
      return sendErrorResponse(res, result.message, 404);
    }
  } catch (error) {
    logger.error('Error in getMyDeveloperProfiles:', error);
    return sendErrorResponse(res, 'Failed to get developer profiles', 500);
  }
};

/**
 * List developers with filters
 * GET /api/developer/list
 */
const listDevelopers = async (req, res) => {
  try {
    const {
      developerType,
      publishStatus,
      verificationStatus,
      operatingState,
      projectType,
      search,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {};
    if (developerType) filters.developerType = developerType;
    if (publishStatus) filters.publishStatus = publishStatus;
    if (verificationStatus) filters.verificationStatus = verificationStatus;
    if (operatingState) filters.operatingState = operatingState;
    if (projectType) filters.projectType = projectType;
    if (search) filters.search = search;

    const result = await DeveloperService.listDevelopers(
      filters,
      parseInt(page),
      parseInt(limit)
    );

    if (result.success) {
      return sendSuccessResponse(res, result.data);
    } else {
      return sendErrorResponse(res, result.message, 400);
    }
  } catch (error) {
    logger.error('Error in listDevelopers:', error);
    return sendErrorResponse(res, 'Failed to list developers', 500);
  }
};

/**
 * Update publish status (Admin only)
 * PATCH /api/developer/:developerId/publish-status
 */
const updatePublishStatus = async (req, res) => {
  try {
    const { developerId } = req.params;
    const { status, notes } = req.body;

    if (!developerId || !status) {
      return sendErrorResponse(res, 'Developer ID and status are required', 400);
    }

    const validStatuses = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED'];
    if (!validStatuses.includes(status)) {
      return sendErrorResponse(res, 'Invalid status', 400);
    }

    const result = await DeveloperService.updatePublishStatus(
      parseInt(developerId),
      status,
      notes
    );

    if (result.success) {
      return sendSuccessResponse(res, result.data, result.message);
    } else {
      return sendErrorResponse(res, result.message, 400);
    }
  } catch (error) {
    logger.error('Error in updatePublishStatus:', error);
    return sendErrorResponse(res, 'Failed to update publish status', 500);
  }
};

/**
 * Update verification status (Admin only)
 * PATCH /api/developer/:developerId/verification-status
 */
const updateVerificationStatus = async (req, res) => {
  try {
    const userId = req.user.userId; // Admin user ID
    const { developerId } = req.params;
    const { status, notes } = req.body;

    if (!developerId || !status) {
      return sendErrorResponse(res, 'Developer ID and status are required', 400);
    }

    const validStatuses = ['PENDING', 'AUTOMATED_REVIEW', 'MANUAL_REVIEW', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return sendErrorResponse(res, 'Invalid verification status', 400);
    }

    const result = await DeveloperService.updateVerificationStatus(
      parseInt(developerId),
      status,
      userId,
      notes
    );

    if (result.success) {
      return sendSuccessResponse(res, result.data, result.message);
    } else {
      return sendErrorResponse(res, result.message, 400);
    }
  } catch (error) {
    logger.error('Error in updateVerificationStatus:', error);
    return sendErrorResponse(res, 'Failed to update verification status', 500);
  }
};

/**
 * Delete developer profile
 * DELETE /api/developer/:developerId
 */
const deleteDeveloper = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { developerId } = req.params;

    if (!developerId) {
      return sendErrorResponse(res, 'Developer ID is required', 400);
    }

    const result = await DeveloperService.deleteDeveloper(
      parseInt(developerId),
      userId
    );

    if (result.success) {
      return sendSuccessResponse(res, null, result.message);
    } else {
      return sendErrorResponse(res, result.message, 400);
    }
  } catch (error) {
    logger.error('Error in deleteDeveloper:', error);
    return sendErrorResponse(res, 'Failed to delete developer profile', 500);
  }
};


module.exports = {
  publishDeveloper,
  updateDeveloper,
  getDeveloper,
   getMyDeveloperProfiles,
  listDevelopers,
  updatePublishStatus,
  updateVerificationStatus,
  deleteDeveloper
};
