const db = require("../entity");
const ListingAnalytics = db.ListingAnalytics;
const { Op } = require("sequelize");

/**
 * Record a new listing view
 * @param {Object} viewData - View data
 * @returns {Promise<Object>} Created view record
 */
const recordView = async (viewData) => {
  try {
    const view = await ListingAnalytics.create({
      listingType: viewData.listingType,
      listingId: viewData.listingId,
      viewDuration: viewData.viewDuration || null,
      viewerId: viewData.viewerId || null,
      sessionId: viewData.sessionId || null,
      ipAddress: viewData.ipAddress || null,
      userAgent: viewData.userAgent || null,
      referrer: viewData.referrer || null,
      deviceType: viewData.deviceType || 'unknown',
      country: viewData.country || null,
      city: viewData.city || null,
      viewedAt: viewData.viewedAt || new Date(),
      metadata: viewData.metadata || null,
    });

    return view;
  } catch (error) {
    throw new Error(`Error recording view: ${error.message}`);
  }
};

/**
 * Update view duration
 * @param {number} viewId - View ID
 * @param {number} duration - Duration in seconds
 * @returns {Promise<Object>} Updated view record
 */
const updateViewDuration = async (viewId, duration) => {
  try {
    const view = await ListingAnalytics.findByPk(viewId);
    if (!view) {
      throw new Error("View not found");
    }

    view.viewDuration = duration;
    await view.save();

    return view;
  } catch (error) {
    throw new Error(`Error updating view duration: ${error.message}`);
  }
};

/**
 * Get view statistics for a specific listing
 * @param {string} listingType - Type of listing (property, project, pg_hostel, developer)
 * @param {number} listingId - Listing ID
 * @param {Object} options - Query options (dateRange, etc.)
 * @returns {Promise<Object>} View statistics
 */
const getListingViewStats = async (listingType, listingId, options = {}) => {
  try {
    const whereClause = {
      listingType,
      listingId,
    };

    // Add date range filter if provided
    if (options.startDate || options.endDate) {
      whereClause.viewedAt = {};
      if (options.startDate) {
        whereClause.viewedAt[Op.gte] = new Date(options.startDate);
      }
      if (options.endDate) {
        whereClause.viewedAt[Op.lte] = new Date(options.endDate);
      }
    }

    const views = await ListingAnalytics.findAll({
      where: whereClause,
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('view_id')), 'totalViews'],
        [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('viewer_id'))), 'uniqueViewers'],
        [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('session_id'))), 'uniqueSessions'],
        [db.sequelize.fn('AVG', db.sequelize.col('view_duration')), 'avgViewDuration'],
        [db.sequelize.fn('MAX', db.sequelize.col('view_duration')), 'maxViewDuration'],
        [db.sequelize.fn('MIN', db.sequelize.col('view_duration')), 'minViewDuration'],
      ],
      raw: true,
    });

    // Get device type breakdown
    const deviceStats = await ListingAnalytics.findAll({
      where: whereClause,
      attributes: [
        'deviceType',
        [db.sequelize.fn('COUNT', db.sequelize.col('view_id')), 'count'],
      ],
      group: ['deviceType'],
      raw: true,
    });

    // Get recent views
    const recentViews = await ListingAnalytics.findAll({
      where: whereClause,
      order: [['viewedAt', 'DESC']],
      limit: options.limit || 10,
      include: [
        {
          model: db.PlatformUser,
          as: 'viewer',
          attributes: ['userId', 'fullName', 'email'],
          required: false,
        },
      ],
    });

    return {
      stats: views[0] || {},
      deviceBreakdown: deviceStats,
      recentViews: recentViews,
    };
  } catch (error) {
    throw new Error(`Error fetching view statistics: ${error.message}`);
  }
};

/**
 * Get views for a specific user
 * @param {number} viewerId - Viewer user ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} List of views
 */
