const { Client, Connection } = require('@temporalio/client');
const logger = require('../config/winston.config');
const temporalConfig = require('../config/temporal.config');
const { executeWorkflowDirect } = require('../temporal/workflowExecutor');

let temporalClient = null;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Check if Temporal is enabled
 * @returns {boolean}
 */
function isTemporalEnabled() {
    return process.env.TEMPORAL_ENABLED === 'true';
}

/**
 * Sleep helper for retry delays
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Initialize Temporal Client
 * Creates and returns a singleton Temporal client instance with retry logic
 */
async function getTemporalClient() {
    // Check if Temporal is enabled
    if (!isTemporalEnabled()) {
        const error = new Error('Temporal is disabled. Set TEMPORAL_ENABLED=true in environment variables to use Temporal workflows.');
        error.code = 'TEMPORAL_DISABLED';
        throw error;
    }
    
    // Return existing client if available and healthy
    if (temporalClient) {
        try {
            // Test connection health by checking service
            await temporalClient.connection.workflowService.getSystemInfo({});
            return temporalClient;
        } catch (error) {
            logger.warn('Existing Temporal connection is unhealthy, reconnecting...', error.message);
            temporalClient = null; // Reset client to force reconnection
        }
    }
    
    // Retry connection with exponential backoff
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
        try {
            logger.info(`Initializing Temporal Client (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})...`);
            
            // Create connection with improved settings
            const connection = await Connection.connect({
                address: temporalConfig.address,
                connectTimeout: 10000, // 10 second timeout (increased from 5s)
                // Add connection options for better reliability
                apiKey: process.env.TEMPORAL_API_KEY, // Optional: for Temporal Cloud
                tls: process.env.TEMPORAL_TLS === 'true' ? {
                    // TLS configuration for secure connections
                    serverNameOverride: process.env.TEMPORAL_SERVER_NAME,
                    serverRootCACertificate: process.env.TEMPORAL_TLS_CERT ? 
                        Buffer.from(process.env.TEMPORAL_TLS_CERT, 'base64') : undefined,
                } : undefined,
            });
            
            temporalClient = new Client({
                connection,
                namespace: temporalConfig.namespace,
            });
            
            // Test the connection
            await temporalClient.connection.workflowService.getSystemInfo({});
            
            connectionAttempts = 0; // Reset on success
            logger.info(`✓ Temporal Client initialized successfully for namespace: ${temporalConfig.namespace}`);
            return temporalClient;
            
        } catch (error) {
            lastError = error;
            connectionAttempts = attempt;
            
            logger.error(`Failed to initialize Temporal Client (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}):`, error.message);
            
            // Don't retry on the last attempt
            if (attempt < MAX_RETRY_ATTEMPTS) {
                const delayMs = RETRY_DELAY_MS * attempt; // Exponential backoff
                logger.info(`Retrying in ${delayMs}ms...`);
                await sleep(delayMs);
            }
        }
    }
    
    // All retry attempts failed
    logger.error('Failed to initialize Temporal Client after all retry attempts');
    const enhancedError = new Error(
        `Cannot connect to Temporal server at ${temporalConfig.address} after ${MAX_RETRY_ATTEMPTS} attempts. ` +
        `Ensure Temporal server is running on port 7233 or set TEMPORAL_ENABLED=false to use fallback mode. ` +
        `Last error: ${lastError.message}`
    );
    enhancedError.code = 'TEMPORAL_CONNECTION_FAILED';
    enhancedError.originalError = lastError;
    throw enhancedError;
}

/**
 * Start a workflow execution
 * Automatically falls back to direct execution if Temporal is disabled
 * 
 * @param {string} workflowName - The name of the workflow to execute
 * @param {object} args - Arguments to pass to the workflow
 * @param {string} workflowId - Optional workflow ID (auto-generated if not provided)
 * @returns {Promise<object>} - Workflow handle or execution result
 */
async function startWorkflow(workflowName, args, workflowId = null) {
    // Check if Temporal is enabled
    if (!isTemporalEnabled()) {
        logger.info(`Temporal disabled, executing workflow directly: ${workflowName}`);
        
        try {
            const result = await executeWorkflowDirect(workflowName, args);
            return {
                workflowId: result.workflowId,
                result: result.result,
                mode: 'direct',
            };
        } catch (error) {
            logger.error(`Direct workflow execution failed for ${workflowName}:`, error);
            throw error;
        }
    }

    // Temporal is enabled - use normal workflow execution
    try {
        const client = await getTemporalClient();
        
        const handle = await client.workflow.start(workflowName, {
            taskQueue: temporalConfig.taskQueue,
            args: [args],
            workflowId: workflowId || `${workflowName}-${Date.now()}`,
        });
        
        logger.info(`Workflow started: ${workflowName} (ID: ${handle.workflowId})`);
        
        return {
            workflowId: handle.workflowId,
            runId: handle.firstExecutionRunId,
            handle,
            mode: 'temporal',
        };
        
    } catch (error) {
        // If Temporal connection fails, fall back to direct execution
        if (error.code === 'TEMPORAL_DISABLED' || error.code === 'TEMPORAL_CONNECTION_FAILED') {
            logger.warn(`Temporal connection failed, falling back to direct execution for ${workflowName}`);
            
            try {
                const result = await executeWorkflowDirect(workflowName, args);
                return {
                    workflowId: result.workflowId,
                    result: result.result,
                    mode: 'direct-fallback',
                };
            } catch (fallbackError) {
                logger.error(`Fallback execution also failed for ${workflowName}:`, fallbackError);
                throw fallbackError;
            }
        }
        
        logger.error(`Failed to start workflow ${workflowName}:`, error);
        throw error;
    }
}

