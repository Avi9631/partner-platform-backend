const {formatDate, formatTime} = require("../utils/dateFormatters");

module.exports = (sequelize, Sequelize) => {
    const Listing = sequelize.define("listing", {
      listingId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "listing_id",
      },
      
      // Property Type
      propertyType: {
        type: Sequelize.STRING(50),
        field: "property_type",
        allowNull: false,
        comment: "apartment, villa, duplex, plot, farmhouse, etc."
      },
      
      // ============ BASIC DETAILS ============
      listingType: {
        type: Sequelize.ENUM('sale', 'rent', 'lease'),
        field: "listing_type",
        allowNull: false,
        defaultValue: 'sale'
      },
      ownershipType: {
        type: Sequelize.ENUM('freehold', 'leasehold', 'poa', 'co_operative'),
        field: "ownership_type",
        allowNull: false,
        defaultValue: 'freehold'
      },
      projectName: {
        type: Sequelize.STRING(255),
        field: "project_name",
        allowNull: true,
      },
      customPropertyName: {
        type: Sequelize.STRING(255),
        field: "custom_property_name",
        allowNull: true,
      },
      isNewProperty: {
        type: Sequelize.BOOLEAN,
        field: "is_new_property",
        defaultValue: false,
      },
      reraIds: {
        type: Sequelize.JSONB,
        field: "rera_ids",
        allowNull: true,
        comment: "Array of RERA registration IDs: [{id: 'RERA123'}]"
      },
      ageOfProperty: {
        type: Sequelize.INTEGER,
        field: "age_of_property",
        allowNull: true,
        comment: "Age in years"
      },
      possessionStatus: {
        type: Sequelize.ENUM('ready', 'under_construction', 'resale'),
        field: "possession_status",
        allowNull: true,
      },
      possessionDate: {
        type: Sequelize.DATEONLY,
        field: "possession_date",
        allowNull: true,
      },
      
      // ============ LOCATION SELECTION ============
      coordinates: {
        type: Sequelize.JSONB,
        field: "coordinates",
        allowNull: true,
        comment: "Geo coordinates: {lat: 28.5355, lng: 77.3910}"
      },
      showMapExact: {
        type: Sequelize.BOOLEAN,
        field: "show_map_exact",
        defaultValue: false,
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
      
      // ============ LOCATION ATTRIBUTES ============
      facing: {
        type: Sequelize.STRING(20),
        field: "facing",
        allowNull: true,
        comment: "east, west, north, south, north-east, etc."
      },
      view: {
        type: Sequelize.STRING(50),
        field: "view",
        allowNull: true,
        comment: "garden_view, road_view, park_view, etc."
      },
      propertyPosition: {
        type: Sequelize.STRING(50),
        field: "property_position",
        allowNull: true,
        comment: "corner, middle, end, standalone, front_facing, rear"
      },
      overlooking: {
        type: Sequelize.JSONB,
        field: "overlooking",
        allowNull: true,
        comment: "Array: ['garden', 'park', 'main_road']"
      },
      
      // ============ GEO TAG ============
      geoTagStatus: {
        type: Sequelize.ENUM('pending', 'success', 'failed'),
        field: "geo_tag_status",
        defaultValue: 'pending',
      },
      geoTagCoordinates: {
        type: Sequelize.JSONB,
        field: "geo_tag_coordinates",
        allowNull: true,
        comment: "User's actual location during geo-tagging: {lat, lng}"
      },
      geoTagDistance: {
        type: Sequelize.DECIMAL(10, 2),
        field: "geo_tag_distance",
        allowNull: true,
        comment: "Distance in meters from property location"
      },
      geoTagTimestamp: {
        type: Sequelize.DATE,
        field: "geo_tag_timestamp",
        allowNull: true,
      },
      
      // ============ BASIC CONFIGURATION (Building Type) ============
      bedrooms: {
        type: Sequelize.STRING(10),
        field: "bedrooms",
        allowNull: true,
        comment: "1, 2, 3, 4, 5, 6+"
      },
      bathrooms: {
        type: Sequelize.STRING(10),
        field: "bathrooms",
        allowNull: true,
        comment: "1, 2, 3, 4, 5, 6+"
      },
      additionalRooms: {
        type: Sequelize.JSONB,
        field: "additional_rooms",
        allowNull: true,
        comment: "Array: [{id, type: 'balcony', count: '2'}]"
      },
      roomDimensions: {
        type: Sequelize.JSONB,
        field: "room_dimensions",
        allowNull: true,
        comment: "Array: [{id, roomName, length, width, unit}]"
      },
      
      // ============ AREA DETAILS (Building Type) ============
      carpetArea: {
        type: Sequelize.DECIMAL(10, 2),
        field: "carpet_area",
        allowNull: true,
        comment: "Area in square feet"
      },
      superArea: {
        type: Sequelize.DECIMAL(10, 2),
        field: "super_area",
        allowNull: true,
        comment: "Area in square feet"
      },
      measurementMethod: {
        type: Sequelize.STRING(50),
        field: "measurement_method",
        allowNull: true,
        comment: "rera_verified, self_measured, architect_certified, etc."
      },
      areaConfig: {
        type: Sequelize.JSONB,
        field: "area_config",
        allowNull: true,
        comment: "Array: [{type: 'terrace', value: '200'}]"
      },
      builtUpToCarpetRatio: {
        type: Sequelize.DECIMAL(5, 2),
        field: "built_up_to_carpet_ratio",
        allowNull: true,
      },
      
      // ============ FLOOR DETAILS (Building Type) ============
      floorNumber: {
        type: Sequelize.INTEGER,
        field: "floor_number",
        allowNull: true,
      },
      totalFloors: {
        type: Sequelize.INTEGER,
        field: "total_floors",
        allowNull: true,
      },
      towerName: {
        type: Sequelize.STRING(100),
        field: "tower_name",
        allowNull: true,
      },
      unitNumber: {
        type: Sequelize.STRING(50),
        field: "unit_number",
        allowNull: true,
      },
      isUnitNumberPrivate: {
        type: Sequelize.BOOLEAN,
        field: "is_unit_number_private",
        defaultValue: false,
      },
      liftAvailable: {
        type: Sequelize.BOOLEAN,
        field: "lift_available",
        defaultValue: false,
      },
      fireExitProximity: {
        type: Sequelize.STRING(50),
        field: "fire_exit_proximity",
        allowNull: true,
        comment: "very_near, near, moderate, far, not_available"
      },
      hasEmergencyExit: {
        type: Sequelize.BOOLEAN,
        field: "has_emergency_exit",
        defaultValue: false,
      },
      staircaseType: {
        type: Sequelize.STRING(50),
        field: "staircase_type",
        allowNull: true,
        comment: "common, private, both, none"
      },
      hasIntercom: {
        type: Sequelize.BOOLEAN,
        field: "has_intercom",
        defaultValue: false,
      },
      
      // ============ FURNISHING (Building Type) ============
      furnishingStatus: {
        type: Sequelize.ENUM('unfurnished', 'semi', 'fully'),
        field: "furnishing_status",
        defaultValue: 'unfurnished',
      },
      furnishingDetails: {
        type: Sequelize.JSONB,
        field: "furnishing_details",
        allowNull: true,
        comment: "Object: {wardrobe: true, ac: true, ...}"
      },
      flooringTypes: {
        type: Sequelize.JSONB,
        field: "flooring_types",
        allowNull: true,
        comment: "Array: ['Vitrified', 'Marble', 'Wooden']"
      },
      smartHomeDevices: {
        type: Sequelize.JSONB,
        field: "smart_home_devices",
        allowNull: true,
        comment: "Array: ['smart_door_lock', 'smart_lights']"
      },
      furnitureCondition: {
        type: Sequelize.STRING(50),
        field: "furniture_condition",
        allowNull: true,
        comment: "new, excellent, good, fair, needs_repair, not_applicable"
      },
      
      // ============ PARKING & UTILITIES (Building Type) ============
      coveredParking: {
        type: Sequelize.INTEGER,
        field: "covered_parking",
        defaultValue: 0,
      },
      openParking: {
        type: Sequelize.INTEGER,
        field: "open_parking",
        defaultValue: 0,
      },
      powerBackup: {
        type: Sequelize.ENUM('none', 'partial', 'full'),
        field: "power_backup",
        defaultValue: 'none',
      },
      evChargingType: {
        type: Sequelize.STRING(50),
        field: "ev_charging_type",
        allowNull: true,
        comment: "none, ac_slow, dc_fast, both"
      },
      evChargingPoints: {
        type: Sequelize.INTEGER,
        field: "ev_charging_points",
        allowNull: true,
      },
      hasVisitorParking: {
        type: Sequelize.BOOLEAN,
        field: "has_visitor_parking",
        defaultValue: false,
      },
      visitorParkingSpaces: {
        type: Sequelize.INTEGER,
        field: "visitor_parking_spaces",
        allowNull: true,
      },
      parkingType: {
        type: Sequelize.STRING(50),
        field: "parking_type",
        allowNull: true,
        comment: "reserved, shared, first_come"
      },
      parkingSecurityType: {
        type: Sequelize.STRING(50),
        field: "parking_security_type",
        allowNull: true,
        comment: "guarded, cctv, gated, multiple, none"
      },
      
      // ============ AMENITIES (Building Type) ============
      features: {
        type: Sequelize.JSONB,
        field: "features",
        allowNull: true,
        comment: "Property-level features: ['gym', 'swimming_pool', 'clubhouse']"
      },
      amenities: {
        type: Sequelize.JSONB,
        field: "amenities",
        allowNull: true,
        comment: "Unit-level amenities: ['air_conditioning', 'modular_kitchen']"
      },
      isGated: {
        type: Sequelize.BOOLEAN,
        field: "is_gated",
        defaultValue: false,
      },
      fireSafety: {
        type: Sequelize.BOOLEAN,
        field: "fire_safety",
        defaultValue: false,
      },
      petFriendly: {
        type: Sequelize.BOOLEAN,
        field: "pet_friendly",
        defaultValue: false,
      },
      
      // ============ LAND ATTRIBUTES (Land Type) ============
      plotArea: {
        type: Sequelize.DECIMAL(10, 2),
        field: "plot_area",
        allowNull: true,
      },
      areaUnit: {
        type: Sequelize.STRING(20),
        field: "area_unit",
        allowNull: true,
        comment: "sqft, sqm, acre, bigha, kanal, gaj"
      },
      plotDimension: {
        type: Sequelize.STRING(100),
        field: "plot_dimension",
        allowNull: true,
        comment: "e.g., '50 x 50 feet'"
      },
      landUse: {
        type: Sequelize.STRING(50),
        field: "land_use",
        allowNull: true,
        comment: "residential, commercial, agricultural, industrial"
      },
      roadWidth: {
        type: Sequelize.DECIMAL(10, 2),
        field: "road_width",
        allowNull: true,
        comment: "Width in feet"
      },
      terrainLevel: {
        type: Sequelize.STRING(50),
        field: "terrain_level",
        allowNull: true,
        comment: "flat, elevated, sloped"
      },
      soilType: {
        type: Sequelize.STRING(50),
        field: "soil_type",
        allowNull: true,
        comment: "black, red, sandy, clay, loamy"
      },
      fencing: {
        type: Sequelize.BOOLEAN,
        field: "fencing",
        defaultValue: false,
      },
      irrigationSource: {
        type: Sequelize.STRING(50),
        field: "irrigation_source",
        allowNull: true,
        comment: "borewell, canal, river, well, drip_irrigation, no_irrigation"
      },
      
      // ============ SUITABLE FOR (Rent/Lease) ============
      suitableFor: {
        type: Sequelize.JSONB,
        field: "suitable_for",
        allowNull: true,
        comment: "Array: ['family', 'bachelors', 'company', 'students']"
      },
      
      // ============ PRICING ============
      pricing: {
        type: Sequelize.JSONB,
        field: "pricing",
        allowNull: true,
        comment: "Array: [{type: 'asking_price', value: '5000000', unit: 'total'}]"
      },
      isPriceNegotiable: {
        type: Sequelize.BOOLEAN,
        field: "is_price_negotiable",
        defaultValue: false,
      },
      availableFrom: {
        type: Sequelize.DATEONLY,
        field: "available_from",
        allowNull: true,
      },
      
      // ============ LISTING INFO ============
      title: {
        type: Sequelize.STRING(500),
        field: "title",
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        field: "description",
        allowNull: true,
      },
      
      // ============ MEDIA ============
      mediaData: {
        type: Sequelize.JSONB,
        field: "media_data",
        allowNull: true,
        comment: "Array of media objects: [{id, file, preview, title, category, description, type, docType}]"
      },
      
      // ============ DOCUMENTS ============
      documents: {
        type: Sequelize.JSONB,
        field: "documents",
        allowNull: true,
        comment: "Array of document objects: [{id, fileName, fileSize, fileType, category, title, description, docType, uploadedAt}]"
      },
      
      // ============ PROPERTY PLANS ============
      propertyPlans: {
        type: Sequelize.JSONB,
        field: "property_plans",
        allowNull: true,
        comment: "Array of floor plan objects: [{id, fileName, fileSize, fileType, preview, category, title, description, docType, uploadedAt}]"
      },
      
      // ============ METADATA ============
      status: {
        type: Sequelize.ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE', 'ARCHIVED', 'SOLD', 'RENTED'),
        field: "status",
        defaultValue: 'DRAFT',
      },
      createdBy: {
        type: Sequelize.INTEGER,
        field: "created_by",
        allowNull: false,
        references: {
          model: 'user',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      approvedBy: {
        type: Sequelize.INTEGER,
        field: "approved_by",
        allowNull: true,
        references: {
          model: 'user',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      approvedAt: {
        type: Sequelize.DATE,
        field: "approved_at",
        allowNull: true,
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        field: "rejection_reason",
        allowNull: true,
      },
      viewCount: {
        type: Sequelize.INTEGER,
        field: "view_count",
        defaultValue: 0,
      },
      contactCount: {
        type: Sequelize.INTEGER,
        field: "contact_count",
        defaultValue: 0,
      },
      isFeatured: {
        type: Sequelize.BOOLEAN,
        field: "is_featured",
        defaultValue: false,
      },
      featuredUntil: {
        type: Sequelize.DATE,
        field: "featured_until",
        allowNull: true,
      },
      
      // Virtual fields for formatted date/time
      v_created_date: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatDate(this.listing_created_at);
        },
      },
      v_created_time: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatTime(this.listing_created_at);
        },
      },
      v_updated_date: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatDate(this.listing_updated_at);
        },
      },
      v_updated_time: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatTime(this.listing_updated_at);
        },
      },
      v_approved_date: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatDate(this.approvedAt);
        },
      },
      v_approved_time: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatTime(this.approvedAt);
        },
      },
    }, {
      timestamps: true,
      createdAt: "listing_created_at",
      updatedAt: "listing_updated_at",
      deletedAt: "listing_deleted_at",
      paranoid: true,
      indexes: [
        // Primary search indexes
        {
          fields: ['property_type']
        },
        {
          fields: ['listing_type']
        },
        {
          fields: ['status']
        },
        {
          fields: ['city']
        },
        {
          fields: ['locality']
        },
        {
          fields: ['created_by']
        },
        // Pricing and area indexes
        {
          fields: ['carpet_area']
        },
        {
          fields: ['super_area']
        },
        {
          fields: ['plot_area']
        },
        // Configuration indexes
        {
          fields: ['bedrooms']
        },
        {
          fields: ['bathrooms']
        },
        // Date indexes
        {
          fields: ['listing_created_at']
        },
        {
          fields: ['available_from']
        },
        {
          fields: ['approved_at']
        },
        // Feature flags
        {
          fields: ['is_featured']
        },
        {
          fields: ['featured_until']
        },
        // Composite indexes for common queries
        {
          fields: ['property_type', 'listing_type', 'status']
        },
        {
          fields: ['city', 'locality', 'status']
        },
        {
          fields: ['bedrooms', 'bathrooms', 'status']
        },
        {
          fields: ['status', 'is_featured', 'listing_created_at']
        },
        // JSONB GIN indexes for array/object searches
        {
          fields: ['features'],
          using: 'gin'
        },
        {
          fields: ['amenities'],
          using: 'gin'
        },
        {
          fields: ['coordinates'],
          using: 'gin'
        },
      ],
    });

    return Listing;
};
