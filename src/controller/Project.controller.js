const ProjectService = require("../service/ProjectService.service");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/responseFormatter");
const { getTemporalClient } = require("../utils/temporalClient");
const logger = require("../config/winston.config");
const db = require("../entity");
const ListingDraft = db.ListingDraft;
const Project = db.Project;

/**
 * Publish project - Create project record and trigger workflow
 * POST /api/project/publishProject
 * @body { draftId?: number, projectData: object } - Optional draft ID and project data
 */
const publishProject = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { draftId, ...projectData } = req.body;

    // Validate required fields
    if (!projectData.projectName && !projectData.name) {
      return sendErrorResponse(res, 'Project name is required', 400);
    }

    // If draftId is provided, fetch and validate the draft
    if (draftId) {
      const draft = await ListingDraft.findOne({
        where: {
          draftId: draftId,
          userId: userId,
          draftType: 'PROJECT'
        }
      });

      if (!draft) {
        return sendErrorResponse(
          res,
          'Draft not found or unauthorized. Please ensure the draft exists and belongs to you.',
          404
        );
      }

      // Check if this draft has already been published
      const existingProject = await Project.findOne({
        where: { draftId }
      });

      if (existingProject) {
        return sendErrorResponse(
          res,
          'This draft has already been published. Use the update endpoint to modify the project.',
          409
        );
      }
    }

    // Start Temporal workflow for project publishing (non-blocking)
    try {
      const temporalClient = await getTemporalClient();
      const workflowId = `project-publish-${userId}-${Date.now()}`;

      await temporalClient.workflow.start('projectPublishing', {
        taskQueue: 'partner-platform-queue',
        workflowId,
        args: [{
          userId,
          draftId: draftId || null,
          projectData
        }]
      });

      logger.info(`Started project publishing workflow: ${workflowId}`);

      // Return immediately without waiting for workflow completion
      return sendSuccessResponse(
        res,
        { 
          workflowId,
          message: 'Project publishing workflow started successfully'
        },
        'Project is being processed',
        202
      );
    } catch (temporalError) {
      logger.error(`Temporal workflow error: ${temporalError.message}`);
      
      // Fallback to direct creation if Temporal is unavailable
      logger.info('Temporal unavailable, falling back to direct project creation');
      
      const result = await ProjectService.createProject(userId, draftId, projectData);
      
      if (!result.success) {
        return sendErrorResponse(res, result.message, result.statusCode);
      }

      return sendSuccessResponse(
        res,
        result.data,
        result.message,
        result.statusCode
      );
    }

  } catch (error) {
    logger.error(`Error in publishProject controller: ${error.message}`, {
      error: error.stack
    });
    return sendErrorResponse(res, 'Failed to publish project', 500);
  }
};

/**
 * Get current user's projects
 * GET /api/project/my-projects
 */
const getMyProjects = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await ProjectService.getMyProjects(userId, page, limit);

    if (!result.success) {
      return sendErrorResponse(res, result.message, result.statusCode);
    }

    return sendSuccessResponse(
      res,
      result.data,
      'Projects fetched successfully',
      result.statusCode
    );

  } catch (error) {
    logger.error(`Error in getMyProjects controller: ${error.message}`);
    return sendErrorResponse(res, 'Failed to fetch projects', 500);
  }
};

/**
 * List projects with filters and pagination
 * GET /api/project/list
 * @query status, city, search, createdBy, page, limit
 */
const listProjects = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      city: req.query.city,
      search: req.query.search,
      createdBy: req.query.createdBy
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => 
      filters[key] === undefined && delete filters[key]
    );

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await ProjectService.listProjects(filters, page, limit);

    if (!result.success) {
      return sendErrorResponse(res, result.message, result.statusCode);
    }

    return sendSuccessResponse(
      res,
      result.data,
      'Projects listed successfully',
      result.statusCode
    );

  } catch (error) {
    logger.error(`Error in listProjects controller: ${error.message}`);
    return sendErrorResponse(res, 'Failed to list projects', 500);
  }
};

/**
 * Get project by ID
 * GET /api/project/:projectId
 */
const getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId || isNaN(projectId)) {
      return sendErrorResponse(res, 'Invalid project ID', 400);
    }

    const result = await ProjectService.getProjectById(parseInt(projectId));

    if (!result.success) {
      return sendErrorResponse(res, result.message, result.statusCode);
    }

    return sendSuccessResponse(
      res,
      result.data,
      'Project fetched successfully',
      result.statusCode
    );

  } catch (error) {
    logger.error(`Error in getProjectById controller: ${error.message}`);
    return sendErrorResponse(res, 'Failed to fetch project', 500);
  }
};

/**
 * Update project
 * PUT /api/project/:projectId
 */
const updateProject = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { projectId } = req.params;
    const projectData = req.body;

    if (!projectId || isNaN(projectId)) {
      return sendErrorResponse(res, 'Invalid project ID', 400);
    }

    const result = await ProjectService.updateProject(
      parseInt(projectId),
      userId,
      projectData
    );

    if (!result.success) {
      return sendErrorResponse(res, result.message, result.statusCode);
    }

    return sendSuccessResponse(
      res,
      result.data,
      result.message,
      result.statusCode
    );

  } catch (error) {
    logger.error(`Error in updateProject controller: ${error.message}`);
    return sendErrorResponse(res, 'Failed to update project', 500);
  }
};

/**
 * Delete project
 * DELETE /api/project/:projectId
 */
const deleteProject = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { projectId } = req.params;

    if (!projectId || isNaN(projectId)) {
      return sendErrorResponse(res, 'Invalid project ID', 400);
    }

    const result = await ProjectService.deleteProject(
      parseInt(projectId),
      userId
    );

    if (!result.success) {
      return sendErrorResponse(res, result.message, result.statusCode);
    }

    return sendSuccessResponse(
      res,
      null,
      result.message,
      result.statusCode
    );

  } catch (error) {
    logger.error(`Error in deleteProject controller: ${error.message}`);
    return sendErrorResponse(res, 'Failed to delete project', 500);
  }
};

module.exports = {
  publishProject,
  getMyProjects,
  listProjects,
  getProjectById,
  updateProject,
  deleteProject
};
