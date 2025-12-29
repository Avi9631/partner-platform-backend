const {formatDate, formatTime} = require("../utils/dateFormatters");

module.exports = (sequelize, Sequelize) => {
    const Project = sequelize.define("project", {
      projectId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "project_id",
      },
      projectName: {
        type: Sequelize.STRING(255),
        field: "project_name",
        allowNull: false,
      },
      // developerId: {
      //   type: Sequelize.INTEGER,
      //   field: "developer_id",
      //   allowNull: true,
      //   references: {
      //     model: 'developer',
      //     key: 'developer_id'
      //   },
      //   onUpdate: 'CASCADE',
      //   onDelete: 'SET NULL'
      // },
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
      projectDetails: {
        type: Sequelize.JSONB,
        field: "project_details",
        allowNull: true,
        comment: "Stores project metadata like location, amenities, etc."
      },
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
          return formatDate(this.project_created_at);
        },
      },
      v_created_time: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatTime(this.project_created_at);
        },
      },
      v_updated_date: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatDate(this.project_updated_at);
        },
      },
      v_updated_time: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatTime(this.project_updated_at);
        },
      },
    }, {
      timestamps: true,
      createdAt: "project_created_at",
      updatedAt: "project_updated_at",
      deletedAt: "project_deleted_at",
      paranoid: true,
      indexes: [
        {
          fields: ['project_name']
        },
        // {
        //   fields: ['developer_id']
        // },
        {
          fields: ['created_by']
        },
        {
          fields: ['status']
        },
        {
          fields: ['lat', 'lng']
        },
        {
          name: 'project_location_gist_idx',
          using: 'GIST',
          fields: [{ attribute: 'location', raw: 'location' }]
        },
        {
          fields: ['project_created_at']
        }
      ],
    });

    return Project;
};
