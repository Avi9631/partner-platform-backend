const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
    host: dbConfig.HOST, 
    dialect: dbConfig.dialect, 
    // operatorsAliases: false, // Removed - deprecated in v5+
    logging: false,
    port: dbConfig.port,
    dialectOptions: dbConfig.dialectOptions,
    pool: {
        max: dbConfig.pool.max, min: dbConfig.pool.min, acquire: dbConfig.pool.acquire, idle: dbConfig.pool.idle,
    }, 
    define: {
        freezeTableName: true, // Applies to all models
        timestamps: true,
    },
});

const db = {};


db.Sequelize = Sequelize;
db.sequelize = sequelize;


// Entities
db.PlatformUser = require("./PlatformUser.entity.js")(sequelize, Sequelize);
db.PartnerBusiness = require("./PartnerBusiness.entity.js")(sequelize, Sequelize);
db.ListingDraft = require("./ListingDraft.entity.js")(sequelize, Sequelize);
db.Listing = require("./Listing.entity.js")(sequelize, Sequelize);
 
// Relationships
// User has one PartnerBusiness (for BUSINESS account type)
db.PlatformUser.hasOne(db.PartnerBusiness, {
    foreignKey: 'user_id',
    as: 'business'
});

// PartnerBusiness belongs to User
db.PartnerBusiness.belongsTo(db.PlatformUser, {
    foreignKey: 'user_id',
    as: 'user'
});

// User has many ListingDrafts
db.PlatformUser.hasMany(db.ListingDraft, {
    foreignKey: 'user_id',
    as: 'listingDrafts'
});

// ListingDraft belongs to User
db.ListingDraft.belongsTo(db.PlatformUser, {
    foreignKey: 'user_id',
    as: 'user'
});

// User has many Listings
db.PlatformUser.hasMany(db.Listing, {
    foreignKey: 'created_by',
    as: 'listings'
});

// Listing belongs to User (creator)
db.Listing.belongsTo(db.PlatformUser, {
    foreignKey: 'created_by',
    as: 'creator'
});

// Listing belongs to User (approver)
db.Listing.belongsTo(db.PlatformUser, {
    foreignKey: 'approved_by',
    as: 'approver'
});
 
 
 
module.exports = db;
