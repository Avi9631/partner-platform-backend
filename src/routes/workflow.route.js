const express = require("express");
const router = express.Router();
const WorkflowController = require("../controller/Workflow.controller.js");
const authMiddleware = require("../middleware/authMiddleware");

/**
 * @swagger
 * /api/workflow/{workflowId}/status:
 *   get:
 *     summary: Get workflow status and details
 *     description: Retrieves workflow status using handle.describe()
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: Workflow status retrieved successfully
 *       400:
 *         description: Workflow ID is required
 *       500:
 *         description: Failed to fetch workflow status
 */
router.get("/api/workflow/:workflowId/status", authMiddleware, WorkflowController.getWorkflowStatus);

/**
 * @swagger
 * /api/workflow/{workflowId}/result:
 *   get:
 *     summary: Get workflow result
 *     description: Retrieves workflow output using handle.result()
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: Workflow result retrieved successfully
 *       400:
 *         description: Workflow ID is required
 *       500:
 *         description: Failed to fetch workflow result
 */
router.get("/api/workflow/:workflowId/result", authMiddleware, WorkflowController.getWorkflowResult);

/**
 * @swagger
 * /api/workflow/{workflowId}/query:
 *   post:
 *     summary: Query workflow for live data
 *     description: Queries workflow using handle.query()
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - queryType
 *             properties:
 *               queryType:
 *                 type: string
 *                 description: Query name/type
 *               queryArgs:
 *                 type: object
 *                 description: Query arguments (optional)
 *     responses:
 *       200:
 *         description: Workflow query executed successfully
 *       400:
 *         description: Workflow ID or query type is required
 *       500:
 *         description: Failed to query workflow
 */
router.post("/api/workflow/:workflowId/query", authMiddleware, WorkflowController.queryWorkflow);

/**
 * @swagger
 * /api/workflow/list:
 *   get:
 *     summary: List workflows with filters
 *     description: Retrieves list of workflows using client.workflow.list()
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Temporal query string (e.g., "WorkflowType='MyWorkflow'")
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of results per page
 *       - in: query
 *         name: maxResults
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of results to return
 *     responses:
 *       200:
 *         description: Workflows listed successfully
 *       500:
 *         description: Failed to list workflows
 */
router.get("/api/workflow/list", authMiddleware, WorkflowController.listWorkflows);

/**
 * @swagger
 * /api/workflow/{workflowId}/signal:
 *   post:
 *     summary: Signal a workflow
 *     description: Sends a signal to a running workflow using handle.signal()
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - signalName
 *             properties:
 *               signalName:
 *                 type: string
 *                 description: Signal name
 *               signalArgs:
 *                 type: object
 *                 description: Signal arguments (optional)
 *     responses:
 *       200:
 *         description: Workflow signal sent successfully
 *       400:
 *         description: Workflow ID or signal name is required
 *       500:
 *         description: Failed to signal workflow
 */
router.post("/api/workflow/:workflowId/signal", authMiddleware, WorkflowController.signalWorkflow);

/**
 * @swagger
 * /api/workflow/{workflowId}/cancel:
 *   post:
 *     summary: Cancel a workflow
 *     description: Cancels a running workflow using handle.cancel()
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: Workflow cancelled successfully
 *       400:
 *         description: Workflow ID is required
 *       500:
 *         description: Failed to cancel workflow
 */
router.post("/api/workflow/:workflowId/cancel", authMiddleware, WorkflowController.cancelWorkflow);

/**
 * @swagger
 * /api/workflow/{workflowId}/terminate:
 *   post:
 *     summary: Terminate a workflow
 *     description: Terminates a running workflow using handle.terminate()
 *     tags: [Workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Termination reason (optional)
 *     responses:
 *       200:
 *         description: Workflow terminated successfully
 *       400:
 *         description: Workflow ID is required
 *       500:
 *         description: Failed to terminate workflow
 */
router.post("/api/workflow/:workflowId/terminate", authMiddleware, WorkflowController.terminateWorkflow);

module.exports = router;
