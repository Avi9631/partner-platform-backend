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
    console.error("Token missing from Authorization header");
    return res.status(401).json({ error: "Authorization token missing" }); // Unauthorized
  }

  jwt.verify(token, accessTokenSecret, (err, user) => {
    if (err) {
      console.error("Token verification error:", err.message);
      return res.status(403).json({ error: "Invalid or expired token" }); // Forbidden
    }

    if (!_.get(user, "userId") || !_.get(user, "userEmail")) {
      console.error("Invalid token structure or missing user details");
      return res.status(403).json({ error: "Invalid token structure" });
    }

    req.user = user; // Attach user information to the request
    console.log("Authenticated user:", user); // Optional logging for debugging
    next();
  });
};




module.exports = authenticateToken;
