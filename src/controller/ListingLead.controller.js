const {
  createLead,
  getLeads,
  getLeadById,
  updateLeadStatus,
  updateLead,
  getLeadStats,
  deleteLead,
  getLeadsForListing,
} = require("../service/ListingLeadService.service");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../utils/responseFormatter");

/**
 * Create a new lead
 */
const createLeadHandler = async (req, res) => {
  try {
    const {
      listingType,
      listingId,
      reason,
      customerName,
      customerEmail,
      customerPhone,
      customerMessage,
      location,
      preferredContactTime,
      scheduledAt,
      metadata,
    } = req.body;

    // Validate required fields
    if (!listingType || !listingId || !reason || !customerName) {
      return sendErrorResponse(
        res,
        "Listing type, listing ID, reason, and customer name are required",
        400
      );
    }

    // Validate listing type
    const validTypes = ["PROPERTY", "PG_COLIVING", "PROJECT", "DEVELOPER"];
    if (!validTypes.includes(listingType)) {
      return sendErrorResponse(res, "Invalid listing type", 400);
    }

    // Validate reason
    const validReasons = [
      "CONNECT_AGENT",
      "CALLBACK_REQUEST",
      "VIRTUAL_TOUR",
    ];
    if (!validReasons.includes(reason)) {
      return sendErrorResponse(res, "Invalid lead reason", 400);
    }

    // Validate contact info (at least one is required)
    if (!customerEmail && !customerPhone) {
      return sendErrorResponse(
        res,
        "At least one contact method (email or phone) is required",
        400
      );
    }

    const leadData = {
      listingType,
      listingId: parseInt(listingId),
      reason,
      customerName,
      customerEmail,
      customerPhone,
      customerMessage,
      location,
      preferredContactTime,
      scheduledAt,
      partnerId: req.user ? req.user.userId : null,
      metadata,
    };

    const lead = await createLead(leadData);

    return sendSuccessResponse(res, lead, "Lead created successfully", 201);
  } catch (error) {
    console.error("Error creating lead:", error);
    return sendErrorResponse(res, error.message, 500);
  }
};

/**
 * Get leads with pagination and filters
 */
const getLeadsHandler = async (req, res) => {
  try {
    const {
      listingType,
      listingId,
      reason,
      status,
      customerEmail,
      customerPhone,
      startDate,
      endDate,
      page,
      pageSize,
    } = req.query;

    const filters = {
      listingType,
      listingId: listingId ? parseInt(listingId) : undefined,
      reason,
      status,
      customerEmail,
      customerPhone,
      startDate,
      endDate,
      partnerId: req.user ? req.user.userId : undefined,
    };

    // Remove undefined values
    Object.keys(filters).forEach(
      (key) => filters[key] === undefined && delete filters[key]
    );

    const pagination = {
      page: page || 1,
      pageSize: pageSize || 10,
    };

    const result = await getLeads(filters, pagination);

    return sendSuccessResponse(res, result, "Leads fetched successfully");
  } catch (error) {
    console.error("Error fetching leads:", error);
    return sendErrorResponse(res, error.message, 500);
  }
};

/**
 * Get lead by ID
 */
const getLeadByIdHandler = async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await getLeadById(parseInt(leadId));

    // Check if user has permission to view this lead
    if (req.user && lead.partnerId && lead.partnerId !== req.user.userId) {
      return sendErrorResponse(res, "Unauthorized to view this lead", 403);
    }

    return sendSuccessResponse(res, lead, "Lead fetched successfully");
  } catch (error) {
    console.error("Error fetching lead:", error);
    if (error.message === "Lead not found") {
      return sendErrorResponse(res, error.message, 404);
    }
    return sendErrorResponse(res, error.message, 500);
  }
};

/**
 * Update lead status
 */
const updateLeadStatusHandler = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { status } = req.body;

    if (!status) {
      return sendErrorResponse(res, "Status is required", 400);
    }

    // Validate status
    const validStatuses = [
      "NEW",
      "CONTACTED",
      "IN_PROGRESS",
      "COMPLETED",
      "CLOSED",
    ];
    if (!validStatuses.includes(status)) {
      return sendErrorResponse(res, "Invalid status", 400);
    }

    const lead = await updateLeadStatus(
      parseInt(leadId),
      status,
      req.user ? req.user.userId : null
    );

    return sendSuccessResponse(res, lead, "Lead status updated successfully");
  } catch (error) {
    console.error("Error updating lead status:", error);
    if (error.message === "Lead not found") {
      return sendErrorResponse(res, error.message, 404);
    }
    return sendErrorResponse(res, error.message, 500);
  }
};

/**
 * Update lead details
 */
const updateLeadHandler = async (req, res) => {
  try {
    const { leadId } = req.params;
    const updateData = req.body;

    const lead = await updateLead(parseInt(leadId), updateData);

    return sendSuccessResponse(res, lead, "Lead updated successfully");
  } catch (error) {
    console.error("Error updating lead:", error);
    if (error.message === "Lead not found") {
      return sendErrorResponse(res, error.message, 404);
    }
    return sendErrorResponse(res, error.message, 500);
  }
};

/**
 * Get lead statistics
 */
const getLeadStatsHandler = async (req, res) => {
  try {
    const { listingType, listingId, startDate, endDate } = req.query;

    const filters = {
      listingType,
      listingId: listingId ? parseInt(listingId) : undefined,
      startDate,
      endDate,
      partnerId: req.user ? req.user.userId : undefined,
    };

    // Remove undefined values
    Object.keys(filters).forEach(
      (key) => filters[key] === undefined && delete filters[key]
    );

    const stats = await getLeadStats(filters);

    return sendSuccessResponse(res, stats, "Lead statistics fetched successfully");
  } catch (error) {
    console.error("Error fetching lead statistics:", error);
    return sendErrorResponse(res, error.message, 500);
  }
};

/**
 * Delete a lead
 */
const deleteLeadHandler = async (req, res) => {
  try {
    const { leadId } = req.params;

    await deleteLead(parseInt(leadId));

    return sendSuccessResponse(res, null, "Lead deleted successfully");
  } catch (error) {
    console.error("Error deleting lead:", error);
    if (error.message === "Lead not found") {
      return sendErrorResponse(res, error.message, 404);
    }
    return sendErrorResponse(res, error.message, 500);
  }
};

/**
 * Get leads for a specific listing
 */
const getLeadsForListingHandler = async (req, res) => {
  try {
    const { listingType, listingId } = req.params;
    const { status, limit } = req.query;

    const options = {
      status,
      limit: limit ? parseInt(limit) : undefined,
    };

    // Remove undefined values
    Object.keys(options).forEach(
      (key) => options[key] === undefined && delete options[key]
    );

    const leads = await getLeadsForListing(listingType, parseInt(listingId), options);

    return sendSuccessResponse(
      res,
      leads,
      "Leads for listing fetched successfully"
    );
  } catch (error) {
    console.error("Error fetching leads for listing:", error);
    return sendErrorResponse(res, error.message, 500);
  }
};

module.exports = {
  createLead: createLeadHandler,
  getLeads: getLeadsHandler,
  getLeadById: getLeadByIdHandler,
  updateLeadStatus: updateLeadStatusHandler,
  updateLead: updateLeadHandler,
  getLeadStats: getLeadStatsHandler,
  deleteLead: deleteLeadHandler,
  getLeadsForListing: getLeadsForListingHandler,
};
