/**
 * Subscription Payment Workflow
 * 
 * Handles recurring subscription payments with retry logic and suspension handling.
 * 
 * @module temporal/workflows/payment/subscription.workflow
 */

const { proxyActivities } = require('@temporalio/workflow');
const { ACTIVITY_OPTIONS } = require('../../config/constants');

/** @typedef {import('../../types').SubscriptionData} SubscriptionData */
/** @typedef {import('../../types').WorkflowResult} WorkflowResult */

// Proxy payment activities
const {
    getSubscriptionDetails,
    processPaymentGateway,
    updateSubscription,
    sendEmail,
} = proxyActivities(ACTIVITY_OPTIONS.payment);

/**
 * Calculate next payment date based on billing period
 * 
 * @param {string} billingPeriod - Billing frequency
 * @returns {string} - ISO date string for next payment
 */
function calculateNextPaymentDate(billingPeriod) {
    const now = new Date();
    
    switch (billingPeriod) {
        case 'weekly':
            now.setDate(now.getDate() + 7);
            break;
        case 'monthly':
            now.setMonth(now.getMonth() + 1);
            break;
        case 'yearly':
            now.setFullYear(now.getFullYear() + 1);
            break;
        default:
            now.setMonth(now.getMonth() + 1);
    }
    
    return now.toISOString();
}

/**
 * Subscription Payment Workflow
 * 
 * Processes recurring subscription payments with:
 * - Automatic retry on payment failure
 * - Subscription suspension after multiple failed attempts
 * - Next payment date calculation
 * 
 * @param {SubscriptionData} subscriptionData - Subscription payment details
 * @returns {Promise<WorkflowResult>} - Payment result
 * 
 * @example
 * await startWorkflow('subscriptionPaymentWorkflow', {
 *   subscriptionId: 'SUB789',
 *   userId: 'user@example.com',
 *   amount: 29.99,
 *   currency: 'USD',
 *   billingPeriod: 'monthly'
 * });
 */
async function subscriptionPaymentWorkflow(subscriptionData) {
    const { subscriptionId, userId, amount, currency, billingPeriod } = subscriptionData;
    
    console.log(`[Subscription Workflow] Processing payment for subscription ${subscriptionId}`);
    
    try {
        // Step 1: Check subscription status
        const subscription = await getSubscriptionDetails({ subscriptionId });
        
        if (!subscription.active) {
            console.log(`[Subscription Workflow] Subscription ${subscriptionId} is not active`);
            return {
                success: false,
                message: 'Subscription is not active',
            };
        }
        
        console.log(`[Subscription Workflow] Subscription is active, processing payment`);
        
        // Step 2: Process payment
        const paymentResult = await processPaymentGateway({
            orderId: `sub-${subscriptionId}-${Date.now()}`,
            amount,
            currency,
            paymentMethod: subscription.paymentMethod,
            userId,
        });
        
        const retryCount = subscription.failedPaymentCount || 0;
        
        if (paymentResult.success) {
            console.log(`[Subscription Workflow] Payment successful, transaction: ${paymentResult.transactionId}`);
            
            // Step 3: Update subscription with success
            const nextPaymentDate = calculateNextPaymentDate(billingPeriod);
            
            await updateSubscription({
                subscriptionId,
                lastPaymentDate: new Date().toISOString(),
                nextPaymentDate,
                status: 'active',
                failedPaymentCount: 0, // Reset failed count on success
            });
            
            console.log(`[Subscription Workflow] Subscription updated, next payment: ${nextPaymentDate}`);
            
            // Step 4: Send receipt email
            await sendEmail({
                to: userId,
                subject: 'Subscription Payment Receipt',
                body: `
                    <h1>Payment Receipt</h1>
                    <p>Your subscription payment has been processed successfully.</p>
                    <p>Amount: ${amount} ${currency}</p>
                    <p>Transaction ID: ${paymentResult.transactionId}</p>
                    <p>Next payment date: ${new Date(nextPaymentDate).toLocaleDateString()}</p>
                `,
            });
            
            return {
                success: true,
                subscriptionId,
                transactionId: paymentResult.transactionId,
                nextPaymentDate,
                message: 'Subscription payment processed successfully',
            };
            
        } else {
            // Payment failed - handle retry logic
            console.error(`[Subscription Workflow] Payment failed: ${paymentResult.error}`);
            
            const newRetryCount = retryCount + 1;
            const maxRetries = 3;
            
            if (newRetryCount >= maxRetries) {
                // Suspend subscription after max retries
                console.log(`[Subscription Workflow] Max retries reached, suspending subscription`);
                
                await updateSubscription({
                    subscriptionId,
                    status: 'suspended',
                    failedPaymentCount: newRetryCount,
                });
                
                await sendEmail({
                    to: userId,
                    subject: 'Subscription Suspended - Payment Failed',
                    body: `
                        <h1>Subscription Suspended</h1>
                        <p>Your subscription has been suspended due to repeated payment failures.</p>
                        <p>Failed attempts: ${newRetryCount}</p>
                        <p>Please update your payment method to reactivate your subscription.</p>
                    `,
                });
                
                return {
                    success: false,
                    message: `Subscription suspended after ${newRetryCount} failed payment attempts`,
                    retryCount: newRetryCount,
                };
                
            } else {
                // Increment retry count
                console.log(`[Subscription Workflow] Payment failed (attempt ${newRetryCount}/${maxRetries})`);
                
                await updateSubscription({
                    subscriptionId,
                    failedPaymentCount: newRetryCount,
                });
                
                await sendEmail({
                    to: userId,
                    subject: 'Subscription Payment Failed - Retry Scheduled',
                    body: `
                        <h1>Payment Failed</h1>
                        <p>Your subscription payment could not be processed.</p>
                        <p>Attempt: ${newRetryCount} of ${maxRetries}</p>
                        <p>We will automatically retry the payment. Please ensure your payment method is valid.</p>
                    `,
                });
                
                return {
                    success: false,
                    message: paymentResult.error,
                    retryCount: newRetryCount,
                };
            }
        }
        
    } catch (error) {
        console.error(`[Subscription Workflow] Failed for subscription ${subscriptionId}:`, error);
        throw error;
    }
}

module.exports = {
    subscriptionPaymentWorkflow,
};
