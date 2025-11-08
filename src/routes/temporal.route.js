const express = require('express');
const router = express.Router();
const {
    startNotificationWorkflow,
    executeOnboardingWorkflow,
    getWorkflowStatus,
    cancelWorkflowById,
} = require('../controller/Temporal.controller');

/**
 * @swagger
 * /api/temporal/notification/start:
 *   post:
 *     summary: Start a notification workflow
 *     tags: [Temporal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - message
 *               - type
 *             properties:
 *               userId:
 *                 type: string
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       202:
 *         description: Workflow started successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
router.post('/api/temporal/notification/start', startNotificationWorkflow);

/**
 * @swagger
 * /api/temporal/onboarding/execute:
 *   post:
 *     summary: Execute user onboarding workflow
 *     tags: [Temporal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - email
 *               - name
 *             properties:
 *               userId:
 *                 type: string
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Onboarding completed successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
router.post('/api/temporal/onboarding/execute', executeOnboardingWorkflow);

/**
 * @swagger
 * /api/temporal/workflow/{workflowId}/status:
 *   get:
 *     summary: Get workflow status
 *     tags: [Temporal]
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow status retrieved
 *       400:
 *         description: Missing workflowId
 *       500:
 *         description: Server error
 */
router.get('/api/temporal/workflow/:workflowId/status', getWorkflowStatus);

/**
 * @swagger
 * /api/temporal/workflow/{workflowId}/cancel:
 *   post:
 *     summary: Cancel a workflow
 *     tags: [Temporal]
 *     parameters:
 *       - in: path
 *         name: workflowId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Workflow cancelled successfully
 *       400:
 *         description: Missing workflowId
 *       500:
 *         description: Server error
 */
router.post('/api/temporal/workflow/:workflowId/cancel', cancelWorkflowById);

module.exports = router;
