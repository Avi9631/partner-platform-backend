const actuator = require('express-actuator');
const { checkTemporalHealth, isTemporalEnabled } = require('../utils/temporalClient');
const logger = require('../config/winston.config');

/**
 * Health Check Configuration using express-actuator
 * Provides Spring Boot Actuator-like endpoints with custom health indicators
 */

// Custom health check function for Temporal
const temporalHealthIndicator = async () => {
    try {
        const enabled = isTemporalEnabled();
        
        if (!enabled) {
            return {
                status: 'UP',
                details: {
                    enabled: false,
                    message: 'Temporal is disabled'
                }
            };
        }
        
        const isHealthy = await checkTemporalHealth();
        
        if (isHealthy) {
            return {
                status: 'UP',
                details: {
                    enabled: true,
                    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
                    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
                    message: 'Temporal server is reachable'
                }
            };
        } else {
            return {
                status: 'DOWN',
                details: {
                    enabled: true,
                    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
                    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
                    message: 'Cannot connect to Temporal server',
                    error: 'Connection failed'
                }
            };
        }
    } catch (error) {
        logger.error('Temporal health check failed:', error);
        return {
            status: 'DOWN',
            details: {
                enabled: true,
                error: error.message,
                message: 'Health check failed'
            }
        };
    }
};

// Configure express-actuator with custom options
const actuatorOptions = {
    basePath: '/health', // Base path for actuator endpoints
    infoGitMode: 'simple', // Git info mode
    infoBuildOptions: {
        // Add build information
        name: process.env.npm_package_name || 'partner-platform-backend',
        version: process.env.npm_package_version || '1.0.0',
        description: process.env.npm_package_description || 'Partner Platform Backend API',
    },
    customEndpoints: [
        {
            id: 'temporal', // Creates /health/temporal endpoint
            controller: async (req, res) => {
                try {
                    const health = await temporalHealthIndicator();
                    const statusCode = health.status === 'UP' ? 200 : 503;
                    res.status(statusCode).json({
                        status: health.status,
                        service: 'temporal',
                        timestamp: new Date().toISOString(),
                        ...health.details
                    });
                } catch (error) {
                    res.status(503).json({
                        status: 'DOWN',
                        service: 'temporal',
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }
    ],
    // Add custom health indicators
    customHealthChecks: async () => {
        const health = {
            status: 'UP',
            components: {}
        };
        
        // Add Temporal health
        const temporalHealth = await temporalHealthIndicator();
        health.components.temporal = temporalHealth;
        
        // Overall health status is DOWN if any component is DOWN
        if (temporalHealth.status === 'DOWN') {
            health.status = 'DOWN';
        }
        
        return health;
    }
};

// Export the actuator middleware
module.exports = actuator(actuatorOptions);

