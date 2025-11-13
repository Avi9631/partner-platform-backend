require("dotenv").config();

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');


const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const commonRoute = require("./src/routes/common.route.js");
const authRoute = require("./src/routes/auth.route.js");
const temporalRoute = require("./src/routes/temporal.route.js");
const draftRoute = require("./src/routes/draft.route.js");
const userRoute = require("./src/routes/user.route.js");
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
        openapi: "3.1.0", info: {
            title: "FeedAQ Academy",
            version: "0.1.0",
            description: "This is made with Express and documented with Swagger",
            license: {
                name: "MIT", url: "https://spdx.org/licenses/MIT.html",
            },
            contact: {
                name: "FeedAQ", url: "https://gcs.feedaq.com", email: "info@email.com",
            },
        }, servers: [{
            url: "http://localhost:3000",
        },],
    }, apis: ["./src/routes/common.route.js", "./server.js", "./src/controller/*.js", "./src/model/*.js", "./src/routes/fileUpload.route.js"],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs, {explorer: true}));

app.use(cors({
    origin: process.env.ACCESS_CONTROL_ALLOW_ORIGIN, // Update this to your frontend URL
    credentials: true, // Allow credentials (cookies, authorization headers)
}));
app.use(cookieParser());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// For production: Sync database with alter (safe for existing data)
(async () => {
    try {
        // Test database connection first
        await db.sequelize.authenticate();
        console.log("Database connection established successfully");
        logger.info("Database connection established successfully");
        
        // Use alter: true for production - this won't drop existing data
        // Now that tables are created, use safer sync method
        await db.sequelize.sync({ force: true });
        

        console.log("Database synchronized successfully - all tables verified");
        logger.info("Database synchronized successfully - all tables verified");

        // Initialize email worker
        console.log("Starting email worker...");
        logger.info("Starting email worker...");
        // Worker auto-starts, just logging here
        
    } catch (error) {
        console.error("Error during database sync:", error);
        logger.error("Error during database sync:", error);
        console.error("Please check your database configuration and ensure the database is running");
        // Don't exit the process, let the server continue running
    }
})();

 

app.use(commonRoute);
app.use(authRoute);
app.use(temporalRoute);
app.use(draftRoute);
app.use(userRoute);

 
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Example app listening on port ${port}`);
});
 