/**
 * Execute a workflow and wait for result
 * Automatically falls back to direct execution if Temporal is disabled
 * 
 * @param {string} workflowName - The name of the workflow to execute
 * @param {object} args - Arguments to pass to the workflow
 * @param {string} workflowId - Optional workflow ID
 * @returns {Promise<any>} - Workflow result
 */
async function executeWorkflow(workflowName, args, workflowId = null) {
    // Check if Temporal is enabled
    if (!isTemporalEnabled()) {
        logger.info(`Temporal disabled, executing workflow directly: ${workflowName}`);
        
        try {
            const executionResult = await executeWorkflowDirect(workflowName, args);
            return executionResult.result;
        } catch (error) {
            logger.error(`Direct workflow execution failed for ${workflowName}:`, error);
            throw error;
        }
    }

    // Temporal is enabled - use normal workflow execution
    try {
        const client = await getTemporalClient();
        
        const handle = await client.workflow.start(workflowName, {
            taskQueue: temporalConfig.taskQueue,
            args: [args],
            workflowId: workflowId || `${workflowName}-${Date.now()}`,
        });
        
        logger.info(`Executing workflow: ${workflowName} (ID: ${handle.workflowId})`);
        
        const result = await handle.result();
        
        logger.info(`Workflow completed: ${workflowName} (ID: ${handle.workflowId})`);
        
        return result;
        
    } catch (error) {
        // If Temporal connection fails, fall back to direct execution
        if (error.code === 'TEMPORAL_DISABLED' || error.code === 'TEMPORAL_CONNECTION_FAILED') {
            logger.warn(`Temporal connection failed, falling back to direct execution for ${workflowName}`);
            
            try {
                const executionResult = await executeWorkflowDirect(workflowName, args);
                return executionResult.result;
            } catch (fallbackError) {
                logger.error(`Fallback execution also failed for ${workflowName}:`, fallbackError);
                throw fallbackError;
            }
        }
        
        logger.error(`Failed to execute workflow ${workflowName}:`, error);
        throw error;
    }
}

/**
 * Get workflow handle by ID
 * @param {string} workflowId - The workflow ID
 * @returns {Promise<object>} - Workflow handle
 */
async function getWorkflowHandle(workflowId) {
    try {
        const client = await getTemporalClient();
        const handle = client.workflow.getHandle(workflowId);
        return handle;
    } catch (error) {
        logger.error(`Failed to get workflow handle for ${workflowId}:`, error);
        throw error;
    }
}

/**
 * Cancel a workflow
 * @param {string} workflowId - The workflow ID to cancel
 */
async function cancelWorkflow(workflowId) {
    try {
        const handle = await getWorkflowHandle(workflowId);
        await handle.cancel();
        logger.info(`Workflow cancelled: ${workflowId}`);
    } catch (error) {
        logger.error(`Failed to cancel workflow ${workflowId}:`, error);
        throw error;
    }
}

/**
 * Check Temporal server health
 * @returns {Promise<boolean>} - True if healthy, false otherwise
 */
async function checkTemporalHealth() {
    try {
        if (!isTemporalEnabled()) {
            return false;
        }
        
        const client = await getTemporalClient();
        await client.connection.workflowService.getSystemInfo({});
        return true;
    } catch (error) {
        logger.warn('Temporal health check failed:', error.message);
        return false;
    }
}

/**
 * Reset the Temporal client connection
 * Useful when connection is stale or needs to be recreated
 */
function resetTemporalClient() {
    if (temporalClient) {
        logger.info('Resetting Temporal client connection');
        temporalClient = null;
    }
}

/**
 * Query a workflow
 * @param {string} workflowId - The workflow ID
 * @param {string} queryType - The query type
 * @param {any} args - Query arguments
 */
async function queryWorkflow(workflowId, queryType, ...args) {
    try {
        const handle = await getWorkflowHandle(workflowId);
        const result = await handle.query(queryType, ...args);
        return result;
    } catch (error) {
        logger.error(`Failed to query workflow ${workflowId}:`, error);
        throw error;
    }
}

/**
 * Signal a workflow
 * @param {string} workflowId - The workflow ID
 * @param {string} signalName - The signal name
 * @param {any} args - Signal arguments
 */
async function signalWorkflow(workflowId, signalName, ...args) {
    try {
        const handle = await getWorkflowHandle(workflowId);
        await handle.signal(signalName, ...args);
        logger.info(`Signal sent to workflow ${workflowId}: ${signalName}`);
    } catch (error) {
        logger.error(`Failed to signal workflow ${workflowId}:`, error);
        throw error;
    }
}

module.exports = {
    isTemporalEnabled,
    getTemporalClient,
    startWorkflow,
    executeWorkflow,
    getWorkflowHandle,
    cancelWorkflow,
    checkTemporalHealth,
    resetTemporalClient,
    queryWorkflow,
    signalWorkflow,
};
