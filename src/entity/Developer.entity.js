const {formatDate, formatTime} = require("../utils/dateFormatters");

module.exports = (sequelize, Sequelize) => {
    const Developer = sequelize.define("developer", {
      developerId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "developer_id",
      },
      userId: {
        type: Sequelize.INTEGER,
        field: "user_id",
        allowNull: false,
        references: {
          model: 'platform_user',
          key: 'user_id'
        }
      },
      draftId: {
        type: Sequelize.INTEGER,
        field: "draft_id",
        unique: true,
        allowNull: true,
        references: {
          model: 'listing_draft',
          key: 'draft_id'
        },
        comment: "Reference to the draft used to create this developer profile. Each draft can only be published once."
      },
      
      // Basic Information Fields
      developerName: {
        type: Sequelize.STRING(200),
        field: "developer_name",
        allowNull: false
      },

      subscribeForDeveloperPage: {
        type: Sequelize.BOOLEAN,
        field: "developer_subscribed_for_page",
        defaultValue: false
      },
   
 
      verificationNotes: {
        type: Sequelize.TEXT,
        field: "verification_notes",
      },
      verifiedAt: {
        type: Sequelize.DATE,
        field: "verified_at",
      },
      verifiedBy: {
        type: Sequelize.INTEGER,
        field: "verified_by",
        references: {
          model: 'platform_user',
          key: 'user_id'
        }
      },
      
      // Virtual fields for formatted dates
      v_created_date: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatDate(this.developer_created_at);
        },
      },
      v_created_time: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatTime(this.developer_created_at);
        },
      },
      v_updated_date: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatDate(this.developer_updated_at);
        },
      },
      v_updated_time: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatTime(this.developer_updated_at);
        },
      },
    }, {
      timestamps: true,
      createdAt: "developer_created_at",
      updatedAt: "developer_updated_at",
      deletedAt: "developer_deleted_at",
      paranoid: true,
      indexes: [
        {
          fields: ['user_id']
        },
        {
          fields: ['draft_id'],
          unique: true
        },  
      ]
    });
  
    return Developer;
};



