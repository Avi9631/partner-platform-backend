/**
 * Temporal Workflow Usage Examples
 * 
 * This file demonstrates how to integrate Temporal workflows
 * into your Partner Platform application.
 */

const { startWorkflow, executeWorkflow, getWorkflowHandle } = require('../utils/temporalClient');
const logger = require('../config/winston.config');

/**
 * Example 1: Payment Processing Integration
 * Use this in your order/payment controller
 */
async function handlePaymentOrder(req, res) {
    try {
        const { orderId, amount, currency, paymentMethod } = req.body;
        const userId = req.user.email; // From auth middleware
        
        // Start payment workflow
        const { workflowId } = await startWorkflow(
            'processPaymentWorkflow',
            {
                orderId,
                userId,
                amount,
                currency,
                paymentMethod,
            },
            `payment-${orderId}` // Unique workflow ID prevents duplicates
        );
        
        logger.info(`Payment workflow started for order ${orderId}: ${workflowId}`);
        
        // Return immediately, payment will be processed asynchronously
        res.json({
            success: true,
            orderId,
            workflowId,
            status: 'processing',
            message: 'Payment is being processed',
        });
        
    } catch (error) {
        logger.error('Failed to start payment workflow:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Example 2: User Registration with Onboarding
 * Use this in your user registration endpoint
 */
async function registerNewUser(req, res) {
    try {
        const { email, name, password } = req.body;
        
        // 1. Create user in database
        // const user = await db.User.create({ email, name, password: hashedPassword });
        const userId = 'user_' + Date.now(); // Replace with actual user creation
        
        // 2. Start onboarding workflow (fire and forget)
        await startWorkflow(
            'userOnboardingWorkflow',
            {
                userId,
                email,
                name,
            },
            `onboarding-${userId}`
        );
        
        logger.info(`Onboarding workflow started for user ${email}`);
        
        res.json({
            success: true,
            userId,
            message: 'Account created successfully',
        });
        
    } catch (error) {
        logger.error('User registration failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Example 3: Listing Approval Process
 * Use this in your listing creation endpoint
 */
async function createPropertyListing(req, res) {
    try {
        const { title, description, price, location, images } = req.body;
        const userId = req.user.email;
        
        // 1. Save listing to database as draft
        // const listing = await db.Listing.create({ ...req.body, status: 'draft' });
        const listingId = 'LST_' + Date.now(); // Replace with actual listing creation
        
        // 2. Start approval workflow
        const { workflowId, handle } = await startWorkflow(
            'listingApprovalWorkflow',
            {
                listingId,
                userId,
                propertyData: {
                    title,
                    description,
                    price,
                    location,
                    images,
                },
            },
            `listing-approval-${listingId}`
        );
        
        logger.info(`Listing approval workflow started: ${workflowId}`);
        
        res.json({
            success: true,
            listingId,
            workflowId,
            status: 'pending_review',
            message: 'Listing submitted for review',
        });
        
    } catch (error) {
        logger.error('Listing creation failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Example 4: Manual Listing Approval by Admin
 * Use this in your admin approval endpoint
 */
async function approveListing(req, res) {
    try {
        const { listingId } = req.params;
        const { comment } = req.body;
        
        // Get the workflow handle
        const workflowId = `listing-approval-${listingId}`;
        const handle = await getWorkflowHandle(workflowId);
        
        // Send approval signal
        await handle.signal('approve', comment || 'Approved by admin');
        
        logger.info(`Listing ${listingId} approved`);
        
        res.json({
            success: true,
            listingId,
            message: 'Listing approved successfully',
        });
        
    } catch (error) {
        logger.error('Listing approval failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
}

/**
 * Example 5: Schedule Daily Reports
 * Use this in your scheduler or cron job
 */
async function scheduleDailyReport() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        await startWorkflow(
            'dailyReportWorkflow',
            {
                reportType: 'sales',
                recipients: ['admin@partner-platform.com', 'manager@partner-platform.com'],
                scheduleTime: new Date().toISOString(),
            },
            `daily-report-${today}`
        );
        
        logger.info(`Daily report workflow scheduled for ${today}`);
        
    } catch (error) {
        logger.error('Failed to schedule daily report:', error);
    }
}

/**
 * Example 6: Schedule Data Cleanup (Weekly)
 * Use this in your scheduler or cron job
 */
async function scheduleWeeklyCleanup() {
    try {
        const timestamp = Date.now();
        
        // Cleanup old logs
        await startWorkflow(
            'dataCleanupWorkflow',
            {
                cleanupType: 'logs',
                retentionDays: 90,
            },
            `cleanup-logs-${timestamp}`
        );
        
        // Cleanup expired sessions
        await startWorkflow(
            'dataCleanupWorkflow',
            {
                cleanupType: 'sessions',
                retentionDays: 30,
            },
            `cleanup-sessions-${timestamp}`
        );
        
        logger.info('Weekly cleanup workflows scheduled');
        
    } catch (error) {
        logger.error('Failed to schedule cleanup:', error);
    }
}

/**
 * Example 7: Set Payment Due Reminder
 * Use this when subscription is nearing payment date
 */
async function schedulePaymentReminder(subscription) {
    try {
        const reminderDate = new Date(subscription.nextPaymentDate);
        reminderDate.setDate(reminderDate.getDate() - 3); // 3 days before
        
        await startWorkflow(
            'reminderWorkflow',
            {
                userId: subscription.userId,
                reminderType: 'payment_due',
                message: `Your subscription payment of $${subscription.amount} is due in 3 days`,
                scheduledTime: reminderDate.toISOString(),
                metadata: {
                    subscriptionId: subscription.id,
                    amount: subscription.amount,
                },
            },
            `reminder-payment-${subscription.id}-${reminderDate.getTime()}`
        );
        
        logger.info(`Payment reminder scheduled for subscription ${subscription.id}`);
        
    } catch (error) {
        logger.error('Failed to schedule payment reminder:', error);
    }
}

/**
 * Example 8: Check Workflow Status
 * Use this to check payment or approval status
 */
async function checkWorkflowStatus(workflowId) {
    try {
        const handle = await getWorkflowHandle(workflowId);
        const description = await handle.describe();
        
        return {
            workflowId: description.workflowId,
            status: description.status.name,
            startTime: description.startTime,
            closeTime: description.closeTime,
            execution: {
                runId: description.runId,
                type: description.type,
            },
        };
        
    } catch (error) {
        logger.error(`Failed to get workflow status for ${workflowId}:`, error);
        throw error;
    }
}

/**
 * Example 9: Wait for Workflow Result
 * Use this when you need immediate result (e.g., critical operations)
 */
async function processPaymentAndWait(orderData) {
    try {
        // Execute workflow and wait for completion
        const result = await executeWorkflow(
            'processPaymentWorkflow',
            orderData,
            `payment-${orderData.orderId}`
        );
        
        if (result.success) {
            logger.info(`Payment successful: ${result.transactionId}`);
            return {
                success: true,
                transactionId: result.transactionId,
                message: 'Payment processed successfully',
            };
        } else {
            logger.error('Payment failed:', result);
            return {
                success: false,
                error: 'Payment processing failed',
            };
        }
        
    } catch (error) {
        logger.error('Payment workflow execution failed:', error);
        throw error;
    }
}

/**
 * Example 10: Subscription Billing (Recurring)
 * Call this from a cron job daily to process due subscriptions
 */
async function processDueSubscriptions() {
    try {
        // Get all subscriptions due today
        // const dueSubscriptions = await db.Subscription.findAll({
        //     where: {
        //         nextPaymentDate: { [Op.lte]: new Date() },
        //         status: 'active'
        //     }
        // });
        
        // Mock data for example
        const dueSubscriptions = [
            { id: 'SUB1', userId: 'user1@example.com', amount: 29.99, currency: 'USD', billingPeriod: 'monthly' },
            { id: 'SUB2', userId: 'user2@example.com', amount: 99.99, currency: 'USD', billingPeriod: 'yearly' },
        ];
        
        logger.info(`Processing ${dueSubscriptions.length} due subscriptions`);
        
        for (const subscription of dueSubscriptions) {
            await startWorkflow(
                'subscriptionPaymentWorkflow',
                {
                    subscriptionId: subscription.id,
                    userId: subscription.userId,
                    amount: subscription.amount,
                    currency: subscription.currency,
                    billingPeriod: subscription.billingPeriod,
                },
                `subscription-payment-${subscription.id}-${Date.now()}`
            );
        }
        
        logger.info('Subscription payment workflows started');
        
    } catch (error) {
        logger.error('Failed to process due subscriptions:', error);
    }
}

/**
 * Example 11: Bulk Listing Expiration Check
 * Run this daily to handle expiring listings
 */
async function checkExpiringListings() {
    try {
        // Get listings expiring in the next 8 days
        // const expiringListings = await db.Listing.findAll({
        //     where: {
        //         expirationDate: {
        //             [Op.between]: [new Date(), addDays(new Date(), 8)]
        //         },
        //         status: 'active'
        //     }
        // });
        
        // Mock data
        const expiringListings = [
            { id: 'LST1', userId: 'agent1@example.com', expirationDate: '2025-11-15T00:00:00Z' },
        ];
        
        for (const listing of expiringListings) {
            // Check if expiration workflow already exists
            const workflowId = `listing-expiration-${listing.id}`;
            
            try {
                await getWorkflowHandle(workflowId);
                // Workflow already exists, skip
                logger.info(`Expiration workflow already exists for listing ${listing.id}`);
            } catch (error) {
                // Workflow doesn't exist, create it
                await startWorkflow(
                    'listingExpirationWorkflow',
                    {
                        listingId: listing.id,
                        userId: listing.userId,
                        expirationDate: listing.expirationDate,
                    },
                    workflowId
                );
                
                logger.info(`Expiration workflow started for listing ${listing.id}`);
            }
        }
        
    } catch (error) {
        logger.error('Failed to check expiring listings:', error);
    }
}

// Export examples
module.exports = {
    handlePaymentOrder,
    registerNewUser,
    createPropertyListing,
    approveListing,
    scheduleDailyReport,
    scheduleWeeklyCleanup,
    schedulePaymentReminder,
    checkWorkflowStatus,
    processPaymentAndWait,
    processDueSubscriptions,
    checkExpiringListings,
};

/**
 * CRON JOB SETUP EXAMPLE
 * 
 * If using node-cron:
 * 
 * const cron = require('node-cron');
 * 
 * // Daily report at 8 AM
 * cron.schedule('0 8 * * *', scheduleDailyReport);
 * 
 * // Weekly cleanup on Sundays at 2 AM
 * cron.schedule('0 2 * * 0', scheduleWeeklyCleanup);
 * 
 * // Check due subscriptions every hour
 * cron.schedule('0 * * * *', processDueSubscriptions);
 * 
 * // Check expiring listings daily at midnight
 * cron.schedule('0 0 * * *', checkExpiringListings);
 */