const getViewerHistory = async (viewerId, options = {}) => {
  try {
    const whereClause = { viewerId };

    if (options.listingType) {
      whereClause.listingType = options.listingType;
    }

    const views = await ListingAnalytics.findAll({
      where: whereClause,
      order: [['viewedAt', 'DESC']],
      limit: options.limit || 50,
      offset: options.offset || 0,
    });

    return views;
  } catch (error) {
    throw new Error(`Error fetching viewer history: ${error.message}`);
  }
};

/**
 * Get trending listings based on views
 * @param {string} listingType - Type of listing
 * @param {Object} options - Query options
 * @returns {Promise<Array>} List of trending listings
 */
const getTrendingListings = async (listingType, options = {}) => {
  try {
    const whereClause = { listingType };

    // Default to last 7 days if no date range provided
    const startDate = options.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    whereClause.viewedAt = {
      [Op.gte]: startDate,
    };

    if (options.endDate) {
      whereClause.viewedAt[Op.lte] = new Date(options.endDate);
    }

    const trending = await ListingAnalytics.findAll({
      where: whereClause,
      attributes: [
        'listingId',
        [db.sequelize.fn('COUNT', db.sequelize.col('view_id')), 'viewCount'],
        [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('viewer_id'))), 'uniqueViewers'],
        [db.sequelize.fn('AVG', db.sequelize.col('view_duration')), 'avgViewDuration'],
      ],
      group: ['listingId'],
      order: [[db.sequelize.literal('viewCount'), 'DESC']],
      limit: options.limit || 10,
      raw: true,
    });

    return trending;
  } catch (error) {
    throw new Error(`Error fetching trending listings: ${error.message}`);
  }
};

/**
 * Get view analytics for date range
 * @param {Object} options - Query options
 * @returns {Promise<Array>} View analytics grouped by date
 */
const getViewAnalytics = async (options = {}) => {
  try {
    const whereClause = {};

    if (options.listingType) {
      whereClause.listingType = options.listingType;
    }

    if (options.listingId) {
      whereClause.listingId = options.listingId;
    }

    if (options.startDate || options.endDate) {
      whereClause.viewedAt = {};
      if (options.startDate) {
        whereClause.viewedAt[Op.gte] = new Date(options.startDate);
      }
      if (options.endDate) {
        whereClause.viewedAt[Op.lte] = new Date(options.endDate);
      }
    }

    const analytics = await ListingAnalytics.findAll({
      where: whereClause,
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('viewed_at')), 'date'],
        [db.sequelize.fn('COUNT', db.sequelize.col('view_id')), 'totalViews'],
        [db.sequelize.fn('COUNT', db.sequelize.fn('DISTINCT', db.sequelize.col('viewer_id'))), 'uniqueViewers'],
        [db.sequelize.fn('AVG', db.sequelize.col('view_duration')), 'avgViewDuration'],
      ],
      group: [db.sequelize.fn('DATE', db.sequelize.col('viewed_at'))],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('viewed_at')), 'DESC']],
      raw: true,
    });

    return analytics;
  } catch (error) {
    throw new Error(`Error fetching view analytics: ${error.message}`);
  }
};

/**
 * Delete old view records (for data cleanup)
 * @param {number} daysToKeep - Number of days to keep
 * @returns {Promise<number>} Number of deleted records
 */
const cleanupOldViews = async (daysToKeep = 90) => {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const deletedCount = await ListingAnalytics.destroy({
      where: {
        viewedAt: {
          [Op.lt]: cutoffDate,
        },
      },
    });

    return deletedCount;
  } catch (error) {
    throw new Error(`Error cleaning up old views: ${error.message}`);
  }
};

/**
 * Get comprehensive analytics for PropertyAnalytics component
 * @param {string} listingType - Type of listing
 * @param {number} listingId - Listing ID
 * @param {string} timeRange - Time range (7d, 30d, 90d, all)
 * @returns {Promise<Object>} Comprehensive analytics data
 */
