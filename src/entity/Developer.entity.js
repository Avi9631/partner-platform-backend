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
      developerType: {
        type: Sequelize.ENUM('International Developer', 'National Developer', 'Regional Developer'),
        field: "developer_type",
      },
      description: {
        type: Sequelize.TEXT,
        field: "description",
      },
      establishedYear: {
        type: Sequelize.INTEGER,
        field: "established_year",
      },
      registrationNumber: {
        type: Sequelize.STRING(100),
        field: "registration_number",
      },
      
      // Contact Information Fields
      primaryContactEmail: {
        type: Sequelize.STRING(150),
        field: "primary_contact_email",
      },
      primaryContactPhone: {
        type: Sequelize.STRING(20),
        field: "primary_contact_phone",
      },
      socialLinks: {
        type: Sequelize.JSONB,
        field: "social_links",
        defaultValue: [],
        comment: "Array of social media links with type and url"
      },
      
      // Projects & Portfolio Fields
      totalProjectsCompleted: {
        type: Sequelize.INTEGER,
        field: "total_projects_completed",
        defaultValue: 0
      },
      totalProjectsOngoing: {
        type: Sequelize.INTEGER,
        field: "total_projects_ongoing",
        defaultValue: 0
      },
      totalUnitsDelivered: {
        type: Sequelize.INTEGER,
        field: "total_units_delivered",
        defaultValue: 0
      },
      projectTypes: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        field: "project_types",
        defaultValue: [],
        comment: "Array of project types like Residential, Commercial, etc."
      },
      operatingStates: {
        type: Sequelize.ARRAY(Sequelize.STRING),
        field: "operating_states",
        defaultValue: [],
        comment: "Array of states where developer operates"
      },
      verificationStatus: {
        type: Sequelize.ENUM('PENDING', 'AUTOMATED_REVIEW', 'MANUAL_REVIEW', 'APPROVED', 'REJECTED'),
        field: "verification_status",
        defaultValue: 'PENDING'
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
      publishedAt: {
        type: Sequelize.DATE,
        field: "published_at",
      },
      // SEO & Metadata
      slug: {
        type: Sequelize.STRING(300),
        field: "slug",
        unique: true,
        comment: "URL-friendly slug for developer profile"
      },
      metaTitle: {
        type: Sequelize.STRING(200),
        field: "meta_title",
      },
      metaDescription: {
        type: Sequelize.TEXT,
        field: "meta_description",
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
        {
          fields: ['developer_type']
        },
        {
          fields: ['verification_status']
        }
      ]
    });
  
    return Developer;
};



