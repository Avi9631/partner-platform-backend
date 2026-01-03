require("dotenv").config();

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");


const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const path = require("path");
const authRoute = require("./src/routes/auth.route.js");
const draftRoute = require("./src/routes/draft.route.js");
const userRoute = require("./src/routes/user.route.js");
const developerRoute = require("./src/routes/developer.route.js");
const developerConsumerApiRoute = require("./src/routes/developer-consumer-api.route.js");
const pgHostelRoute = require("./src/routes/pgHostel.route.js");
const propertyRoute = require("./src/routes/property.route.js");
const projectRoute = require("./src/routes/project.route.js");
 const uploadRoute = require("./src/routes/upload.route.js");
const otpAuthRoute = require("./src/routes/otpAuth.route.js");
const walletRoute = require("./src/routes/wallet.route.js");
const logger = require("./src/config/winston.config.js");
const app = express();
const port = process.env.PORT || 3000;
const db = require("./src/entity");
const bodyParser = require("body-parser");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
require("./google_oauth.js");
require("./microsoft_oauth.js");

const swaggerOptions = {
  definition: {
    openapi: "3.1.0",
    info: {
      title: "FeedAQ Academy",
      version: "0.1.0",
      description: "This is made with Express and documented with Swagger",
      license: {
        name: "MIT",
        url: "https://spdx.org/licenses/MIT.html",
      },
      contact: {
        name: "FeedAQ",
        url: "https://gcs.feedaq.com",
        email: "info@email.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: [
    "./src/routes/common.route.js",
    "./server.js",
    "./src/controller/*.js",
    "./src/model/*.js",
    "./src/routes/fileUpload.route.js",
  ],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(specs, { explorer: true })
);

app.use(
  cors({
    origin: process.env.ACCESS_CONTROL_ALLOW_ORIGIN.split(',').map(origin => origin.trim()), // Update this to your frontend URL
    credentials: true, // Allow credentials (cookies, authorization headers)
  })
);
app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// Serve static files for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'src/uploads')));

// For production: Sync database with alter (safe for existing data)
(async () => {
  try {
    // Test database connection first
    await db.sequelize.authenticate();
    logger.info("Database connection established successfully");
    logger.info("Database connection established successfully");

    // Use alter: true for production - this won't drop existing data
    // Now that tables are created, use safer sync method
    await db.sequelize.sync({ alter: true });
    
    logger.info("Database synchronized successfully - all tables verified");
    logger.info("Database synchronized successfully - all tables verified");

    // Initialize email worker
    logger.info("Starting email worker...");
    logger.info("Starting email worker...");
    // Worker auto-starts, just logging here
  } catch (error) {
    console.error("Error during database sync:", error);
    logger.error("Error during database sync:", error);
    console.error(
      "Please check your database configuration and ensure the database is running"
    );
    // Don't exit the process, let the server continue running
  }
})();

app.use(authRoute);
app.use(draftRoute);
app.use(userRoute);
 app.use("/api/developer", developerRoute);
app.use("/api/developer-consumer-api", developerConsumerApiRoute);
app.use("/api/pg-hostel", pgHostelRoute);
app.use("/api/property", propertyRoute);
app.use("/api/project", projectRoute);
 app.use("/api/upload", uploadRoute);
app.use("/api/otp", otpAuthRoute);
app.use("/api/wallet", walletRoute);

const server = app.listen(port, "0.0.0.0", () => {
  logger.info(`Example app listening on port ${port}`);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: starting graceful shutdown`);
  logger.info(`${signal} signal received: starting graceful shutdown`);

  try {
    // 1. Stop accepting new connections
    server.close(() => {
      logger.info("HTTP server closed");
      logger.info("HTTP server closed");
    });

    

    // 3. Stop BullMQ worker (stops processing new jobs but completes current ones)
    logger.info("Stopping email worker...");
    await emailWorker.stopEmailWorker();
    logger.info("Email worker stopped");
    logger.info("Email worker stopped");

    // 4. Close BullMQ queue
    logger.info("Closing email queue...");
    const { closeQueue } = require("./src/queues/emailQueue");
    await closeQueue();
    logger.info("Email queue closed");
    logger.info("Email queue closed");

    // 5. Close Redis connection
    logger.info("Closing Redis connection...");
    const { closeRedisConnection } = require("./src/config/redis.config");
    await closeRedisConnection();
    logger.info("Redis connection closed");
    logger.info("Redis connection closed");

    // 6. Close database connections
    logger.info("Closing database connections...");
    await db.sequelize.close();
    logger.info("Database connections closed");
    logger.info("Database connections closed");

    logger.info("Graceful shutdown completed successfully");
    logger.info("Graceful shutdown completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    logger.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
};

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  logger.error("Uncaught Exception:", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  logger.error("Unhandled Rejection:", reason);
  gracefulShutdown("UNHANDLED_REJECTION");
});
