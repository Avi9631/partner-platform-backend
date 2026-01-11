const db = require("../entity");
const ListingLead = db.ListingLead;
const { Op } = require("sequelize");

/**
 * Create a new lead
 * @param {Object} leadData - Lead data
 * @returns {Promise<Object>} Created lead record
 */
const createLead = async (leadData) => {
  try {
    const lead = await ListingLead.create({
      listingType: leadData.listingType,
      listingId: leadData.listingId,
      reason: leadData.reason,
      customerName: leadData.customerName,
      customerEmail: leadData.customerEmail || null,
      customerPhone: leadData.customerPhone || null,
      customerMessage: leadData.customerMessage || null,
      location: leadData.location || null,
      preferredContactTime: leadData.preferredContactTime || null,
      scheduledAt: leadData.scheduledAt || null,
      partnerId: leadData.partnerId || null,
      status: leadData.status || "NEW",
      metadata: leadData.metadata || null,
    });

    return lead;
  } catch (error) {
    throw new Error(`Error creating lead: ${error.message}`);
  }
};

/**
 * Get leads with pagination and filters
 * @param {Object} filters - Filter options
 * @param {Object} pagination - Pagination options
 * @returns {Promise<Object>} Paginated leads
 */
const getLeads = async (filters = {}, pagination = {}) => {
  try {
    const whereClause = {};

    // Apply filters
    if (filters.listingType) {
      whereClause.listingType = filters.listingType;
    }

    if (filters.listingId) {
      whereClause.listingId = filters.listingId;
    }

    if (filters.reason) {
      whereClause.reason = filters.reason;
    }

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.partnerId) {
      whereClause.partnerId = filters.partnerId;
    }

    if (filters.customerEmail) {
      whereClause.customerEmail = filters.customerEmail;
    }

    if (filters.customerPhone) {
      whereClause.customerPhone = filters.customerPhone;
    }

    // Date range filters
    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt[Op.gte] = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.createdAt[Op.lte] = new Date(filters.endDate);
      }
    }

    // Pagination
    const page = parseInt(pagination.page) || 1;
    const pageSize = parseInt(pagination.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    const { count, rows } = await ListingLead.findAndCountAll({
      where: whereClause,
      limit: pageSize,
      offset: offset,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: db.PlatformUser,
          as: "partner",
          attributes: ["userId", "firstName", "lastName", "email", "phone"],
          required: false,
        },
      ],
    });

    return {
      leads: rows,
      pagination: {
        total: count,
        page: page,
        pageSize: pageSize,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  } catch (error) {
    throw new Error(`Error fetching leads: ${error.message}`);
  }
};

/**
 * Get lead by ID
 * @param {number} leadId - Lead ID
 * @returns {Promise<Object>} Lead record
 */
const getLeadById = async (leadId) => {
  try {
    const lead = await ListingLead.findByPk(leadId, {
      include: [
        {
          model: db.PlatformUser,
          as: "partner",
          attributes: ["userId", "firstName", "lastName", "email", "phone"],
          required: false,
        },
      ],
    });

    if (!lead) {
      throw new Error("Lead not found");
    }

    return lead;
  } catch (error) {
    throw new Error(`Error fetching lead: ${error.message}`);
  }
};

/**
 * Update lead status
 * @param {number} leadId - Lead ID
 * @param {string} status - New status
 * @param {number} userId - User ID making the update
 * @returns {Promise<Object>} Updated lead
 */
const updateLeadStatus = async (leadId, status, userId = null) => {
  try {
    const lead = await ListingLead.findByPk(leadId);

    if (!lead) {
      throw new Error("Lead not found");
    }

    lead.status = status;

    // Update timestamp based on status
    if (status === "CONTACTED" && !lead.contactedAt) {
      lead.contactedAt = new Date();
    }

    if (status === "COMPLETED" && !lead.completedAt) {
      lead.completedAt = new Date();
    }

    await lead.save();

    return lead;
  } catch (error) {
    throw new Error(`Error updating lead status: ${error.message}`);
  }
};

/**
 * Update lead details
 * @param {number} leadId - Lead ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated lead
 */
