const express = require("express");
const router = express.Router();
const CreditController = require("../controller/Credit.controller.js");
const authenticateToken = require("../middleware/authMiddleware");

/**
 * @route   GET /api/credit/balance
 * @desc    Get current credit balance for authenticated user
 * @access  Private (requires authentication)
 */
router.get(
  "/balance",
  authenticateToken,
  CreditController.getCreditBalance
);

/**
 * @route   GET /api/credit/transactions
 * @desc    Get transaction history with pagination
 * @access  Private (requires authentication)
 * @query   page, limit, transactionType, startDate, endDate
 */
router.get(
  "/transactions",
  authenticateToken,
  CreditController.getTransactionHistory
);

/**
 * @route   GET /api/credit/stats
 * @desc    Get credit statistics for authenticated user
 * @access  Private (requires authentication)
 */
router.get(
  "/stats",
  authenticateToken,
  CreditController.getCreditStats
);

/**
 * @route   POST /api/credit/add
 * @desc    Add credits to a user account (Admin only)
 * @access  Private (requires authentication, admin role recommended)
 * @body    userId, amount, reason, metadata
 */
router.post(
  "/add",
  authenticateToken,
  CreditController.addCredits
);

/**
 * @route   POST /api/credit/deduct
 * @desc    Deduct credits from a user account (Admin only)
 * @access  Private (requires authentication, admin role recommended)
 * @body    userId, amount, reason, metadata
 */
router.post(
  "/deduct",
  authenticateToken,
  CreditController.deductCredits
);

/**
 * @route   POST /api/credit/check
 * @desc    Check if user has sufficient credits
 * @access  Private (requires authentication)
 * @body    amount
 */
router.post(
  "/check",
  authenticateToken,
  CreditController.checkSufficientCredits
);

module.exports = router;
