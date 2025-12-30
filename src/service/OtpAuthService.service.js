const db = require("../entity/index.js");
const logger = require("../config/winston.config.js");
const crypto = require("crypto");

// In-memory OTP storage (for production, use Redis or database)
const otpStore = new Map();

// OTP expiry time in minutes
const OTP_EXPIRY_MINUTES = 5;
const OTP_LENGTH = 6;

/**
 * Generate a random OTP
 */
function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Get user initials from name
 */
const getInitials = (name) => {
  const trimmedName = name.trim();

  if (!trimmedName.includes(" ")) {
    return trimmedName.slice(0, 2).toUpperCase();
  }

  const words = trimmedName.split(" ").filter((word) => word.length > 0);
  const initials = words.map((word) => word.charAt(0).toUpperCase()).join("");

  return initials.slice(0, 2);
};

/**
 * Send OTP to phone number
 * @param {string} phone - Phone number
 * @returns {Promise<{success: boolean, expiresIn: number}>}
 */
async function sendOtp(phone) {
  try {
    // Generate OTP
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP in memory (use Redis for production)
    otpStore.set(phone, {
      otp,
      expiresAt,
      attempts: 0,
    });

    // TODO: Integrate with SMS service provider (Twilio, AWS SNS, etc.)
    // For development, log OTP to console
    logger.info(`OTP for ${phone}: ${otp} (expires at ${expiresAt})`);
    console.log(`\n🔐 OTP for ${phone}: ${otp}\n`);

    // In production, send actual SMS:
    // await sendSms(phone, `Your OTP is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`);

    return {
      success: true,
      expiresIn: OTP_EXPIRY_MINUTES * 60, // in seconds
    };
  } catch (error) {
    logger.error(`Error sending OTP: ${error.message}`);
    throw new Error("Failed to send OTP");
  }
}

/**
 * Verify OTP and create/login user
 * @param {string} phone - Phone number
 * @param {string} otp - OTP to verify
 * @returns {Promise<{verified: boolean, user?: object, message?: string}>}
 */
async function verifyOtp(phone, otp) {
  try {
    const otpData = otpStore.get(phone);

    if (!otpData) {
      return {
        verified: false,
        message: "OTP not found. Please request a new OTP.",
      };
    }

    // Check if OTP is expired
    if (new Date() > otpData.expiresAt) {
      otpStore.delete(phone);
      return {
        verified: false,
        message: "OTP has expired. Please request a new OTP.",
      };
    }

    // Check if too many attempts
    if (otpData.attempts >= 3) {
      otpStore.delete(phone);
      return {
        verified: false,
        message: "Too many failed attempts. Please request a new OTP.",
      };
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      otpData.attempts += 1;
      otpStore.set(phone, otpData);
      return {
        verified: false,
        message: `Invalid OTP. ${3 - otpData.attempts} attempts remaining.`,
      };
    }

    // OTP verified - clear from store
    otpStore.delete(phone);

    // Find or create user
    let user = await db.PlatformUser.findOne({
      where: { phone: phone },
      include: [
        {
          model: db.PartnerBusiness,
          as: "business",
          required: false,
        },
      ],
    });

    if (!user) {
      // Create new user with phone number
      user = await db.PlatformUser.create({
        phone: phone,
        firstName: "User",
        lastName: phone.slice(-4), // Use last 4 digits as temp last name
        phoneVerifiedAt: new Date(),
        nameInitial: getInitials(`User ${phone.slice(-4)}`),
      });
      logger.info(`New user created with phone: ${phone}`);
    } else {
      // Update phone verification timestamp
      await user.update({
        phoneVerifiedAt: new Date(),
      });
    }

    // Compute accountType dynamically
    const accountType = (user.business && user.business.verificationStatus === 'APPROVED') 
      ? 'BUSINESS' 
      : 'INDIVIDUAL';

    return {
      verified: true,
      user: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        nameInitial: user.nameInitial,
        profileImage: user.profileImage,
        accountType: accountType,
      },
    };
  } catch (error) {
    logger.error(`Error verifying OTP: ${error.message}`);
    throw new Error("Failed to verify OTP");
  }
}

/**
 * Resend OTP to phone number
 * @param {string} phone - Phone number
 * @returns {Promise<{success: boolean, expiresIn: number}>}
 */
async function resendOtp(phone) {
  // Clear existing OTP if any
  otpStore.delete(phone);

  // Send new OTP
  return await sendOtp(phone);
}

/**
 * Clean up expired OTPs (run periodically)
 */
function cleanupExpiredOtps() {
  const now = new Date();
  for (const [phone, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(phone);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredOtps, 5 * 60 * 1000);

module.exports = {
  sendOtp,
  verifyOtp,
  resendOtp,
};