const updateLead = async (leadId, updateData) => {
  try {
    const lead = await ListingLead.findByPk(leadId);

    if (!lead) {
      throw new Error("Lead not found");
    }

    // Update allowed fields
    const allowedFields = [
      "customerName",
      "customerEmail",
      "customerPhone",
      "customerMessage",
      "location",
      "preferredContactTime",
      "scheduledAt",
      "status",
      "metadata",
    ];

    allowedFields.forEach((field) => {
      if (updateData[field] !== undefined) {
        lead[field] = updateData[field];
      }
    });

    await lead.save();

    return lead;
  } catch (error) {
    throw new Error(`Error updating lead: ${error.message}`);
  }
};

/**
 * Get lead statistics
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Lead statistics
 */
const getLeadStats = async (filters = {}) => {
  try {
    const whereClause = {};

    if (filters.listingType) {
      whereClause.listingType = filters.listingType;
    }

    if (filters.listingId) {
      whereClause.listingId = filters.listingId;
    }

    if (filters.partnerId) {
      whereClause.partnerId = filters.partnerId;
    }

    if (filters.startDate || filters.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt[Op.gte] = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.createdAt[Op.lte] = new Date(filters.endDate);
      }
    }

    // Get total count
    const total = await ListingLead.count({ where: whereClause });

    // Get count by status
    const statusStats = await ListingLead.findAll({
      where: whereClause,
      attributes: [
        "status",
        [db.sequelize.fn("COUNT", db.sequelize.col("lead_id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    // Get count by reason
    const reasonStats = await ListingLead.findAll({
      where: whereClause,
      attributes: [
        "reason",
        [db.sequelize.fn("COUNT", db.sequelize.col("lead_id")), "count"],
      ],
      group: ["reason"],
      raw: true,
    });

    // Get count by listing type
    const typeStats = await ListingLead.findAll({
      where: whereClause,
      attributes: [
        "listingType",
        [db.sequelize.fn("COUNT", db.sequelize.col("lead_id")), "count"],
      ],
      group: ["listingType"],
      raw: true,
    });

    // Format stats
    const stats = {
      total: total,
      new: 0,
      contacted: 0,
      inProgress: 0,
      completed: 0,
      closed: 0,
    };

    statusStats.forEach((stat) => {
      const status = stat.status.toLowerCase();
      if (status === "new") stats.new = parseInt(stat.count);
      if (status === "contacted") stats.contacted = parseInt(stat.count);
      if (status === "in_progress") stats.inProgress = parseInt(stat.count);
      if (status === "completed") stats.completed = parseInt(stat.count);
      if (status === "closed") stats.closed = parseInt(stat.count);
    });

    return {
      ...stats,
      byReason: reasonStats,
      byType: typeStats,
    };
  } catch (error) {
    throw new Error(`Error fetching lead statistics: ${error.message}`);
  }
};

/**
 * Delete a lead
 * @param {number} leadId - Lead ID
 * @returns {Promise<boolean>} Success status
 */
const deleteLead = async (leadId) => {
  try {
    const lead = await ListingLead.findByPk(leadId);

    if (!lead) {
      throw new Error("Lead not found");
    }

    await lead.destroy();

    return true;
  } catch (error) {
    throw new Error(`Error deleting lead: ${error.message}`);
  }
};

/**
 * Get leads for a specific listing
 * @param {string} listingType - Listing type
 * @param {number} listingId - Listing ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} List of leads
 */
const getLeadsForListing = async (listingType, listingId, options = {}) => {
  try {
    const whereClause = {
      listingType,
      listingId,
    };

    if (options.status) {
      whereClause.status = options.status;
    }

    const leads = await ListingLead.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      limit: options.limit || 100,
      include: [
        {
          model: db.PlatformUser,
          as: "partner",
          attributes: ["userId", "firstName", "lastName", "email"],
          required: false,
        },
      ],
    });

    return leads;
  } catch (error) {
    throw new Error(`Error fetching leads for listing: ${error.message}`);
  }
};

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLeadStatus,
  updateLead,
  getLeadStats,
  deleteLead,
  getLeadsForListing,
};
