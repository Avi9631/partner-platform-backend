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
          model: 'user',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      projectDetails: {
        type: Sequelize.JSONB,
        field: "project_details",
        allowNull: true,
        comment: "Stores project metadata like location, amenities, etc."
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
          fields: ['project_created_at']
        }
      ],
    });

    return Project;
};
