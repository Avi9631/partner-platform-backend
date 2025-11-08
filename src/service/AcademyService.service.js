 const db = require("../entity/index.js");
 const logger = require("../config/winston.config.js");
 
 
const getUser = async (userId) => {
  try {
    // Input validation
    if (!userId) throw new Error("User ID is required");

    const userData = await db.User.findByPk(userId);

    if (!userData) {
      logger.warn(`User not found with ID: ${userId}`);
      throw new Error("User not found");
    }

    // Convert to plain object and remove any sensitive information
    const userJson = userData.toJSON();

    getStudyStreak(userId);
    calculateLearningHours(userId);

    return userJson;
  } catch (error) {
    logger.error("Error in getUser:", error);
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
};
 

module.exports = {
  getUser,
 
};
