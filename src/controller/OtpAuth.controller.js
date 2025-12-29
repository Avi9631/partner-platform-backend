const logger = require("../config/winston.config.js");
const OtpAuthService = require("../service/OtpAuthService.service.js");
const { ApiResponse } = require("../utils/responseFormatter.js");
const jwt = require("jsonwebtoken");

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

/**
 * Send OTP to mobile number
 * @route POST /api/otp/send
 * @body {phone: string}
 */
async function sendOtp(req, res) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const { phone } = req.body;

    if (!phone) {
      return apiResponse
        .status(400)
        .withMessage("Phone number is required")
        .withError("Phone number is required", "PHONE_REQUIRED", "sendOtp")
        .error();
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return apiResponse
        .status(400)
        .withMessage("Invalid phone number format")
        .withError(
          "Phone number must be 10 digits starting with 6-9",
          "INVALID_PHONE",
          "sendOtp"
        )
        .error();
    }

    const result = await OtpAuthService.sendOtp(phone);

    apiResponse
      .status(200)
      .withMessage("OTP sent successfully")
      .withData({
        phone: phone,
        expiresIn: result.expiresIn,
      })
      .success();
  } catch (err) {
    logger.error(`Error sending OTP:`, err.message);
    apiResponse
      .status(500)
      .withMessage(err.message || "Failed to send OTP")
      .withError(err.message, err.code || "SEND_OTP_ERROR", "sendOtp")
      .error();
  }
}

/**
 * Verify OTP and login user
 * @route POST /api/otp/verify
 * @body {phone: string, otp: string}
 */
async function verifyOtp(req, res) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return apiResponse
        .status(400)
        .withMessage("Phone number and OTP are required")
        .withError(
          "Phone number and OTP are required",
          "MISSING_FIELDS",
          "verifyOtp"
        )
        .error();
    }

    const result = await OtpAuthService.verifyOtp(phone, otp);

    if (!result.verified) {
      return apiResponse
        .status(401)
        .withMessage(result.message || "Invalid or expired OTP")
        .withError(result.message, "INVALID_OTP", "verifyOtp")
        .error();
    }

    // Generate JWT tokens
    const user = result.user;
    const accessToken = jwt.sign(
      {
        userId: user.userId,
        userEmail: user.email,
        phone: user.phone,
      },
      accessTokenSecret,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      {
        userId: user.userId,
        userEmail: user.email,
        phone: user.phone,
      },
      refreshTokenSecret,
      { expiresIn: "7d" }
    );

    // Set cookies
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    apiResponse
      .status(200)
      .withMessage("Login successful")
      .withData({
        user: {
          userId: user.userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          nameInitial: user.nameInitial,
          profileImage: user.profileImage,
        },
        accessToken,
        refreshToken,
      })
      .success();
  } catch (err) {
    logger.error(`Error verifying OTP:`, err.message);
    apiResponse
      .status(500)
      .withMessage(err.message || "Failed to verify OTP")
      .withError(err.message, err.code || "VERIFY_OTP_ERROR", "verifyOtp")
      .error();
  }
}

/**
 * Resend OTP to mobile number
 * @route POST /api/otp/resend
 * @body {phone: string}
 */
async function resendOtp(req, res) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const { phone } = req.body;

    if (!phone) {
      return apiResponse
        .status(400)
        .withMessage("Phone number is required")
        .withError("Phone number is required", "PHONE_REQUIRED", "resendOtp")
        .error();
    }

    const result = await OtpAuthService.resendOtp(phone);

    apiResponse
      .status(200)
      .withMessage("OTP resent successfully")
      .withData({
        phone: phone,
        expiresIn: result.expiresIn,
      })
      .success();
  } catch (err) {
    logger.error(`Error resending OTP:`, err.message);
    apiResponse
      .status(500)
      .withMessage(err.message || "Failed to resend OTP")
      .withError(err.message, err.code || "RESEND_OTP_ERROR", "resendOtp")
      .error();
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
  resendOtp,
};
