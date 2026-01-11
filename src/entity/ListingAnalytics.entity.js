const {formatDate, formatTime} = require("../utils/dateFormatters");

module.exports = (sequelize, Sequelize) => {
    const ListingView = sequelize.define("listing_view", {
      viewId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "view_id",
      },
      
      // Polymorphic relationship to track different listing types
      listingType: {
        type: Sequelize.ENUM('property', 'project', 'pg_hostel', 'developer'),
        field: "listing_type",
        allowNull: false
      },
      
      listingId: {
        type: Sequelize.INTEGER,
        field: "listing_id",
        allowNull: false
      },
      
      // View duration in seconds
      viewDuration: {
        type: Sequelize.INTEGER,
        field: "view_duration",
        allowNull: true
      },
      
      // Viewer information (if user is logged in)
      viewerId: {
        type: Sequelize.INTEGER,
        field: "viewer_id",
        allowNull: true,
        references: {
          model: 'platform_user',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      
      // Session/anonymous tracking
      sessionId: {
        type: Sequelize.STRING(255),
        field: "session_id",
        allowNull: true
      },
      
      // IP address for analytics
      ipAddress: {
        type: Sequelize.STRING(45),
        field: "ip_address",
        allowNull: true
      },
      
      // User agent for device tracking
      userAgent: {
        type: Sequelize.TEXT,
        field: "user_agent",
        allowNull: true
      },
      
      // Referrer information
      referrer: {
        type: Sequelize.STRING(500),
        field: "referrer",
        allowNull: true
      },
      
      // Device type
      deviceType: {
        type: Sequelize.ENUM('mobile', 'tablet', 'desktop', 'unknown'),
        field: "device_type",
        allowNull: true,
        defaultValue: 'unknown'
      },
      
      // Location information
      country: {
        type: Sequelize.STRING(100),
        field: "country",
        allowNull: true
      },
      
      city: {
        type: Sequelize.STRING(100),
        field: "city",
        allowNull: true
      },
      
      // View timestamp
      viewedAt: {
        type: Sequelize.DATE,
        field: "viewed_at",
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      
      // Additional metadata
      metadata: {
        type: Sequelize.JSONB,
        field: "metadata",
        allowNull: true
      },
    }, {
      tableName: "listing_view",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          name: 'idx_listing_type_id',
          fields: ['listing_type', 'listing_id']
        },
        {
          name: 'idx_viewer_id',
          fields: ['viewer_id']
        },
        {
          name: 'idx_session_id',
          fields: ['session_id']
        },
        {
          name: 'idx_viewed_at',
          fields: ['viewed_at']
        },
        {
          name: 'idx_listing_views_composite',
          fields: ['listing_type', 'listing_id', 'viewed_at']
        }
      ],
    });
  
    // Instance method to format the response
    ListingView.prototype.toJSON = function () {
      const values = Object.assign({}, this.get());
      
      // Format dates
      if (values.viewedAt) {
        values.viewedAtDate = formatDate(values.viewedAt);
        values.viewedAtTime = formatTime(values.viewedAt);
      }
      
      if (values.createdAt) {
        values.createdAtDate = formatDate(values.createdAt);
        values.createdAtTime = formatTime(values.createdAt);
      }
      
      if (values.updatedAt) {
        values.updatedAtDate = formatDate(values.updatedAt);
        values.updatedAtTime = formatTime(values.updatedAt);
      }
      
      // Remove sensitive information in response
      delete values.ipAddress;
      delete values.userAgent;
      
      return values;
    };
  
    return ListingView;
};
