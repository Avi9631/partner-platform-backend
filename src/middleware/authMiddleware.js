// authMiddleware.js
const jwt = require("jsonwebtoken");
const _ = require("lodash");
const logger = require('../config/winston.config')

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

const authenticateToken = (req, res, next) => {
  // const authHeader = req.headers.authorization;
  // const token = authHeader && authHeader.split(" ")[1];
  const token = req.cookies?.accessToken
  if (!token) {
    logger.error("Token missing from Authorization header");
    return res.status(401).json({ error: "Authorization token missing" }); // Unauthorized
  }

  jwt.verify(token, accessTokenSecret, (err, user) => {
    if (err) {
      logger.error("Token verification error:", err.message);
      // Return 401 for expired tokens to trigger refresh on frontend
      const statusCode = err.name === "TokenExpiredError" ? 401 : 403;
      return res.status(statusCode).json({ 
        error: "Invalid or expired token",
        code: err.name 
      });
    }

    if (!_.get(user, "userId") || !_.get(user, "userEmail")) {
      logger.error("Invalid token structure or missing user details");
      return res.status(403).json({ error: "Invalid token structure" });
    }

    req.user = user; // Attach user information to the request
    logger.info("Authenticated user:", user); // Optional logging for debugging
    next();
  });
};

/**
 * Optional authentication middleware - doesn't require token but attaches user if present
 */
const optionalAuthenticateToken = (req, res, next) => {
  const token = req.cookies?.accessToken;
  
  if (!token) {
    // No token provided, continue without user
    return next();
  }

  jwt.verify(token, accessTokenSecret, (err, user) => {
    if (err) {
      // Token invalid or expired, continue without user
      logger.warn("Optional auth - token verification failed:", err.message);
      return next();
    }

    if (_.get(user, "userId") && _.get(user, "userEmail")) {
      req.user = user; // Attach user information to the request
      logger.info("Optional auth - authenticated user:", user);
    }
    
    next();
  });
};




module.exports = { authenticateToken, optionalAuthenticateToken };
