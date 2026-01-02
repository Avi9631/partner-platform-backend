-- Migration: Create credit_transaction table
-- Description: Table to store credit transactions (add/deduct) for users
-- Date: 2026-01-02

CREATE TABLE IF NOT EXISTS credit_transaction (
    transaction_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES platform_user(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    amount INTEGER NOT NULL CHECK (amount > 0),
    balance_after INTEGER NOT NULL,
    reason VARCHAR(500),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_credit_transaction_user_id ON credit_transaction(user_id);
CREATE INDEX idx_credit_transaction_type ON credit_transaction(transaction_type);
CREATE INDEX idx_credit_transaction_created_at ON credit_transaction(created_at);

-- Add comment to table
COMMENT ON TABLE credit_transaction IS 'Stores all credit transactions (additions and deductions) for users';
COMMENT ON COLUMN credit_transaction.transaction_id IS 'Unique transaction identifier';
COMMENT ON COLUMN credit_transaction.user_id IS 'User who owns this transaction';
COMMENT ON COLUMN credit_transaction.transaction_type IS 'CREDIT for adding credits, DEBIT for removing credits';
COMMENT ON COLUMN credit_transaction.amount IS 'Number of credits added or removed';
COMMENT ON COLUMN credit_transaction.balance_after IS 'Credit balance after this transaction';
COMMENT ON COLUMN credit_transaction.reason IS 'Reason for credit transaction';
COMMENT ON COLUMN credit_transaction.metadata IS 'Additional metadata for the transaction';
