# Wallet Management System

This module provides a complete wallet management system for the partner platform, allowing users to track, add, and deduct funds with full transaction history.

## Features

- ✅ Add funds to user wallets
- ✅ Deduct funds from user wallets
- ✅ Get current wallet balance
- ✅ Transaction history with pagination
- ✅ Wallet statistics (total earned, spent, etc.)
- ✅ Check sufficient funds before operations
- ✅ Complete audit trail with metadata support

## Database Schema

### wallet_transaction table

| Column | Type | Description |
|--------|------|-------------|
| transaction_id | SERIAL | Primary key |
| user_id | INTEGER | User who owns this transaction (FK to platform_user) |
| transaction_type | ENUM | 'CREDIT' or 'DEBIT' |
| amount | INTEGER | Number of units added or removed |
| balance_after | INTEGER | Wallet balance after this transaction |
| reason | VARCHAR(500) | Reason for transaction |
| reference_type | VARCHAR(50) | Type of reference (e.g., 'PROPERTY', 'PROJECT') |
| reference_id | INTEGER | ID of the related entity |
| performed_by | INTEGER | Admin user who performed the transaction (FK to platform_user) |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Update timestamp |

## API Endpoints

### 1. Get Wallet Balance
```http
GET /api/wallet/balance
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet balance fetched successfully",
  "data": {
    "balance": 100
  }
}
```

