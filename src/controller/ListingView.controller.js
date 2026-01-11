const {
  recordView,
  updateViewDuration,
  getListingViewStats,
  getViewerHistory,
  getTrendingListings,
  getViewAnalytics,
  getComprehensiveAnalytics,
} = require("../service/ListingViewService.service");
const { sendSuccessResponse, sendErrorResponse } = require("../utils/responseFormatter");

/**
 * Record a new listing view
 */
const recordViewHandler = async (req, res) => {
    try {
      const { listingType, listingId, viewDuration, sessionId, deviceType, metadata } = req.body;

      // Validate required fields
      if (!listingType || !listingId) {
        return sendErrorResponse(res, "Listing type and listing ID are required", 400);
      }

      // Validate listing type
      const validTypes = ['property', 'project', 'pg_hostel', 'developer'];
      if (!validTypes.includes(listingType)) {
        return sendErrorResponse(res, "Invalid listing type", 400);
      }

      // Extract viewer information
      const viewerId = req.user ? req.user.userId : null;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');
      const referrer = req.get('referer') || req.get('referrer');

      const viewData = {
        listingType,
        listingId: parseInt(listingId),
        viewDuration: viewDuration ? parseInt(viewDuration) : null,
        viewerId,
        sessionId,
        ipAddress,
        userAgent,
        referrer,
        deviceType: deviceType || 'unknown',
        metadata: metadata || null,
      };

    const view = await recordView(viewData);

    return sendSuccessResponse(res, view, "View recorded successfully");
  } catch (error) {
    console.error("Error recording view:", error);
    return sendErrorResponse(res, error.message, 500);
  }
};

/**
 * Update view duration
 */
const updateViewDurationHandler = async (req, res) => {
  try {
    const { viewId } = req.params;
    const { duration } = req.body;

    if (!duration) {
      return sendErrorResponse(res, "Duration is required", 400);
    }

    const view = await updateViewDuration(
      parseInt(viewId),
      parseInt(duration)
    );

    return sendSuccessResponse(res, view, "View duration updated successfully");
  } catch (error) {
    console.error("Error updating view duration:", error);
    return sendErrorResponse(res, error.message, 500);
  }
};

/**
 * Get view statistics for a specific listing
 */
const getListingViewStatsHandler = async (req, res) => {
  try {
    const { listingType, listingId } = req.params;
    const { startDate, endDate, limit } = req.query;

    // Validate listing type
    const validTypes = ['property', 'project', 'pg_hostel', 'developer'];
    if (!validTypes.includes(listingType)) {
      return sendErrorResponse(res, "Invalid listing type", 400);
    }

    const options = {
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 10,
    };

    const stats = await getListingViewStats(
      listingType,
      parseInt(listingId),
      options
    );

    return sendSuccessResponse(res, stats, "View statistics retrieved successfully");
  } catch (error) {
    console.error("Error fetching view statistics:", error);
    return sendErrorResponse(res, error.message, 500);
  }
};

/**
 * Get viewer history
 */
const getViewerHistoryHandler = async (req, res) => {
  try {
    const viewerId = req.user ? req.user.userId : null;

    if (!viewerId) {
      return sendErrorResponse(res, "User not authenticated", 401);
    }

    const { listingType, limit, offset } = req.query;

    const options = {
      listingType,
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    };

    const views = await getViewerHistory(viewerId, options);

    return sendSuccessResponse(res, views, "Viewer history retrieved successfully");
  } catch (error) {
    console.error("Error fetching viewer history:", error);
    return sendErrorResponse(res, error.message, 500);
  }
};

/**
 * Get trending listings
 */
const getTrendingListingsHandler = async (req, res) => {
  try {
    const { listingType } = req.params;
    const { startDate, endDate, limit } = req.query;

    // Validate listing type
    const validTypes = ['property', 'project', 'pg_hostel', 'developer'];
    if (!validTypes.includes(listingType)) {
      return sendErrorResponse(res, "Invalid listing type", 400);
    }

    const options = {
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : 10,
    };

    const trending = await getTrendingListings(listingType, options);

    return sendSuccessResponse(res, trending, "Trending listings retrieved successfully");
  } catch (error) {
    console.error("Error fetching trending listings:", error);
    return sendErrorResponse(res, error.message, 500);
  }
};

/**
 * Get view analytics
 */
const getViewAnalyticsHandler = async (req, res) => {
  try {
    const { listingType, listingId, startDate, endDate } = req.query;

    const options = {
      listingType,
      listingId: listingId ? parseInt(listingId) : null,
      startDate,
      endDate,
    };

    const analytics = await getViewAnalytics(options);

    return sendSuccessResponse(res, analytics, "View analytics retrieved successfully");
  } catch (error) {
    console.error("Error fetching view analytics:", error);
    return sendErrorResponse(res, error.message, 500);
  }
};

/**
 * Get comprehensive analytics for a specific listing
 */
const getComprehensiveAnalyticsHandler = async (req, res) => {
  try {
    const { listingType, listingId } = req.params;
    const { timeRange } = req.query;

    // Validate listing type
    const validTypes = ['property', 'project', 'pg_hostel', 'developer'];
    if (!validTypes.includes(listingType)) {
      return sendErrorResponse(res, "Invalid listing type", 400);
    }

    // Validate time range
    const validTimeRanges = ['7d', '30d', '90d', 'all'];
    const selectedTimeRange = timeRange && validTimeRanges.includes(timeRange) ? timeRange : '7d';

    const analytics = await getComprehensiveAnalytics(
      listingType,
      parseInt(listingId),
      selectedTimeRange
    );

    return sendSuccessResponse(res, analytics, "Comprehensive analytics retrieved successfully");
  } catch (error) {
    console.error("Error fetching comprehensive analytics:", error);
    return sendErrorResponse(res, error.message, 500);
  }
};

module.exports = {
  recordView: recordViewHandler,
  updateViewDuration: updateViewDurationHandler,
  getListingViewStats: getListingViewStatsHandler,
  getViewerHistory: getViewerHistoryHandler,
  getTrendingListings: getTrendingListingsHandler,
  getViewAnalytics: getViewAnalyticsHandler,
  getComprehensiveAnalytics: getComprehensiveAnalyticsHandler,
};
