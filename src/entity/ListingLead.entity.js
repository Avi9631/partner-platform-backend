const { formatDate, formatTime } = require("../utils/dateFormatters");

module.exports = (sequelize, Sequelize) => {
  const ListingLead = sequelize.define(
    "listing_lead",
    {
      leadId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "lead_id",
      },

      // Polymorphic relationship to track different listing types
      listingType: {
        type: Sequelize.ENUM("PROPERTY", "PG_COLIVING", "PROJECT", "DEVELOPER"),
        field: "listing_type",
        allowNull: false,
      },

      listingId: {
        type: Sequelize.INTEGER,
        field: "listing_id",
        allowNull: false,
      },

      // Lead reason/source
      reason: {
        type: Sequelize.ENUM(
          "CONNECT_AGENT",
          "CALLBACK_REQUEST",
          "VIRTUAL_TOUR"
        ),
        field: "reason",
        allowNull: false,
      },

      // Customer information
      customerName: {
        type: Sequelize.STRING(255),
        field: "customer_name",
        allowNull: false,
      },

      customerEmail: {
        type: Sequelize.STRING(255),
        field: "customer_email",
        allowNull: true,
      },

      customerPhone: {
        type: Sequelize.STRING(20),
        field: "customer_phone",
        allowNull: true,
      },

      customerMessage: {
        type: Sequelize.TEXT,
        field: "customer_message",
        allowNull: true,
      },

      // Lead status
      status: {
        type: Sequelize.ENUM(
          "NEW",
          "CONTACTED",
          "IN_PROGRESS",
          "COMPLETED",
          "CLOSED"
        ),
        field: "status",
        defaultValue: "NEW",
      },

      // Additional information
      location: {
        type: Sequelize.STRING(255),
        field: "location",
        allowNull: true,
      },

      preferredContactTime: {
        type: Sequelize.STRING(100),
        field: "preferred_contact_time",
        allowNull: true,
      },

      scheduledAt: {
        type: Sequelize.DATE,
        field: "scheduled_at",
        allowNull: true,
      },

      // Property owner (partner) information
      partnerId: {
        type: Sequelize.INTEGER,
        field: "partner_id",
        allowNull: true,
        references: {
          model: "platform_user",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      // Tracking fields
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

      contactedAt: {
        type: Sequelize.DATE,
        field: "contacted_at",
        allowNull: true,
      },

      completedAt: {
        type: Sequelize.DATE,
        field: "completed_at",
        allowNull: true,
      },

      // Metadata for flexible storage
      metadata: {
        type: Sequelize.JSONB,
        field: "metadata",
        allowNull: true,
      },
    },
    {
      timestamps: false, // We handle timestamps manually
      tableName: "listing_lead",
      underscored: true,
    }
  );

  // Instance methods
  ListingLead.prototype.toJSON = function () {
    const values = { ...this.get() };

    // Format dates
    if (values.createdAt) {
      values.createdAtFormatted = formatDate(values.createdAt);
    }
    if (values.updatedAt) {
      values.updatedAtFormatted = formatDate(values.updatedAt);
    }
    if (values.scheduledAt) {
      values.scheduledAtFormatted = formatDate(values.scheduledAt);
    }
    if (values.contactedAt) {
      values.contactedAtFormatted = formatDate(values.contactedAt);
    }
    if (values.completedAt) {
      values.completedAtFormatted = formatDate(values.completedAt);
    }

    return values;
  };

  // Class methods
  ListingLead.associate = (models) => {
    // Association with PlatformUser (partner/owner)
    ListingLead.belongsTo(models.PlatformUser, {
      foreignKey: "partnerId",
      as: "partner",
    });
  };

  return ListingLead;
};
