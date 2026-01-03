module.exports = (sequelize, Sequelize) => {
  const WalletTransaction = sequelize.define("wallet_transaction", {
    transactionId: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "transaction_id",
    },
    userId: {
      type: Sequelize.INTEGER,
      field: "user_id",
      allowNull: false,
      references: {
        model: 'platform_user',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: "User who owns this transaction"
    },
    transactionType: {
      type: Sequelize.ENUM('CREDIT', 'DEBIT'),
      field: "transaction_type",
      allowNull: false
    },
    amount: {
      type: Sequelize.INTEGER,
      field: "amount",
      allowNull: false,
      validate: {
        min: 1
      },
      comment: "Number of units added or removed"
    },
    balanceAfter: {
      type: Sequelize.INTEGER,
      field: "balance_after",
      allowNull: false,
      comment: "Wallet balance after this transaction"
    },
    reason: {
      type: Sequelize.STRING(500),
      field: "reason",
      allowNull: true,
      comment: "Reason for wallet transaction (e.g., 'Property listing purchase', 'Admin balance adjustment')"
    },
    metadata: {
      type: Sequelize.JSONB,
      field: "metadata",
      allowNull: true,
      comment: "Additional metadata for the transaction"
    },
    createdAt: {
      type: Sequelize.DATE,
      field: "created_at",
      defaultValue: Sequelize.NOW,
    },
    updatedAt: {
      type: Sequelize.DATE,
      field: "updated_at",
      defaultValue: Sequelize.NOW,
    },
  }, {
    tableName: "wallet_transaction",
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['transaction_type']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  return WalletTransaction;
};
