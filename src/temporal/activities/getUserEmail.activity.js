/**
 * Get User Email Activity
 * 
 * Helper activity to fetch user email for notifications
 * 
 * @module temporal/activities/getUserEmail
 */

const db = require("../../entity");
const PlatformUser = db.PlatformUser;
const logger = require("../../config/winston.config");

/**
 * Get user email by user ID
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - User ID
 * @returns {Promise<Object>} - User email result
 */
async function getUserEmail({ userId }) {
  logger.info(`[Developer Publishing] Fetching email for user ${userId}`);
  
  try {
    const user = await PlatformUser.findByPk(userId);

    if (!user || !user.email) {
      return {
        success: false,
        message: 'User email not found'
      };
    }

    return {
      success: true,
      email: user.email,
      userName: `${user.firstName} ${user.lastName}`.trim()
    };
  } catch (error) {
    logger.error('[Developer Publishing] Error fetching user email:', error);
    return {
      success: false,
      message: 'Failed to fetch user email'
    };
  }
}

module.exports = {
  getUserEmail
};
