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
        },
        namespace: process.env.TEMPORAL_NAMESPACE || 'default',
    }
};
