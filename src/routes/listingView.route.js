const express = require('express');
const router = express.Router();
const ListingViewController = require('../controller/ListingView.controller');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/listing-analytics
 * @desc    Record a new listing view
 * @access  Public (can be anonymous or authenticated)
 */
router.post('/', optionalAuthenticateToken, ListingViewController.recordView);

/**
 * @route   PUT /api/listing-analytics/:viewId/duration
 * @desc    Update view duration
 * @access  Public (can be anonymous or authenticated)
 */
router.put('/:viewId/duration', optionalAuthenticateToken, ListingViewController.updateViewDuration);

/**
 * @route   GET /api/listing-analytics/stats/:listingType/:listingId
 * @desc    Get view statistics for a specific listing
 * @access  Private (requires authentication)
 */
router.get('/stats/:listingType/:listingId', authenticateToken, ListingViewController.getListingViewStats);

/**
 * @route   GET /api/listing-analytics/comprehensive/:listingType/:listingId
 * @desc    Get comprehensive analytics for PropertyAnalytics component
 * @access  Private (requires authentication)
 */
router.get('/comprehensive/:listingType/:listingId', authenticateToken, ListingViewController.getComprehensiveAnalytics);

/**
 * @route   GET /api/listing-analytics/my-history
 * @desc    Get authenticated user's viewing history
 * @access  Private (requires authentication)
 */
router.get('/my-history', authenticateToken, ListingViewController.getViewerHistory);

/**
 * @route   GET /api/listing-analytics/trending/:listingType
 * @desc    Get trending listings by type
 * @access  Public
 */
router.get('/trending/:listingType', ListingViewController.getTrendingListings);

/**
 * @route   GET /api/listing-analytics/analytics
 * @desc    Get view analytics (aggregated by date)
 * @access  Private (requires authentication)
 */
router.get('/analytics', authenticateToken, ListingViewController.getViewAnalytics);

module.exports = router;
