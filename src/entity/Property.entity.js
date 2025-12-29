const {formatDate, formatTime} = require("../utils/dateFormatters");

module.exports = (sequelize, Sequelize) => {
    const Property = sequelize.define("property", {
      propertyId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "property_id",
      },
      propertyName: {
        type: Sequelize.STRING(255),
        field: "property_name",
        allowNull: false,
      },
      projectId: {
        type: Sequelize.INTEGER,
        field: "project_id",
        allowNull: true,
        references: {
          model: 'project',
          key: 'project_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        field: "created_by",
        allowNull: false,
        references: {
          model: 'platform_user',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      draftId: {
        type: Sequelize.INTEGER,
        field: "draft_id",
        allowNull: true,
        references: {
          model: 'listing_draft',
          key: 'draft_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: "Reference to the draft used to publish this property"
      },
      
      // Basic Property Information
      title: {
        type: Sequelize.STRING(500),
        field: "title",
        allowNull: true,
        comment: "Property listing title"
      },
      description: {
        type: Sequelize.TEXT,
        field: "description",
        allowNull: true,
        comment: "Detailed property description"
      },
      propertyType: {
        type: Sequelize.STRING(50),
        field: "property_type",
        allowNull: true,
        comment: "apartment, villa, plot, etc."
      },
      listingType: {
        type: Sequelize.STRING(20),
        field: "listing_type",
        allowNull: true,
        comment: "Type of listing (sale, rent, lease)",
        validate: {
          isIn: [['sale', 'rent', 'lease']]
        }
      },
      isNewProperty: {
        type: Sequelize.BOOLEAN,
        field: "is_new_property",
        defaultValue: false
      },
      
      // Location Information
      location: {
        type: Sequelize.GEOGRAPHY('POINT', 4326),
        field: "location",
        allowNull: true,
        comment: 'PostGIS geography point (SRID 4326) for efficient spatial queries'
      },
      lat: {
        type: Sequelize.DECIMAL(10, 8),
        field: "lat",
        allowNull: true,
        comment: 'Latitude coordinate for easy access'
      },
      lng: {
        type: Sequelize.DECIMAL(11, 8),
        field: "lng",
        allowNull: true,
        comment: 'Longitude coordinate for easy access'
      },
      city: {
        type: Sequelize.STRING(100),
        field: "city",
        allowNull: true
      },
      locality: {
        type: Sequelize.STRING(200),
        field: "locality",
        allowNull: true
      },
      landmark: {
        type: Sequelize.STRING(200),
        field: "landmark",
        allowNull: true
      },
      addressText: {
        type: Sequelize.TEXT,
        field: "address_text",
        allowNull: true,
        comment: "Full formatted address"
      },
      showMapExact: {
        type: Sequelize.BOOLEAN,
        field: "show_map_exact",
        defaultValue: false,
        comment: "Show exact location on map"
      },
      
      // Property Specifications
      bedrooms: {
        type: Sequelize.STRING(20),
        field: "bedrooms",
        allowNull: true
      },
      bathrooms: {
        type: Sequelize.STRING(20),
        field: "bathrooms",
        allowNull: true
      },
      facing: {
        type: Sequelize.STRING(50),
        field: "facing",
        allowNull: true,
        comment: "north, south, east, west, etc."
      },
      view: {
        type: Sequelize.STRING(50),
        field: "view",
        allowNull: true,
        comment: "park_view, road_view, etc."
      },
      floorNumber: {
        type: Sequelize.STRING(20),
        field: "floor_number",
        allowNull: true
      },
      totalFloors: {
        type: Sequelize.STRING(20),
        field: "total_floors",
        allowNull: true
      },
      unitNumber: {
        type: Sequelize.STRING(50),
        field: "unit_number",
        allowNull: true
      },
      towerName: {
        type: Sequelize.STRING(100),
        field: "tower_name",
        allowNull: true
      },
      isUnitNumberPrivate: {
        type: Sequelize.BOOLEAN,
        field: "is_unit_number_private",
        defaultValue: false
      },
      
      // Area Measurements
      carpetArea: {
        type: Sequelize.STRING(50),
        field: "carpet_area",
        allowNull: true
      },
      superArea: {
        type: Sequelize.STRING(50),
        field: "super_area",
        allowNull: true
      },
      areaConfig: {
        type: Sequelize.JSONB,
        field: "area_config",
        allowNull: true,
        comment: "Breakdown of area (balcony, common, parking, etc.)"
      },
      measurementMethod: {
        type: Sequelize.STRING(50),
        field: "measurement_method",
        allowNull: true,
        comment: "self_measured, architect_measured, etc."
      },
      
      // Property Status & Type
      ownershipType: {
        type: Sequelize.STRING(50),
        field: "ownership_type",
        allowNull: true,
        comment: "freehold, leasehold, co-operative"
      },
      furnishingStatus: {
        type: Sequelize.STRING(50),
        field: "furnishing_status",
        allowNull: true,
        comment: "furnished, semi_furnished, unfurnished"
      },
      possessionStatus: {
        type: Sequelize.STRING(50),
        field: "possession_status",
        allowNull: true,
        comment: "ready, under_construction, etc."
      },
      ageOfProperty: {
        type: Sequelize.STRING(50),
        field: "age_of_property",
        allowNull: true
      },
      propertyPosition: {
        type: Sequelize.STRING(50),
        field: "property_position",
        allowNull: true,
        comment: "corner, middle, end"
      },
      availableFrom: {
        type: Sequelize.DATE,
        field: "available_from",
        allowNull: true
      },
      possessionDate: {
        type: Sequelize.DATE,
        field: "possession_date",
        allowNull: true
      },
      
      // Pricing Information
      pricing: {
        type: Sequelize.JSONB,
        field: "pricing",
        allowNull: true,
        comment: "Array of pricing details with type, unit, value"
      },
      isPriceVerified: {
        type: Sequelize.BOOLEAN,
        field: "is_price_verified",
        defaultValue: false
      },
      isPriceNegotiable: {
        type: Sequelize.BOOLEAN,
        field: "is_price_negotiable",
        defaultValue: false
      },
      
      // Project & Names
      projectName: {
        type: Sequelize.STRING(200),
        field: "project_name",
        allowNull: true
      },
      customPropertyName: {
        type: Sequelize.STRING(200),
        field: "custom_property_name",
        allowNull: true
      },
      
      // Features & Amenities (JSONB Arrays)
      features: {
        type: Sequelize.JSONB,
        field: "features",
        allowNull: true,
        defaultValue: [],
        comment: "Array of property features"
      },
      amenities: {
        type: Sequelize.JSONB,
        field: "amenities",
        allowNull: true,
        defaultValue: [],
        comment: "Array of amenities"
      },
      flooringTypes: {
        type: Sequelize.JSONB,
        field: "flooring_types",
        allowNull: true,
        defaultValue: [],
        comment: "Array of flooring types"
      },
      smartHomeDevices: {
        type: Sequelize.JSONB,
        field: "smart_home_devices",
        allowNull: true,
        defaultValue: [],
        comment: "Array of smart home devices"
      },
      maintenanceIncludes: {
        type: Sequelize.JSONB,
        field: "maintenance_includes",
        allowNull: true,
        defaultValue: [],
        comment: "Array of maintenance inclusions"
      },
      
      // Boolean Flags
      isGated: {
        type: Sequelize.BOOLEAN,
        field: "is_gated",
        defaultValue: false
      },
      fireSafety: {
        type: Sequelize.BOOLEAN,
        field: "fire_safety",
        defaultValue: false
      },
      hasIntercom: {
        type: Sequelize.BOOLEAN,
        field: "has_intercom",
        defaultValue: false
      },
      petFriendly: {
        type: Sequelize.BOOLEAN,
        field: "pet_friendly",
        defaultValue: false
      },
      hasEmergencyExit: {
        type: Sequelize.BOOLEAN,
        field: "has_emergency_exit",
        defaultValue: false
      },
      
      // RERA & Documents
      reraIds: {
        type: Sequelize.JSONB,
        field: "rera_ids",
        allowNull: true,
        defaultValue: [],
        comment: "Array of RERA IDs"
      },
      documents: {
        type: Sequelize.JSONB,
        field: "documents",
        allowNull: true,
        defaultValue: [],
        comment: "Array of property documents"
      },
      
      // Media
      mediaData: {
        type: Sequelize.JSONB,
        field: "media_data",
        allowNull: true,
        defaultValue: [],
        comment: "Array of property images and videos"
      },
      propertyPlans: {
        type: Sequelize.JSONB,
        field: "property_plans",
        allowNull: true,
        defaultValue: [],
        comment: "Array of property floor plans"
      },
      
      // Additional Details (for any remaining complex data)
      furnishingDetails: {
        type: Sequelize.JSONB,
        field: "furnishing_details",
        allowNull: true,
        comment: "Detailed furnishing information"
      },
      
      // Status
      status: {
        type: Sequelize.STRING(20),
        field: "status",
        defaultValue: 'ACTIVE',
        validate: {
          isIn: [['ACTIVE', 'INACTIVE', 'ARCHIVED']]
        }
      },

      // Virtual fields for formatted date/time
      v_created_date: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatDate(this.property_created_at);
        },
      },
      v_created_time: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatTime(this.property_created_at);
        },
      },
      v_updated_date: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatDate(this.property_updated_at);
        },
      },
      v_updated_time: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatTime(this.property_updated_at);
        },
      },
    }, {
      timestamps: true,
      createdAt: "property_created_at",
      updatedAt: "property_updated_at",
      deletedAt: "property_deleted_at",
      paranoid: true,
      indexes: [
        {
          fields: ['property_name']
        },
        {
          fields: ['project_id']
        },
        {
          fields: ['lat', 'lng']
        },
        {
          name: 'property_location_gist_idx',
          using: 'GIST',
          fields: [{ attribute: 'location', raw: 'location' }]
        },
        {
          fields: ['property_created_at']
        },
        {
          fields: ['city']
        },
        {
          fields: ['locality']
        },
        {
          fields: ['status']
        }
      ],
    });

    return Property;
};

