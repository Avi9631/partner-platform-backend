require('dotenv').config();

/**
 * Temporal Configuration
 * Configure connection settings for Temporal Server
 */

module.exports = {
    // Temporal Server address
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    
    // Namespace to use (default is 'default')
    namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    
    // Task queue name for workers
    taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'partner-platform-queue',
    
    // Connection retry settings
    retry: {
        maxAttempts: parseInt(process.env.TEMPORAL_RETRY_MAX_ATTEMPTS) || 3,
        initialDelayMs: parseInt(process.env.TEMPORAL_RETRY_INITIAL_DELAY) || 2000,
    },
    
    // Connection timeout in milliseconds
    connectionTimeout: parseInt(process.env.TEMPORAL_CONNECTION_TIMEOUT) || 10000,
    
    // Worker options
    worker: {
        maxConcurrentActivityTaskExecutions: parseInt(process.env.TEMPORAL_MAX_CONCURRENT_ACTIVITIES) || 100,
        maxConcurrentWorkflowTaskExecutions: parseInt(process.env.TEMPORAL_MAX_CONCURRENT_WORKFLOWS) || 100,
    },
    
    // Client options
    client: {
        // Connection options
        connection: {
            address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
            // Add TLS support for production
            tls: process.env.TEMPORAL_TLS === 'true',
        },
        namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    }
};
