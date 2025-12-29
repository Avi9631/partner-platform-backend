const express = require("express");
const router = express.Router();
const ProjectController = require("../controller/Project.controller.js");
const authenticateToken = require("../middleware/authMiddleware");

/**
 * @route   POST /api/project/publishProject
 * @desc    Publish a new project (triggers Temporal workflow)
 * @access  Private (requires authentication)
 * @body    { draftId?: number, projectData: object }
 */
router.post(
  "/publishProject",
  authenticateToken,
  ProjectController.publishProject
);

/**
 * @route   GET /api/project/my-projects
 * @desc    Get current user's projects
 * @access  Private (requires authentication)
 * @query   page, limit
 */
router.get(
  "/my-projects",
  authenticateToken,
  ProjectController.getMyProjects
);

/**
 * @route   GET /api/project/list
 * @desc    List projects with filters and pagination
 * @access  Public
 * @query   status, city, search, createdBy, page, limit
 */
router.get(
  "/list",
  ProjectController.listProjects
);

/**
 * @route   GET /api/project/:projectId
 * @desc    Get project by ID
 * @access  Public
 */
router.get(
  "/:projectId",
  ProjectController.getProjectById
);

/**
 * @route   PUT /api/project/:projectId
 * @desc    Update project
 * @access  Private (requires authentication)
 */
router.put(
  "/:projectId",
  authenticateToken,
  ProjectController.updateProject
);

/**
 * @route   DELETE /api/project/:projectId
 * @desc    Delete/archive project
 * @access  Private (requires authentication)
 */
router.delete(
  "/:projectId",
  authenticateToken,
  ProjectController.deleteProject
);

module.exports = router;
