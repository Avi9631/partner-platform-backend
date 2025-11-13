const { createClient } = require('redis');
const logger = require('./winston.config.js');

/**
 * Redis Cloud Configuration
 * Using Redis Cloud for queue management with BullMQ
 * Using official redis package (node-redis)
 */

let redisClient = null;

const getRedisConnection = async () => {
    if (redisClient && redisClient.isOpen) {
        return redisClient;
    }

    try {
        let clientOptions;
        
        if (process.env.REDIS_URL) {
            // Use Redis URL if provided (e.g., redis://username:password@host:port)
            logger.info('Connecting to Redis using REDIS_URL');
            clientOptions = {
                url: process.env.REDIS_URL,
                socket: {
                    connectTimeout: 10000,
                    reconnectStrategy: (retries) => {
                        if (retries > 3) {
                            logger.error('Failed to connect to Redis after 3 attempts');
                            return new Error('Max retries reached');
                        }
                        const delay = Math.min(retries * 50, 2000);
                        return delay;
                    }
                }
            };
        } else if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
            // Use individual parameters
            logger.info(`Connecting to Redis at ${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`);
            clientOptions = {
                socket: {
                    host: process.env.REDIS_HOST,
                    port: parseInt(process.env.REDIS_PORT) || 6379,
                    connectTimeout: 10000,
                    reconnectStrategy: (retries) => {
                        if (retries > 3) {
                            logger.error('Failed to connect to Redis after 3 attempts');
                            return new Error('Max retries reached');
                        }
                        const delay = Math.min(retries * 50, 2000);
                        return delay;
                    },
                    // TLS configuration for Redis Cloud
                    // Most Redis Cloud instances work WITHOUT explicit TLS in the redis package
                    // The package auto-detects TLS when using rediss:// or when the server requires it
                    tls: process.env.REDIS_TLS === 'true' ? {
                        rejectUnauthorized: false // Allow self-signed certificates
                    } : undefined
                },
                password: process.env.REDIS_PASSWORD
            };
        } else {
            // Fallback to local Redis for development
            logger.warn('No Redis credentials found. Using local Redis at localhost:6379');
            clientOptions = {
                socket: {
                    host: 'localhost',
                    port: 6379,
                    connectTimeout: 10000,
                    reconnectStrategy: (retries) => {
                        if (retries > 3) {
                            logger.error('Failed to connect to local Redis after 3 attempts');
                            return new Error('Max retries reached');
                        }
                        const delay = Math.min(retries * 50, 2000);
                        return delay;
                    }
                }
            };
        }

        redisClient = createClient(clientOptions);

        // Event listeners
        redisClient.on('connect', () => {
            logger.info('Redis client connected successfully');
        });

        redisClient.on('ready', () => {
            logger.info('Redis client is ready to receive commands');
        });

        redisClient.on('error', (err) => {
            logger.error('Redis client error:', err);
        });

        redisClient.on('end', () => {
            logger.warn('Redis connection closed');
        });

        redisClient.on('reconnecting', () => {
            logger.info('Redis client reconnecting...');
        });

        // Connect to Redis
        await redisClient.connect();

        return redisClient;
    } catch (error) {
        logger.error('Failed to create Redis connection:', error);
        throw error;
    }
};

const closeRedisConnection = async () => {
    if (redisClient && redisClient.isOpen) {
        try {
            await redisClient.quit();
            redisClient = null;
            logger.info('Redis connection closed gracefully');
        } catch (error) {
            logger.error('Error closing Redis connection:', error);
            throw error;
        }
    }
};

// Helper to get a duplicate connection for BullMQ (BullMQ manages its own connection)
const getRedisConfig = () => {
    if (process.env.REDIS_URL) {
        return {
            url: process.env.REDIS_URL
        };
    } else if (process.env.REDIS_HOST && process.env.REDIS_PASSWORD) {
        const config = {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD
        };
        
        // Only add TLS if explicitly enabled
        // BullMQ/ioredis (used internally) handles TLS differently than the redis package
        if (process.env.REDIS_TLS === 'true') {
            config.tls = {
                rejectUnauthorized: false // Allow self-signed certificates for Redis Cloud
            };
        }
        
        return config;
    } else {
        return {
            host: 'localhost',
            port: 6379
        };
    }
};

module.exports = {
    getRedisConnection,
    closeRedisConnection,
    getRedisConfig
};
