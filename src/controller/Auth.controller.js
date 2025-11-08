const jwt = require("jsonwebtoken");
const lodash = require("lodash");
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;
const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const logger = require("../config/winston.config.js");
const AuthService = require("../service/AuthService.service.js");
 const { ApiResponse } = require("../utils/responseFormatter.js");
 

async function getUser(req, res, next) {
  const apiResponse = new ApiResponse(req, res);

  try {
    const user = await AuthService.getUser(req.user.userId);

    apiResponse
      .status(200)
      .withMessage("User retrieved successfully")
      .withData({ user })
      .withMeta({
        userId: req.user.userId,
      })
      .success();
  } catch (err) {
    logger.error(`Error occurred while fetching user:`, err.message);
    apiResponse
      .status(500)
      .withMessage(err.message || "Failed to fetch user")
      .withError(err.message, err.code || "GET_USER_ERROR", "getUser")
      .withMeta({
        userId: req.user?.userId,
      })
      .error();
  }
}
 
module.exports = {
   getUser,
};
