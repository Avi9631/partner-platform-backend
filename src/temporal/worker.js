require('dotenv').config();
const { Worker } = require('@temporalio/worker');
const { NativeConnection } = require('@temporalio/worker');
const path = require('path');
const logger = require('../config/winston.config');
const temporalConfig = require('../config/temporal.config');
const activities = require('./activities/registry');

/**
 * Temporal Worker
 * 
 * Processes workflows and activities from the task queue.
 * This worker is responsible for executing all temporal workflows
 * and activities defined in the workflows/ and activities/ directories.
 * 
 * @module temporal/worker
 */

/**
 * Start Temporal Worker
 * 
 * Initializes and starts the Temporal worker with proper configuration.
 * The worker will process tasks from the configured task queue.
 * 
 * @returns {Promise<void>}
 */
async function startWorker() {
    try {
        logger.info('='.repeat(60));
        logger.info('Starting Temporal Worker...');
        logger.info('='.repeat(60));
        
        // Create connection to Temporal Server
        logger.info(`Connecting to Temporal Server at ${temporalConfig.address}...`);
        const connection = await NativeConnection.connect({
            address: temporalConfig.address,
        });
        
        logger.info(`✓ Connected to Temporal Server`);
        logger.info(`  Namespace: ${temporalConfig.namespace}`);
        logger.info(`  Task Queue: ${temporalConfig.taskQueue}`);
        
        // Create and start worker
        const worker = await Worker.create({
            connection,
            namespace: temporalConfig.namespace,
            taskQueue: temporalConfig.taskQueue,
            workflowsPath: path.resolve(__dirname, './workflows'),
            activities,
            maxConcurrentActivityTaskExecutions: temporalConfig.worker.maxConcurrentActivityTaskExecutions,
            maxConcurrentWorkflowTaskExecutions: temporalConfig.worker.maxConcurrentWorkflowTaskExecutions,
        });
        
        logger.info('='.repeat(60));
        logger.info('✓ Temporal Worker Started Successfully');
        logger.info(`  Max Concurrent Activities: ${temporalConfig.worker.maxConcurrentActivityTaskExecutions}`);
        logger.info(`  Max Concurrent Workflows: ${temporalConfig.worker.maxConcurrentWorkflowTaskExecutions}`);
        logger.info('='.repeat(60));
        
        console.log(`\n✓ Temporal Worker started successfully`);
        console.log(`  Task Queue: ${temporalConfig.taskQueue}`);
        console.log(`  Namespace: ${temporalConfig.namespace}`);
        console.log(`  Server: ${temporalConfig.address}\n`);
        
        // Graceful shutdown handler
        process.on('SIGINT', async () => {
            logger.info('Received SIGINT signal, shutting down gracefully...');
            console.log('\nShutting down gracefully...');
            await worker.shutdown();
            logger.info('Worker shut down successfully');
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            logger.info('Received SIGTERM signal, shutting down gracefully...');
            console.log('\nShutting down gracefully...');
            await worker.shutdown();
            logger.info('Worker shut down successfully');
            process.exit(0);
        });
        
        // Run the worker
        await worker.run();
        
    } catch (error) {
        logger.error('Failed to start Temporal Worker:', error);
        console.error('\n✗ Failed to start Temporal Worker:');
        console.error(`  ${error.message}\n`);
        
        // Provide helpful error messages
        if (error.message.includes('ECONNREFUSED')) {
            console.error('  Temporal Server is not running. Please start it with:');
            console.error('  temporal server start-dev\n');
        }
        
        process.exit(1);
    }
}

// Start worker if run directly
if (require.main === module) {
    startWorker().catch((err) => {
        logger.error('Fatal error in Temporal Worker:', err);
        console.error('\n✗ Fatal error:', err.message);
        process.exit(1);
    });
}

module.exports = { startWorker };
