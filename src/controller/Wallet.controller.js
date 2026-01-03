const WalletService = require("../service/WalletService.service");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/responseFormatter");
const logger = require("../config/winston.config");

/**
 * Get wallet balance for authenticated user
 * GET /api/wallet/balance
 */
const getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await WalletService.getWalletBalance(userId);

    if (!result.success) {
      return sendErrorResponse(res, result.message || 'Failed to fetch wallet balance', 500);
    }

    return sendSuccessResponse(
      res,
      { balance: result.balance },
      'Wallet balance fetched successfully',
      200
    );
  } catch (error) {
    logger.error('Error in getWalletBalance controller:', error);
    return sendErrorResponse(res, 'Failed to fetch wallet balance', 500);
  }
};

/**
 * Get transaction history with pagination
 * GET /api/wallet/transactions
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

    const result = await WalletService.getTransactionHistory(userId, {
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
 * Get wallet statistics for authenticated user
 * GET /api/wallet/stats
 */
const getWalletStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await WalletService.getWalletStats(userId);

    if (!result.success) {
      return sendErrorResponse(res, result.message || 'Failed to fetch wallet statistics', 500);
    }

    return sendSuccessResponse(
      res,
      result.stats,
      'Wallet statistics fetched successfully',
      200
    );
  } catch (error) {
    logger.error('Error in getWalletStats controller:', error);
    return sendErrorResponse(res, 'Failed to fetch wallet statistics', 500);
  }
};

/**
 * Add funds to a user wallet (Admin only)
 * POST /api/wallet/add
 * @body userId - Target user ID
 * @body amount - Number of units to add
 * @body reason - Reason for adding funds
 * @body metadata - Additional metadata (optional)
 */
const addFunds = async (req, res) => {
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

    const result = await WalletService.addFunds(
      userId,
      amount,
      reason,
      metadata
    );

    if (!result.success) {
      return sendErrorResponse(res, result.message || 'Failed to add funds', 400);
    }

    return sendSuccessResponse(
      res,
      result.transaction,
      'Funds added successfully',
      200
    );
  } catch (error) {
    logger.error('Error in addFunds controller:', error);
    return sendErrorResponse(res, 'Failed to add funds', 500);
  }
};

/**
 * Deduct funds from a user wallet (Admin only)
 * POST /api/wallet/deduct
 * @body userId - Target user ID
 * @body amount - Number of units to deduct
 * @body reason - Reason for deducting funds
 * @body metadata - Additional metadata (optional)
 */
const deductFunds = async (req, res) => {
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

    const result = await WalletService.deductFunds(
      userId,
      amount,
      reason,
      metadata
    );

    if (!result.success) {
      return sendErrorResponse(res, result.message || 'Failed to deduct funds', 400);
    }

    return sendSuccessResponse(
      res,
      result.transaction,
      'Funds deducted successfully',
      200
    );
  } catch (error) {
    logger.error('Error in deductFunds controller:', error);
    return sendErrorResponse(res, 'Failed to deduct funds', 500);
  }
};

/**
 * Check if user has sufficient funds
 * POST /api/wallet/check
 * @body amount - Required amount
 */
const checkSufficientFunds = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return sendErrorResponse(res, 'Amount must be a positive number', 400);
    }

    const result = await WalletService.checkSufficientFunds(userId, amount);

    if (!result.success) {
      return sendErrorResponse(res, result.message || 'Failed to check funds', 500);
    }

    return sendSuccessResponse(
      res,
      {
        hasSufficientFunds: result.hasSufficientFunds,
        currentBalance: result.currentBalance,
        requiredAmount: amount
      },
      result.hasSufficientFunds ? 'Sufficient funds available' : 'Insufficient funds',
      200
    );
  } catch (error) {
    logger.error('Error in checkSufficientFunds controller:', error);
    return sendErrorResponse(res, 'Failed to check funds', 500);
  }
};

module.exports = {
  getWalletBalance,
  getTransactionHistory,
  getWalletStats,
  addFunds,
  deductFunds,
  checkSufficientFunds
};
