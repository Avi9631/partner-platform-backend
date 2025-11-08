const { proxyActivities, sleep } = require('@temporalio/workflow');

// Proxy activities with different timeouts
const activities = proxyActivities({
    startToCloseTimeout: '2 minutes',
    retry: {
        initialInterval: '1s',
        maximumInterval: '10s',
        maximumAttempts: 3,
    },
});

/**
 * Payment Processing Workflow
 * Handles payment processing with retries and compensation
 */
async function processPaymentWorkflow(paymentData) {
    const { orderId, userId, amount, currency, paymentMethod } = paymentData;
    
    console.log(`Starting payment workflow for order ${orderId}`);
    
    try {
        // Step 1: Validate payment details
        const validationResult = await activities.validatePayment({
            userId,
            amount,
            currency,
            paymentMethod,
        });
        
        if (!validationResult.valid) {
            throw new Error(`Payment validation failed: ${validationResult.reason}`);
        }
        
        // Step 2: Reserve inventory
        const inventoryReserved = await activities.reserveInventory({
            orderId,
            userId,
        });
        
        if (!inventoryReserved.success) {
            throw new Error('Failed to reserve inventory');
        }
        
        // Step 3: Process payment with payment gateway
        const paymentResult = await activities.processPaymentGateway({
            orderId,
            amount,
            currency,
            paymentMethod,
            userId,
        });
        
        if (!paymentResult.success) {
            // Compensate: Release inventory
            await activities.releaseInventory({ orderId });
            throw new Error(`Payment processing failed: ${paymentResult.error}`);
        }
        
        // Step 4: Update order status
        await activities.updateOrderStatus({
            orderId,
            status: 'paid',
            transactionId: paymentResult.transactionId,
        });
        
        // Step 5: Send confirmation email
        await activities.sendEmail({
            to: userId,
            subject: 'Payment Successful',
            body: `Your payment of ${amount} ${currency} has been processed successfully.`,
        });
        
        // Step 6: Trigger fulfillment
        await activities.triggerFulfillment({ orderId });
        
        return {
            success: true,
            orderId,
            transactionId: paymentResult.transactionId,
            amount,
            currency,
            message: 'Payment processed successfully',
        };
        
    } catch (error) {
        console.error(`Payment workflow failed for order ${orderId}:`, error);
        
        // Send failure notification
        await activities.sendEmail({
            to: userId,
            subject: 'Payment Failed',
            body: `Your payment could not be processed. Reason: ${error.message}`,
        });
        
        // Update order status to failed
        await activities.updateOrderStatus({
            orderId,
            status: 'payment_failed',
            errorMessage: error.message,
        });
        
        throw error;
    }
}

/**
 * Subscription Payment Workflow
 * Handles recurring subscription payments
 */
async function subscriptionPaymentWorkflow(subscriptionData) {
    const { subscriptionId, userId, amount, currency, billingPeriod } = subscriptionData;
    
    console.log(`Processing subscription payment for ${subscriptionId}`);
    
    try {
        // Check subscription status
        const subscription = await activities.getSubscriptionDetails({ subscriptionId });
        
        if (!subscription.active) {
            return { success: false, reason: 'Subscription is not active' };
        }
        
        // Process payment
        const paymentResult = await activities.processPaymentGateway({
            orderId: `sub-${subscriptionId}-${Date.now()}`,
            amount,
            currency,
            paymentMethod: subscription.paymentMethod,
            userId,
        });
        
        if (paymentResult.success) {
            // Update subscription
            await activities.updateSubscription({
                subscriptionId,
                lastPaymentDate: new Date().toISOString(),
                nextPaymentDate: calculateNextPaymentDate(billingPeriod),
                status: 'active',
            });
            
            // Send receipt
            await activities.sendEmail({
                to: userId,
                subject: 'Subscription Payment Receipt',
                body: `Your subscription payment of ${amount} ${currency} has been processed.`,
            });
            
            return {
                success: true,
                subscriptionId,
                transactionId: paymentResult.transactionId,
            };
        } else {
            // Payment failed - handle retry logic
            const retryCount = subscription.failedPaymentCount || 0;
            
            if (retryCount >= 3) {
                // Suspend subscription after 3 failed attempts
                await activities.updateSubscription({
                    subscriptionId,
                    status: 'suspended',
                    failedPaymentCount: retryCount + 1,
                });
                
                await activities.sendEmail({
                    to: userId,
                    subject: 'Subscription Suspended',
                    body: 'Your subscription has been suspended due to payment failures.',
                });
            } else {
                // Schedule retry
                await activities.updateSubscription({
                    subscriptionId,
                    failedPaymentCount: retryCount + 1,
                });
            }
            
            return {
                success: false,
                reason: paymentResult.error,
                retryCount: retryCount + 1,
            };
        }
        
    } catch (error) {
        console.error(`Subscription payment workflow failed:`, error);
        throw error;
    }
}

function calculateNextPaymentDate(billingPeriod) {
    const now = new Date();
    switch (billingPeriod) {
        case 'monthly':
            now.setMonth(now.getMonth() + 1);
            break;
        case 'yearly':
            now.setFullYear(now.getFullYear() + 1);
            break;
        case 'weekly':
            now.setDate(now.getDate() + 7);
            break;
        default:
            now.setMonth(now.getMonth() + 1);
    }
    return now.toISOString();
}

module.exports = {
    processPaymentWorkflow,
    subscriptionPaymentWorkflow,
};
