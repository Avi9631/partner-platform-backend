const express = require("express");
const router = express.Router();
const OtpAuthController = require("../controller/OtpAuth.controller.js");

/**
 * @route POST /api/otp/send
 * @desc Send OTP to phone number
 * @access Public
 */
router.post("/send", OtpAuthController.sendOtp);

/**
 * @route POST /api/otp/verify
 * @desc Verify OTP and login user
 * @access Public
 */
router.post("/verify", OtpAuthController.verifyOtp);

/**
 * @route POST /api/otp/resend
 * @desc Resend OTP to phone number
 * @access Public
 */
router.post("/resend", OtpAuthController.resendOtp);

module.exports = router;
