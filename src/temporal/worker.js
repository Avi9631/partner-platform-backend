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
 * Sleep helper for retry delays
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Start Temporal Worker
 * 
 * Initializes and starts the Temporal worker with proper configuration.
 * The worker will process tasks from the configured task queue.
 * Includes retry logic for connection failures.
 * 
 * @returns {Promise<void>}
 */
async function startWorker() {
    const MAX_RETRY_ATTEMPTS = 5;
    const RETRY_DELAY_MS = 3000;
    
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
        try {
            logger.info('='.repeat(60));
            logger.info(`Starting Temporal Worker (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})...`);
            logger.info('='.repeat(60));
            
            // Create connection to Temporal Server with timeout
            logger.info(`Connecting to Temporal Server at ${temporalConfig.address}...`);
            const connection = await NativeConnection.connect({
                address: temporalConfig.address,
                connectTimeout: 10000, // 10 second timeout
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
        
        // If we reach here, worker stopped normally
        return;
        
    } catch (error) {
        logger.error(`Failed to start Temporal Worker (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}):`, error.message);
        
        // Check if this is a connection error
        const isConnectionError = error.message.includes('ECONNREFUSED') || 
                                   error.message.includes('ENOTFOUND') ||
                                   error.message.includes('ETIMEDOUT') ||
                                   error.code === 'ECONNREFUSED';
        
        // Retry on connection errors, but not on configuration errors
        if (isConnectionError && attempt < MAX_RETRY_ATTEMPTS) {
            const delayMs = RETRY_DELAY_MS * attempt; // Exponential backoff
            console.error(`\n✗ Connection failed (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`);
            console.error(`  ${error.message}`);
            console.error(`  Retrying in ${delayMs / 1000} seconds...\n`);
            await sleep(delayMs);
            continue; // Retry the loop
        }
        
        // Final failure - log and exit
        logger.error('Failed to start Temporal Worker:', error);
        console.error('\n✗ Failed to start Temporal Worker:');
        console.error(`  ${error.message}\n`);
        
        // Provide helpful error messages
        if (isConnectionError) {
            console.error('  Temporal Server is not running or not accessible. Please:');
            console.error('  1. Start Temporal Server: temporal server start-dev');
            console.error('  2. Check if port 7233 is available');
            console.error('  3. Verify TEMPORAL_ADDRESS in your environment\n');
        }
        
        process.exit(1);
    }
  }
  
  // If all retries exhausted without success
  logger.error('Failed to start Temporal Worker after all retry attempts');
  console.error('\n✗ Could not connect to Temporal Server after multiple attempts');
  console.error('  Please ensure Temporal is running on port 7233\n');
  process.exit(1);
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
