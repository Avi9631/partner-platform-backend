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
          model: 'user',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      propertyDetails: {
        type: Sequelize.JSONB,
        field: "property_details",
        allowNull: true,
        comment: "Stores additional property metadata like type, area, etc."
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED'),
        field: "status",
        defaultValue: 'ACTIVE'
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
          fields: ['created_by']
        },
        {
          fields: ['status']
        },
        {
          fields: ['property_created_at']
        }
      ],
    });

    return Property;
};