const getComprehensiveAnalytics = async (listingType, listingId, timeRange = '7d') => {
  try {
    const whereClause = {
      listingType,
      listingId,
    };

    // Calculate date range
    let startDate;
    const endDate = new Date();

    switch (timeRange) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    whereClause.viewedAt = {
      [Op.gte]: startDate,
      [Op.lte]: endDate,
    };

    // Get total views and trends
    const currentViews = await ListingAnalytics.count({ where: whereClause });

    // Get previous period for comparison
    const previousPeriodStart = new Date(startDate.getTime() - (endDate - startDate));
    const previousPeriodWhere = {
      ...whereClause,
      viewedAt: {
        [Op.gte]: previousPeriodStart,
        [Op.lt]: startDate,
      },
    };
    const previousViews = await ListingAnalytics.count({ where: previousPeriodWhere });

    const viewsChange = previousViews > 0 
      ? ((currentViews - previousViews) / previousViews) * 100 
      : 0;

    // Get daily views
    const dailyViews = await ListingAnalytics.findAll({
      where: whereClause,
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('viewed_at')), 'date'],
        [db.sequelize.fn('COUNT', db.sequelize.col('view_id')), 'value'],
      ],
      group: [db.sequelize.fn('DATE', db.sequelize.col('viewed_at'))],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('viewed_at')), 'ASC']],
      raw: true,
    });

    // Calculate bounce rate (views with duration < 10 seconds)
    const shortViews = await ListingAnalytics.count({
      where: {
        ...whereClause,
        viewDuration: {
          [Op.lt]: 10,
        },
      },
    });

    const bounceRate = currentViews > 0 ? (shortViews / currentViews) * 100 : 0;

    // Previous period bounce rate
    const previousShortViews = await ListingAnalytics.count({
      where: {
        ...previousPeriodWhere,
        viewDuration: {
          [Op.lt]: 10,
        },
      },
    });
    const previousBounceRate = previousViews > 0 
      ? (previousShortViews / previousViews) * 100 
      : 0;
    const bounceRateChange = bounceRate - previousBounceRate;

    // Get daily bounce rate
    const dailyBounceRate = await Promise.all(
      dailyViews.map(async (day) => {
        const dayStart = new Date(day.date);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const dayViews = parseInt(day.value);
        const dayShortViews = await ListingAnalytics.count({
          where: {
            listingType,
            listingId,
            viewedAt: {
              [Op.gte]: dayStart,
              [Op.lt]: dayEnd,
            },
            viewDuration: {
              [Op.lt]: 10,
            },
          },
        });

        return {
          date: day.date,
          value: dayViews > 0 ? parseFloat(((dayShortViews / dayViews) * 100).toFixed(1)) : 0,
        };
      })
    );

    // Get conversion rate (need to check ListingLead)
    const ListingLead = db.ListingLead;
    const leads = await ListingLead.count({
      where: {
        listingType: listingType.toUpperCase(),
        listingId,
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
    });

    const conversionRate = currentViews > 0 ? (leads / currentViews) * 100 : 0;

    // Previous period conversion
    const previousLeads = await ListingLead.count({
      where: {
        listingType: listingType.toUpperCase(),
        listingId,
        createdAt: {
          [Op.gte]: previousPeriodStart,
          [Op.lt]: startDate,
        },
      },
    });
    const previousConversionRate = previousViews > 0 
      ? (previousLeads / previousViews) * 100 
      : 0;
    const conversionRateChange = conversionRate - previousConversionRate;

    // Get daily conversion rate
    const dailyConversionRate = await Promise.all(
      dailyViews.map(async (day) => {
        const dayStart = new Date(day.date);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const dayViews = parseInt(day.value);
        const dayLeads = await ListingLead.count({
          where: {
            listingType: listingType.toUpperCase(),
            listingId,
            createdAt: {
              [Op.gte]: dayStart,
              [Op.lt]: dayEnd,
            },
          },
        });

        return {
          date: day.date,
          value: dayViews > 0 ? parseFloat(((dayLeads / dayViews) * 100).toFixed(2)) : 0,
        };
      })
    );

    // Get average time on page
    const avgTimeResult = await ListingAnalytics.findAll({
      where: {
        ...whereClause,
        viewDuration: {
          [Op.gt]: 0, // Only consider views with recorded duration
        },
      },
      attributes: [
        [db.sequelize.fn('AVG', db.sequelize.col('view_duration')), 'avgTime'],
      ],
      raw: true,
    });

    const avgTime = avgTimeResult[0]?.avgTime ? Math.round(avgTimeResult[0].avgTime) : 0;

    // Previous period avg time
    const previousAvgTimeResult = await ListingAnalytics.findAll({
      where: {
        ...previousPeriodWhere,
        viewDuration: {
          [Op.gt]: 0,
        },
      },
      attributes: [
        [db.sequelize.fn('AVG', db.sequelize.col('view_duration')), 'avgTime'],
      ],
      raw: true,
    });

    const previousAvgTime = previousAvgTimeResult[0]?.avgTime 
      ? Math.round(previousAvgTimeResult[0].avgTime) 
      : 0;
    const avgTimeChange = previousAvgTime > 0 
      ? ((avgTime - previousAvgTime) / previousAvgTime) * 100 
      : 0;

    // Get daily average time
    const dailyAvgTime = await ListingAnalytics.findAll({
      where: {
        ...whereClause,
        viewDuration: {
          [Op.gt]: 0,
        },
      },
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('viewed_at')), 'date'],
        [db.sequelize.fn('AVG', db.sequelize.col('view_duration')), 'value'],
      ],
      group: [db.sequelize.fn('DATE', db.sequelize.col('viewed_at'))],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('viewed_at')), 'ASC']],
      raw: true,
    });

    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    };

    // Format dates for frontend
    const formatDateForChart = (dateStr) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return {
      views: {
        total: currentViews,
        change: parseFloat(viewsChange.toFixed(1)),
        trend: viewsChange > 0 ? 'up' : viewsChange < 0 ? 'down' : 'stable',
        daily: dailyViews.map(d => ({
          date: formatDateForChart(d.date),
          value: parseInt(d.value),
        })),
      },
      bounceRate: {
        total: parseFloat(bounceRate.toFixed(1)),
        change: parseFloat(bounceRateChange.toFixed(1)),
        trend: bounceRateChange < 0 ? 'down' : bounceRateChange > 0 ? 'up' : 'stable',
        daily: dailyBounceRate.map(d => ({
          date: formatDateForChart(d.date),
          value: parseFloat(d.value),
        })),
      },
      conversionRate: {
        total: parseFloat(conversionRate.toFixed(2)),
        change: parseFloat(conversionRateChange.toFixed(1)),
        trend: conversionRateChange > 0 ? 'up' : conversionRateChange < 0 ? 'down' : 'stable',
        daily: dailyConversionRate.map(d => ({
          date: formatDateForChart(d.date),
          value: parseFloat(d.value),
        })),
      },
      averageTimeOnPage: {
        total: avgTime,
        totalFormatted: formatTime(avgTime),
        change: parseFloat(avgTimeChange.toFixed(1)),
        trend: avgTimeChange > 0 ? 'up' : avgTimeChange < 0 ? 'down' : 'stable',
        daily: dailyAvgTime.map(d => ({
          date: formatDateForChart(d.date),
          value: Math.round(d.value),
        })),
      },
    };
  } catch (error) {
    throw new Error(`Error fetching comprehensive analytics: ${error.message}`);
  }
};

module.exports = {
  recordView,
  updateViewDuration,
  getListingViewStats,
  getViewerHistory,
  getTrendingListings,
  getViewAnalytics,
  cleanupOldViews,
  getComprehensiveAnalytics,
};
