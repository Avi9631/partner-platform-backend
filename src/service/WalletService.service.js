const db = require("../entity");
const WalletTransaction = db.WalletTransaction;
const PlatformUser = db.PlatformUser;
const { Op } = require("sequelize");
const logger = require("../config/winston.config");

/**
 * Get user's current wallet balance
 * @param {number} userId - User ID
 * @returns {Promise<{success: boolean, balance: number, message?: string}>}
 */
const getWalletBalance = async (userId) => {
  try {
    // Get the latest transaction to find current balance
    const latestTransaction = await WalletTransaction.findOne({
      where: { userId },
      order: [['transactionId', 'DESC']],
      attributes: ['balanceAfter']
    });

    const balance = latestTransaction ? latestTransaction.balanceAfter : 0;

    return {
      success: true,
      balance
    };
  } catch (error) {
    logger.error(`Error fetching wallet balance for user ${userId}:`, error);
    return {
      success: false,
      balance: 0,
      message: error.message
    };
  }
};

/**
 * Add funds to user wallet
 * @param {number} userId - User ID
 * @param {number} amount - Number of units to add
 * @param {string} reason - Reason for adding funds
 * @param {object} metadata - Additional metadata (optional)
 * @returns {Promise<{success: boolean, transaction?: object, message?: string}>}
 */
const addFunds = async (userId, amount, reason, metadata = null) => {
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
    const currentBalanceResult = await getWalletBalance(userId);
    const currentBalance = currentBalanceResult.balance;
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

    logger.info(`Added ${amount} funds to user ${userId}. New balance: ${newBalance}`);

    return {
      success: true,
      transaction: walletTransaction.toJSON()
    };
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error adding funds to user ${userId}:`, error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Deduct funds from user wallet
 * @param {number} userId - User ID
 * @param {number} amount - Number of units to deduct
 * @param {string} reason - Reason for deducting funds
 * @param {object} metadata - Additional metadata (optional)
 * @returns {Promise<{success: boolean, transaction?: object, message?: string}>}
 */
const deductFunds = async (userId, amount, reason, metadata = null) => {
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
    const currentBalanceResult = await getWalletBalance(userId);
    const currentBalance = currentBalanceResult.balance;

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

    logger.info(`Deducted ${amount} funds from user ${userId}. New balance: ${newBalance}`);

    return {
      success: true,
      transaction: debitTransaction.toJSON()
    };
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error deducting funds from user ${userId}:`, error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Get transaction history with pagination
 * @param {number} userId - User ID
 * @param {object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.transactionType - Filter by transaction type (optional)
 * @param {string} options.referenceType - Filter by reference type (optional)
 * @param {Date} options.startDate - Filter transactions from this date (optional)
 * @param {Date} options.endDate - Filter transactions until this date (optional)
 * @returns {Promise<{success: boolean, data?: object, message?: string}>}
 */
const getTransactionHistory = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      transactionType,
      startDate,
      endDate
    } = options;

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

    if (transactionType) {
      whereClause.transactionType = transactionType;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate);
      }
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
        }
      ]
    });

    // Get current balance
    const balanceResult = await getWalletBalance(userId);

    return {
      success: true,
      data: {
        transactions,
        currentBalance: balanceResult.balance,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    logger.error(`Error fetching transaction history for user ${userId}:`, error);
    return {
      success: false,
      message: error.message
    };
  }
};

/**
 * Check if user has sufficient funds
 * @param {number} userId - User ID
 * @param {number} requiredAmount - Required amount
 * @returns {Promise<{success: boolean, hasSufficientFunds: boolean, currentBalance: number, message?: string}>}
 */
const checkSufficientFunds = async (userId, requiredAmount) => {
  try {
    const balanceResult = await getWalletBalance(userId);
    
    if (!balanceResult.success) {
      return {
        success: false,
        hasSufficientFunds: false,
        currentBalance: 0,
        message: balanceResult.message
      };
    }

    const hasSufficientFunds = balanceResult.balance >= requiredAmount;

    return {
      success: true,
      hasSufficientFunds,
      currentBalance: balanceResult.balance
    };
  } catch (error) {
    logger.error(`Error checking funds for user ${userId}:`, error);
    return {
      success: false,
      hasSufficientFunds: false,
      currentBalance: 0,
      message: error.message
    };
  }
};

/**
 * Get wallet statistics for a user
 * @param {number} userId - User ID
 * @returns {Promise<{success: boolean, stats?: object, message?: string}>}
 */
const getWalletStats = async (userId) => {
  try {
    const user = await PlatformUser.findByPk(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }

    // Get total funds earned
    const totalEarned = await WalletTransaction.sum('amount', {
      where: {
        userId,
        transactionType: 'CREDIT'
      }
    });

    // Get total funds spent
    const totalSpent = await WalletTransaction.sum('amount', {
      where: {
        userId,
        transactionType: 'DEBIT'
      }
    });

    // Get current balance
    const balanceResult = await getWalletBalance(userId);

    // Get transaction count
    const transactionCount = await WalletTransaction.count({
      where: { userId }
    });

    return {
      success: true,
      stats: {
        currentBalance: balanceResult.balance,
        totalEarned: totalEarned || 0,
        totalSpent: totalSpent || 0,
        transactionCount
      }
    };
  } catch (error) {
    logger.error(`Error fetching wallet stats for user ${userId}:`, error);
    return {
      success: false,
      message: error.message
    };
  }
};

module.exports = {
  getWalletBalance,
  addFunds,
  deductFunds,
  getTransactionHistory,
  checkSufficientFunds,
  getWalletStats
};
