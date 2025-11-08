/**
 * Payment Processing Workflow
 * 
 * Handles payment processing with saga pattern for compensation logic.
 * Includes inventory reservation, payment gateway integration, and order updates.
 * 
 * @module temporal/workflows/payment/payment.workflow
 */

const { proxyActivities } = require('@temporalio/workflow');
const { ACTIVITY_OPTIONS, ERROR_CODES } = require('../../config/constants');

/** @typedef {import('../../types').PaymentData} PaymentData */
/** @typedef {import('../../types').PaymentWorkflowResult} PaymentWorkflowResult */

// Proxy payment activities
const {
    validatePayment,
    processPaymentGateway,
    reserveInventory,
    releaseInventory,
    updateOrderStatus,
    triggerFulfillment,
    sendEmail,
} = proxyActivities(ACTIVITY_OPTIONS.payment);

/**
 * Process Payment Workflow
 * 
 * Implements a saga pattern for payment processing:
 * 1. Validate payment
 * 2. Reserve inventory
 * 3. Process payment
 * 4. Update order
 * 5. Trigger fulfillment
 * 
 * If payment fails, automatically releases reserved inventory.
 * 
 * @param {PaymentData} paymentData - Payment details
 * @returns {Promise<PaymentWorkflowResult>} - Payment result
 * 
 * @example
 * await startWorkflow('processPaymentWorkflow', {
 *   orderId: 'ORD123456',
 *   userId: 'user@example.com',
 *   amount: 999.99,
 *   currency: 'USD',
 *   paymentMethod: 'card'
 * });
 */
async function processPaymentWorkflow(paymentData) {
    const { orderId, userId, amount, currency, paymentMethod } = paymentData;
    
    console.log(`[Payment Workflow] Starting for order ${orderId}, amount: ${amount} ${currency}`);
    
    let inventoryReserved = false;
    
    try {
        // Step 1: Validate payment details
        console.log(`[Payment Workflow] Validating payment for order ${orderId}`);
        const validationResult = await validatePayment({
            userId,
            amount,
            currency,
            paymentMethod,
        });
        
        if (!validationResult.valid) {
            throw new Error(`${ERROR_CODES.VALIDATION_ERROR}: ${validationResult.reason}`);
        }
        
        console.log(`[Payment Workflow] Payment validation successful`);
        
        // Step 2: Reserve inventory
        console.log(`[Payment Workflow] Reserving inventory for order ${orderId}`);
        const inventoryResult = await reserveInventory({
            orderId,
            userId,
        });
        
        if (!inventoryResult.success) {
            throw new Error(`${ERROR_CODES.INVENTORY_UNAVAILABLE}: Failed to reserve inventory`);
        }
        
        inventoryReserved = true;
        console.log(`[Payment Workflow] Inventory reserved successfully`);
        
        // Step 3: Process payment with payment gateway
        console.log(`[Payment Workflow] Processing payment with gateway for order ${orderId}`);
        const paymentResult = await processPaymentGateway({
            orderId,
            amount,
            currency,
            paymentMethod,
            userId,
        });
        
        if (!paymentResult.success) {
            // Compensation: Release inventory
            console.log(`[Payment Workflow] Payment failed, releasing inventory`);
            await releaseInventory({ orderId });
            inventoryReserved = false;
            
            throw new Error(`${ERROR_CODES.PAYMENT_FAILED}: ${paymentResult.error}`);
        }
        
        console.log(`[Payment Workflow] Payment processed successfully, transaction: ${paymentResult.transactionId}`);
        
        // Step 4: Update order status to paid
        await updateOrderStatus({
            orderId,
            status: 'paid',
            transactionId: paymentResult.transactionId,
        });
        
        console.log(`[Payment Workflow] Order status updated to paid`);
        
        // Step 5: Send confirmation email
        await sendEmail({
            to: userId,
            subject: 'Payment Successful - Order Confirmed',
            body: `
                <h1>Payment Successful!</h1>
                <p>Your payment of ${amount} ${currency} has been processed successfully.</p>
                <p>Order ID: ${orderId}</p>
                <p>Transaction ID: ${paymentResult.transactionId}</p>
                <p>Your order is now being processed.</p>
            `,
        });
        
        console.log(`[Payment Workflow] Confirmation email sent`);
        
        // Step 6: Trigger fulfillment process
        await triggerFulfillment({ orderId });
        
        console.log(`[Payment Workflow] Fulfillment triggered for order ${orderId}`);
        
        return {
            success: true,
            orderId,
            transactionId: paymentResult.transactionId,
            amount,
            currency,
            message: 'Payment processed successfully',
        };
        
    } catch (error) {
        console.error(`[Payment Workflow] Failed for order ${orderId}:`, error.message);
        
        // Compensation logic: Release inventory if it was reserved
        if (inventoryReserved) {
            try {
                console.log(`[Payment Workflow] Compensating: releasing inventory`);
                await releaseInventory({ orderId });
            } catch (releaseError) {
                console.error(`[Payment Workflow] Failed to release inventory:`, releaseError);
            }
        }
        
        // Send failure notification
        await sendEmail({
            to: userId,
            subject: 'Payment Failed - Order Not Processed',
            body: `
                <h1>Payment Failed</h1>
                <p>Your payment could not be processed.</p>
                <p>Order ID: ${orderId}</p>
                <p>Reason: ${error.message}</p>
                <p>Please try again or contact support if the issue persists.</p>
            `,
        });
        
        // Update order status to failed
        await updateOrderStatus({
            orderId,
            status: 'payment_failed',
            errorMessage: error.message,
        });
        
        throw error;
    }
}

module.exports = {
    processPaymentWorkflow,
};
