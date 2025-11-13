const express = require("express");
const router = express.Router();
const UserController = require("../controller/User.controller.js");
const authMiddleware = require("../middleware/authMiddleware");

// Get current authenticated user
router.post("/partnerUser/get", authMiddleware, UserController.getUser);

// Update current authenticated user (also handles profile completion)
router.patch("/partnerUser/update", authMiddleware, UserController.updateUser);

// Verify phone number for current user
router.post("/partnerUser/verifyPhone", authMiddleware, UserController.verifyPhone);

// Get all users (admin function - consider adding admin middleware)
router.get("/partnerUser/all", authMiddleware, UserController.getAllUsers);

// Update user status (admin function - consider adding admin middleware)
router.patch("/partnerUser/updateStatus", authMiddleware, UserController.updateUserStatus);

module.exports = router;
