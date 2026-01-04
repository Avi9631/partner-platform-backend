/**
 * Wallet Activities
 * 
 * Temporal activities for wallet and credit transaction operations.
 * These activities handle credit/debit operations, balance queries,
 * and transaction history retrieval.
 * 
 * @module temporal/activities/wallet
 */

const db = require("../../entity");
const WalletTransaction = db.WalletTransaction;
const PlatformUser = db.PlatformUser;
const { Op } = require("sequelize");
const logger = require("../../config/winston.config");

/**
 * Activity: Credit to Wallet
 * 
 * Adds funds to a user's wallet and creates a credit transaction.
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} params.amount - Number of units to add (must be positive)
 * @param {string} params.reason - Reason for adding funds
 * @param {object} [params.metadata=null] - Additional metadata (optional)
 * @returns {Promise<{success: boolean, transaction?: object, newBalance?: number, message?: string}>}
 */
async function creditToWallet({ userId, amount, reason, metadata = null }) {
  const transaction = await db.sequelize.transaction();
  
  try {
    // Validate amount
    if (!amount || amount <= 0) {
      await transaction.rollback();
      return {
        success: false,
        message: 'Amount must be a positive number'
      };
    }

    // Validate user exists
    const user = await PlatformUser.findByPk(userId);
    if (!user) {
      await transaction.rollback();
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Get current balance
    const currentBalance = await getCurrentBalance(userId);
    const newBalance = currentBalance + amount;

    // Create credit transaction
    const walletTransaction = await WalletTransaction.create({
      userId,
      transactionType: 'CREDIT',
      amount,
      balanceAfter: newBalance,
      reason: reason || 'Funds added',
      metadata
    }, { transaction });

    await transaction.commit();

    logger.info(`[Wallet Activity] Credited ${amount} to user ${userId}. New balance: ${newBalance}`);

    return {
      success: true,
      transaction: walletTransaction.toJSON(),
      newBalance
    };
  } catch (error) {
    await transaction.rollback();
    logger.error(`[Wallet Activity] Error crediting funds to user ${userId}:`, error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Activity: Debit from Wallet
 * 
 * Deducts funds from a user's wallet and creates a debit transaction.
 * Ensures sufficient balance before processing.
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} params.amount - Number of units to deduct (must be positive)
 * @param {string} params.reason - Reason for deducting funds
 * @param {object} [params.metadata=null] - Additional metadata (optional)
 * @returns {Promise<{success: boolean, transaction?: object, newBalance?: number, message?: string}>}
 */
async function debitFromWallet({ userId, amount, reason, metadata = null }) {
  const transaction = await db.sequelize.transaction();
  
  try {
    // Validate amount
    if (!amount || amount <= 0) {
      await transaction.rollback();
      return {
        success: false,
        message: 'Amount must be a positive number'
      };
    }

    // Validate user exists
    const user = await PlatformUser.findByPk(userId);
    if (!user) {
      await transaction.rollback();
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Get current balance
    const currentBalance = await getCurrentBalance(userId);

    // Check if user has sufficient balance
    if (currentBalance < amount) {
      await transaction.rollback();
      return {
        success: false,
        message: `Insufficient funds. Current balance: ${currentBalance}, Required: ${amount}`
      };
    }

    const newBalance = currentBalance - amount;

    // Create debit transaction
    const debitTransaction = await WalletTransaction.create({
      userId,
      transactionType: 'DEBIT',
      amount,
      balanceAfter: newBalance,
      reason: reason || 'Funds deducted',
      metadata
    }, { transaction });

    await transaction.commit();

    logger.info(`[Wallet Activity] Debited ${amount} from user ${userId}. New balance: ${newBalance}`);

    return {
      success: true,
      transaction: debitTransaction.toJSON(),
      newBalance
    };
  } catch (error) {
    await transaction.rollback();
    logger.error(`[Wallet Activity] Error debiting funds from user ${userId}:`, error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Activity: Get Wallet Balance
 * 
 * Retrieves the current wallet balance for a user.
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @returns {Promise<{success: boolean, balance: number, message?: string}>}
 */
async function getWalletBalance({ userId }) {
  try {
    // Validate user exists
    const user = await PlatformUser.findByPk(userId);
    if (!user) {
      return {
        success: false,
        balance: 0,
        message: 'User not found'
      };
    }

    const balance = await getCurrentBalance(userId);

    logger.info(`[Wallet Activity] Retrieved balance for user ${userId}: ${balance}`);

    return {
      success: true,
      balance
    };
  } catch (error) {
    logger.error(`[Wallet Activity] Error fetching wallet balance for user ${userId}:`, error);
    return {
      success: false,
      balance: 0,
      message: error.message
    };
  }
}

/**
 * Activity: Get Wallet Transactions
 * 
 * Retrieves transaction history for a user with optional filtering.
 * Supports pagination and various filters.
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @param {number} [params.page=1] - Page number for pagination
 * @param {number} [params.limit=20] - Items per page
 * @param {string} [params.transactionType] - Filter by transaction type ('CREDIT' or 'DEBIT')
 * @param {Date|string} [params.startDate] - Filter transactions from this date
 * @param {Date|string} [params.endDate] - Filter transactions until this date
 * @param {string} [params.reason] - Filter by reason (partial match)
 * @returns {Promise<{success: boolean, data?: object, message?: string}>}
 */
async function getWalletTransactions({ 
  userId, 
  page = 1, 
  limit = 20, 
  transactionType,
  startDate,
  endDate,
  reason
}) {
  try {
    // Validate user exists
    const user = await PlatformUser.findByPk(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Build where clause
    const whereClause = { userId };

    // Filter by transaction type
    if (transactionType) {
      if (!['CREDIT', 'DEBIT'].includes(transactionType.toUpperCase())) {
        return {
          success: false,
          message: 'Invalid transaction type. Must be CREDIT or DEBIT'
        };
      }
      whereClause.transactionType = transactionType.toUpperCase();
    }

    // Filter by date range
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
    }

    // Filter by reason (partial match)
    if (reason) {
      whereClause.reason = {
        [Op.like]: `%${reason}%`
      };
    }

    // Calculate pagination
    const offset = (page - 1) * limit;

    // Fetch transactions
    const { count, rows: transactions } = await WalletTransaction.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['transactionId', 'DESC']],
      include: [
        {
          model: PlatformUser,
          as: 'user',
          attributes: ['userId', 'name', 'email']
        }
      ]
    });

    // Get current balance
    const currentBalance = await getCurrentBalance(userId);

    logger.info(`[Wallet Activity] Retrieved ${transactions.length} transactions for user ${userId}`);

    return {
      success: true,
      data: {
        transactions,
        currentBalance,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    logger.error(`[Wallet Activity] Error fetching transaction history for user ${userId}:`, error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Helper function: Get Current Balance
 * 
 * Internal helper to get the current wallet balance.
 * Retrieves the balanceAfter from the most recent transaction.
 * 
 * @param {number} userId - User ID
 * @returns {Promise<number>} Current balance
 * @private
 */
async function getCurrentBalance(userId) {
  const latestTransaction = await WalletTransaction.findOne({
    where: { userId },
    order: [['transactionId', 'DESC']],
    attributes: ['balanceAfter']
  });

  return latestTransaction ? latestTransaction.balanceAfter : 0;
}

module.exports = {
  creditToWallet,
  debitFromWallet,
  getWalletBalance,
  getWalletTransactions
};
