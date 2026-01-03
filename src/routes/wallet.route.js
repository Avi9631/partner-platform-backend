const express = require("express");
const router = express.Router();
const WalletController = require("../controller/Wallet.controller.js");
const authenticateToken = require("../middleware/authMiddleware");

/**
 * @route   GET /api/wallet/balance
 * @desc    Get current wallet balance for authenticated user
 * @access  Private (requires authentication)
 */
router.get(
  "/balance",
  authenticateToken,
  WalletController.getWalletBalance
);

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get transaction history with pagination
 * @access  Private (requires authentication)
 * @query   page, limit, transactionType, startDate, endDate
 */
router.get(
  "/transactions",
  authenticateToken,
  WalletController.getTransactionHistory
);

/**
 * @route   GET /api/wallet/stats
 * @desc    Get wallet statistics for authenticated user
 * @access  Private (requires authentication)
 */
router.get(
  "/stats",
  authenticateToken,
  WalletController.getWalletStats
);

/**
 * @route   POST /api/wallet/add
 * @desc    Add funds to a user wallet (Admin only)
 * @access  Private (requires authentication, admin role recommended)
 * @body    userId, amount, reason, metadata
 */
router.post(
  "/add",
  authenticateToken,
  WalletController.addFunds
);

/**
 * @route   POST /api/wallet/deduct
 * @desc    Deduct funds from a user wallet (Admin only)
 * @access  Private (requires authentication, admin role recommended)
 * @body    userId, amount, reason, metadata
 */
router.post(
  "/deduct",
  authenticateToken,
  WalletController.deductFunds
);

/**
 * @route   POST /api/wallet/check
 * @desc    Check if user has sufficient funds
 * @access  Private (requires authentication)
 * @body    amount
 */
router.post(
  "/check",
  authenticateToken,
  WalletController.checkSufficientFunds
);

module.exports = router;
