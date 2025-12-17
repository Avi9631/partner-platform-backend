const { formatDate, formatTime } = require("../utils/dateFormatters");

module.exports = (sequelize, Sequelize) => {
  const PgColiveHostel = sequelize.define("pg_colive_hostel", {
    pgHostelId: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "pg_hostel_id",
    },
    userId: {
      type: Sequelize.INTEGER,
      field: "user_id",
      allowNull: false,
      references: {
        model: 'user',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    draftId: {
      type: Sequelize.INTEGER,
      field: "draft_id",
      allowNull: false,
      unique: true,
      references: {
        model: 'listing_draft',
        key: 'draft_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'Ensures one draft can only be published once'
    },
    propertyName: {
      type: Sequelize.STRING(255),
      field: "property_name",
      allowNull: false,
    },
    slug: {
      type: Sequelize.STRING(255),
      field: "slug",
      allowNull: false,
      unique: true,
      comment: 'URL-friendly unique identifier'
    },
    genderAllowed: {
      type: Sequelize.STRING(50),
      field: "gender_allowed",
      allowNull: true,
      comment: 'Gents / Ladies / Unisex'
    },
    description: {
      type: Sequelize.TEXT,
      field: "description",
      allowNull: true,
    },
    isBrandManaged: {
      type: Sequelize.BOOLEAN,
      field: "is_brand_managed",
      defaultValue: false,
    },
    brandName: {
      type: Sequelize.STRING(255),
      field: "brand_name",
      allowNull: true,
    },
    yearBuilt: {
      type: Sequelize.STRING(50),
      field: "year_built",
      allowNull: true,
    },
    coordinates: {
      type: Sequelize.JSONB,
      field: "coordinates",
      allowNull: true,
      comment: 'Stores { lat, lng }'
    },
    city: {
      type: Sequelize.STRING(100),
      field: "city",
      allowNull: true,
    },
    locality: {
      type: Sequelize.STRING(255),
      field: "locality",
      allowNull: true,
    },
    addressText: {
      type: Sequelize.TEXT,
      field: "address_text",
      allowNull: true,
    },
    landmark: {
      type: Sequelize.STRING(255),
      field: "landmark",
      allowNull: true,
    },
    roomTypes: {
      type: Sequelize.JSONB,
      field: "room_types",
      allowNull: true,
      comment: 'Array of room type objects with pricing, amenities, images, availability'
    },
    commonAmenities: {
      type: Sequelize.JSONB,
      field: "common_amenities",
      allowNull: true,
      comment: 'Array of common amenity objects'
    },
    commonAmenitiesLegacy: {
      type: Sequelize.JSONB,
      field: "common_amenities_legacy",
      allowNull: true,
    },
    roomAmenities: {
      type: Sequelize.JSONB,
      field: "room_amenities",
      allowNull: true,
    },
    foodMess: {
      type: Sequelize.JSONB,
      field: "food_mess",
      allowNull: true,
      comment: 'Food and mess details including meals, menu, timings'
    },
    rules: {
      type: Sequelize.JSONB,
      field: "rules",
      allowNull: true,
      comment: 'Array of rule objects'
    },
    mediaData: {
      type: Sequelize.JSONB,
      field: "media_data",
      allowNull: true,
      comment: 'Array of media objects (images, videos)'
    },
    publishStatus: {
      type: Sequelize.ENUM('PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'),
      field: "publish_status",
      defaultValue: 'PENDING_REVIEW',
      comment: 'Publication status'
    },
    verificationStatus: {
      type: Sequelize.ENUM('PENDING', 'VERIFIED', 'REJECTED'),
      field: "verification_status",
      defaultValue: 'PENDING',
      comment: 'Verification status'
    },
    
    // Virtual fields for formatted date/time
    v_created_date: {
      type: Sequelize.VIRTUAL,
      get() {
        return formatDate(this.pg_hostel_created_at);
      },
    },
    v_created_time: {
      type: Sequelize.VIRTUAL,
      get() {
        return formatTime(this.pg_hostel_created_at);
      },
    },
    v_updated_date: {
      type: Sequelize.VIRTUAL,
      get() {
        return formatDate(this.pg_hostel_updated_at);
      },
    },
    v_updated_time: {
      type: Sequelize.VIRTUAL,
      get() {
        return formatTime(this.pg_hostel_updated_at);
      },
    },
  }, {
    timestamps: true,
    createdAt: "pg_hostel_created_at",
    updatedAt: "pg_hostel_updated_at",
    deletedAt: "pg_hostel_deleted_at",
    paranoid: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['draft_id']
      },
      {
        fields: ['slug']
      },
      {
        fields: ['property_name']
      },
      {
        fields: ['city']
      },
      {
        fields: ['locality']
      },
      {
        fields: ['publish_status']
      },
      {
        fields: ['verification_status']
      },
      {
        fields: ['pg_hostel_created_at']
      }
    ],
  });

  return PgColiveHostel;
};
