const CreditService = require("../service/CreditService.service");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/responseFormatter");
const logger = require("../config/winston.config");

/**
 * Get credit balance for authenticated user
 * GET /api/credit/balance
 */
const getCreditBalance = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await CreditService.getCreditBalance(userId);

    if (!result.success) {
      return sendErrorResponse(res, result.message || 'Failed to fetch credit balance', 500);
    }

    return sendSuccessResponse(
      res,
      { balance: result.balance },
      'Credit balance fetched successfully',
      200
    );
  } catch (error) {
    logger.error('Error in getCreditBalance controller:', error);
    return sendErrorResponse(res, 'Failed to fetch credit balance', 500);
  }
};

/**
 * Get transaction history with pagination
 * GET /api/credit/transactions
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 20)
 * @query transactionType - Filter by CREDIT or DEBIT
 * @query referenceType - Filter by reference type
 * @query startDate - Filter from date
 * @query endDate - Filter to date
 */
const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      page = 1,
      limit = 20,
      transactionType,
      startDate,
      endDate
    } = req.query;

    const result = await CreditService.getTransactionHistory(userId, {
      page,
      limit,
      transactionType,
      startDate,
      endDate
    });

    if (!result.success) {
      return sendErrorResponse(res, result.message || 'Failed to fetch transaction history', 500);
    }

    return sendSuccessResponse(
      res,
      result.data,
      'Transaction history fetched successfully',
      200
    );
  } catch (error) {
    logger.error('Error in getTransactionHistory controller:', error);
    return sendErrorResponse(res, 'Failed to fetch transaction history', 500);
  }
};

/**
 * Get credit statistics for authenticated user
 * GET /api/credit/stats
 */
const getCreditStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await CreditService.getCreditStats(userId);

    if (!result.success) {
      return sendErrorResponse(res, result.message || 'Failed to fetch credit statistics', 500);
    }

    return sendSuccessResponse(
      res,
      result.stats,
      'Credit statistics fetched successfully',
      200
    );
  } catch (error) {
    logger.error('Error in getCreditStats controller:', error);
    return sendErrorResponse(res, 'Failed to fetch credit statistics', 500);
  }
};

/**
 * Add credits to a user account (Admin only)
 * POST /api/credit/add
 * @body userId - Target user ID
 * @body amount - Number of credits to add
 * @body reason - Reason for adding credits
 * @body metadata - Additional metadata (optional)
 */
const addCredits = async (req, res) => {
  try {
    const { userId, amount, reason, metadata } = req.body;

    // Validate required fields
    if (!userId) {
      return sendErrorResponse(res, 'User ID is required', 400);
    }

    if (!amount || amount <= 0) {
      return sendErrorResponse(res, 'Amount must be a positive number', 400);
    }

    if (!reason) {
      return sendErrorResponse(res, 'Reason is required', 400);
    }

    const result = await CreditService.addCredits(
      userId,
      amount,
      reason,
      metadata
    );

    if (!result.success) {
      return sendErrorResponse(res, result.message || 'Failed to add credits', 400);
    }

    return sendSuccessResponse(
      res,
      result.transaction,
      'Credits added successfully',
      200
    );
  } catch (error) {
    logger.error('Error in addCredits controller:', error);
    return sendErrorResponse(res, 'Failed to add credits', 500);
  }
};

/**
 * Deduct credits from a user account (Admin only)
 * POST /api/credit/deduct
 * @body userId - Target user ID
 * @body amount - Number of credits to deduct
 * @body reason - Reason for deducting credits
 * @body metadata - Additional metadata (optional)
 */
const deductCredits = async (req, res) => {
  try {
    const { userId, amount, reason, metadata } = req.body;

    // Validate required fields
    if (!userId) {
      return sendErrorResponse(res, 'User ID is required', 400);
    }

    if (!amount || amount <= 0) {
      return sendErrorResponse(res, 'Amount must be a positive number', 400);
    }

    if (!reason) {
      return sendErrorResponse(res, 'Reason is required', 400);
    }

    const result = await CreditService.deductCredits(
      userId,
      amount,
      reason,
      metadata
    );

    if (!result.success) {
      return sendErrorResponse(res, result.message || 'Failed to deduct credits', 400);
    }

    return sendSuccessResponse(
      res,
      result.transaction,
      'Credits deducted successfully',
      200
    );
  } catch (error) {
    logger.error('Error in deductCredits controller:', error);
    return sendErrorResponse(res, 'Failed to deduct credits', 500);
  }
};

/**
 * Check if user has sufficient credits
 * POST /api/credit/check
 * @body amount - Required credit amount
 */
const checkSufficientCredits = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return sendErrorResponse(res, 'Amount must be a positive number', 400);
    }

    const result = await CreditService.checkSufficientCredits(userId, amount);

    if (!result.success) {
      return sendErrorResponse(res, result.message || 'Failed to check credits', 500);
    }

    return sendSuccessResponse(
      res,
      {
        hasSufficientCredits: result.hasSufficientCredits,
        currentBalance: result.currentBalance,
        requiredAmount: amount
      },
      result.hasSufficientCredits ? 'Sufficient credits available' : 'Insufficient credits',
      200
    );
  } catch (error) {
    logger.error('Error in checkSufficientCredits controller:', error);
    return sendErrorResponse(res, 'Failed to check credits', 500);
  }
};

module.exports = {
  getCreditBalance,
  getTransactionHistory,
  getCreditStats,
  addCredits,
  deductCredits,
  checkSufficientCredits
};
