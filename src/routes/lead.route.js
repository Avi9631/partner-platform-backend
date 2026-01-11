const express = require('express');
const router = express.Router();
const ListingLeadController = require('../controller/ListingLead.controller');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/leads
 * @desc    Create a new lead
 * @access  Public
 */
router.post('/', ListingLeadController.createLead);

/**
 * @route   GET /api/leads
 * @desc    Get leads with pagination and filters
 * @access  Private (requires authentication)
 */
router.get('/', authenticateToken, ListingLeadController.getLeads);

/**
 * @route   GET /api/leads/stats
 * @desc    Get lead statistics
 * @access  Private (requires authentication)
 */
router.get('/stats', authenticateToken, ListingLeadController.getLeadStats);

/**
 * @route   GET /api/leads/:leadId
 * @desc    Get lead by ID
 * @access  Private (requires authentication)
 */
router.get('/:leadId', authenticateToken, ListingLeadController.getLeadById);

/**
 * @route   PUT /api/leads/:leadId
 * @desc    Update lead details
 * @access  Private (requires authentication)
 */
router.put('/:leadId', authenticateToken, ListingLeadController.updateLead);

/**
 * @route   PUT /api/leads/:leadId/status
 * @desc    Update lead status
 * @access  Private (requires authentication)
 */
router.put('/:leadId/status', authenticateToken, ListingLeadController.updateLeadStatus);

/**
 * @route   DELETE /api/leads/:leadId
 * @desc    Delete a lead
 * @access  Private (requires authentication)
 */
router.delete('/:leadId', authenticateToken, ListingLeadController.deleteLead);

module.exports = router;
