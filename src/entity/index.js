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
db.ListingDraft = require("./ListingDraft.entity.js")(sequelize, Sequelize);
db.Project = require("./Project.entity.js")(sequelize, Sequelize);
db.Property = require("./Property.entity.js")(sequelize, Sequelize);

// Relationships
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

// User has many Projects
db.PlatformUser.hasMany(db.Project, {
    foreignKey: 'created_by',
    as: 'projects'
});

// Project belongs to User
db.Project.belongsTo(db.PlatformUser, {
    foreignKey: 'created_by',
    as: 'creator'
});

// Project has many Properties
db.Project.hasMany(db.Property, {
    foreignKey: 'project_id',
    as: 'properties'
});

// Property belongs to Project
db.Property.belongsTo(db.Project, {
    foreignKey: 'project_id',
    as: 'project'
});

// User has many Properties
db.PlatformUser.hasMany(db.Property, {
    foreignKey: 'created_by',
    as: 'properties'
});

// Property belongs to User
db.Property.belongsTo(db.PlatformUser, {
    foreignKey: 'created_by',
    as: 'creator'
});
 
 
module.exports = db;