### 2. Get Transaction History
```http
GET /api/wallet/transactions?page=1&limit=20&transactionType=CREDIT
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `transactionType` (optional): Filter by 'CREDIT' or 'DEBIT'
- `referenceType` (optional): Filter by reference type
- `startDate` (optional): Filter from date (ISO format)
- `endDate` (optional): Filter to date (ISO format)

**Response:**
```json
{
  "success": true,
  "message": "Transaction history fetched successfully",
  "data": {
    "transactions": [
      {
        "transactionId": 1,
        "userId": 123,
        "transactionType": "CREDIT",
        "amount": 50,
        "balanceAfter": 150,
        "reason": "Property listing purchase",
        "referenceType": "PROPERTY",
        "referenceId": 456,
        "createdAt": "2026-01-02T10:00:00Z"
      }
    ],
    "currentBalance": 150,
    "pagination": {
      "total": 10,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

### 3. Get Wallet Statistics
```http
GET /api/wallet/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet statistics fetched successfully",
  "data": {
    "currentBalance": 150,
    "totalEarned": 200,
    "totalSpent": 50,
    "transactionCount": 15
  }
}
```

### 4. Add Funds (Admin)
```http
POST /api/wallet/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 123,
  "amount": 100,
  "reason": "Welcome bonus",
  "referenceType": "ADMIN_ADJUSTMENT",
  "metadata": {
    "promotion": "NEW_USER_BONUS"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Funds added successfully",
  "data": {
    "transactionId": 1,
    "userId": 123,
    "transactionType": "CREDIT",
    "amount": 100,
    "balanceAfter": 100,
    "reason": "Welcome bonus",
    "createdAt": "2026-01-02T10:00:00Z"
  }
}
```

### 5. Deduct Funds (Admin)
```http
POST /api/wallet/deduct
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": 123,
  "amount": 50,
  "reason": "Property listing published",
  "referenceType": "PROPERTY",
  "referenceId": 456
}
```

**Response:**
```json
{
  "success": true,
  "message": "Funds deducted successfully",
  "data": {
    "transactionId": 2,
    "userId": 123,
    "transactionType": "DEBIT",
    "amount": 50,
    "balanceAfter": 50,
    "reason": "Property listing published",
    "createdAt": "2026-01-02T10:00:00Z"
  }
}
```

### 6. Check Sufficient Funds
```http
POST /api/wallet/check
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 50
}
```

**Response:**
```json
{
  "success": true,
  "message": "Sufficient funds available",
  "data": {
    "hasSufficientFunds": true,
    "currentBalance": 100,
    "requiredAmount": 50
  }
}
```

## Service Methods

The `WalletService` provides the following utility methods:

### getWalletBalance(userId)
Get the current wallet balance for a user.

```javascript
const result = await WalletService.getWalletBalance(userId);
// Returns: { success: boolean, balance: number, message?: string }
```

### addFunds(userId, amount, reason, referenceType, referenceId, performedBy, metadata)
Add funds to a user wallet.

```javascript
const result = await WalletService.addFunds(
  userId, 
  100, 
  'Welcome bonus',
  'ADMIN_ADJUSTMENT',
  null,
  adminUserId,
  { promotion: 'NEW_USER' }
);
// Returns: { success: boolean, transaction?: object, message?: string }
```

### deductFunds(userId, amount, reason, referenceType, referenceId, performedBy, metadata)
Deduct funds from a user wallet (with sufficient balance check).

```javascript
const result = await WalletService.deductFunds(
  userId,
  50,
  'Property listing',
  'PROPERTY',
  propertyId,
  null,
  null
);
// Returns: { success: boolean, transaction?: object, message?: string }
```

### getTransactionHistory(userId, options)
Get paginated transaction history with filters.

```javascript
const result = await WalletService.getTransactionHistory(userId, {
  page: 1,
  limit: 20,
  transactionType: 'CREDIT',
  startDate: '2026-01-01',
  endDate: '2026-01-31'
});
// Returns: { success: boolean, data?: object, message?: string }
```

### checkSufficientFunds(userId, requiredAmount)
Check if user has sufficient funds for an operation.

```javascript
const result = await WalletService.checkSufficientFunds(userId, 50);
// Returns: { success: boolean, hasSufficientFunds: boolean, currentBalance: number, message?: string }
```

### getWalletStats(userId)
Get wallet statistics for a user.

```javascript
const result = await WalletService.getWalletStats(userId);
// Returns: { success: boolean, stats?: object, message?: string }
```

## Usage Examples

### Example 1: Property Listing with Wallet Deduction

```javascript
const PropertyController = {
  publishProperty: async (req, res) => {
    const userId = req.user.userId;
    const walletCost = 10; // Cost to publish a property
    
    // Check if user has sufficient funds
    const walletCheck = await WalletService.checkSufficientFunds(userId, walletCost);
    
    if (!walletCheck.hasSufficientFunds) {
      return sendErrorResponse(res, 'Insufficient funds to publish property', 400);
    }
    
    // Deduct funds
    const deductResult = await WalletService.deductFunds(
      userId,
      walletCost,
      'Property listing published',
      'PROPERTY',
      propertyId
    );
    
    if (!deductResult.success) {
      return sendErrorResponse(res, 'Failed to deduct funds', 500);
    }
    
    // Proceed with property publishing...
  }
};
```

### Example 2: Admin Wallet Management

```javascript
// Add welcome bonus for new users
const result = await WalletService.addFunds(
  newUserId,
  100,
  'Welcome bonus for new user',
  'ADMIN_ADJUSTMENT',
  null,
  adminUserId,
  { campaign: 'WELCOME_2026' }
);

// Refund funds for cancelled listing
const refundResult = await WalletService.addFunds(
  userId,
  10,
  'Refund for cancelled property listing',
  'PROPERTY',
  propertyId,
  adminUserId,
  { originalTransactionId: 123 }
);
```

## Migration

Run the migration to create the `wallet_transaction` table:

```sql
-- See migrations/create-wallet-transaction-table.sql
```

## Error Handling

All service methods return a consistent response format:

```javascript
{
  success: boolean,
  data?: any,        // Only on success
  message?: string   // Error message or additional info
}
```

Always check the `success` property before using the returned data.

## Security Considerations

1. **Admin Routes**: The `/add` and `/deduct` endpoints should be restricted to admin users only. Consider adding an admin role check middleware.
2. **Rate Limiting**: Implement rate limiting on wallet-related endpoints to prevent abuse.
3. **Audit Trail**: All transactions are logged with timestamps and performer information for accountability.
4. **Balance Validation**: The service automatically checks for sufficient balance before deducting funds.

## Future Enhancements

- [ ] Add wallet packages and pricing
- [ ] Implement fund expiration dates
- [ ] Add bulk wallet operations
- [ ] Create fund transfer between users
- [ ] Add webhook notifications for low balance
- [ ] Generate transaction receipts/invoices
