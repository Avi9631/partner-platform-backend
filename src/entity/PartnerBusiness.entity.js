const {formatDate, formatTime} = require("../utils/dateFormatters");

module.exports = (sequelize, Sequelize) => {
    const PartnerBusiness = sequelize.define("partner_business", {
      businessId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "business_id",
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
      businessName: {
        type: Sequelize.STRING(200),
        field: "business_name",
        allowNull: false
      },
      registrationNumber: {
        type: Sequelize.STRING(100),
        field: "registration_number",
      },
      businessAddress: {
        type: Sequelize.TEXT,
        field: "business_address",
        allowNull: false
      },
      businessEmail: {
        type: Sequelize.STRING(100),
        field: "business_email",
        allowNull: false
      },
      businessPhone: {
        type: Sequelize.JSONB,
        field: "business_phone",
      },
      businessVerification: {
        type: Sequelize.TEXT,
        field: "business_verification",
        comment: "URL to the owner verification video stored in Supabase/S3"
      },
      verificationStatus: {
        type: Sequelize.ENUM('PENDING', 'AUTOMATED_REVIEW' , 'MANUAL_REVIEW' ,  'APPROVED', 'REJECTED'),
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
      },
      
      // Virtual field for business name initials
      nameInitial: {
        type: Sequelize.VIRTUAL,
        get() {
          if (!this.businessName) return null;
          
          const trimmedName = this.businessName.trim();
          
          // If no spaces, take first 2 characters
          if (!trimmedName.includes(" ")) {
            return trimmedName.slice(0, 2).toUpperCase();
          }
          
          // If has spaces, take first letter of first 2 words
          const words = trimmedName.split(" ").filter((word) => word.length > 0);
          const initials = words.map((word) => word.charAt(0).toUpperCase()).join("");
          
          return initials.slice(0, 2);
        },
      },
      
      // Virtual fields for formatted dates
      created_date: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatDate(this.business_created_at);
        },
      },
      v_created_time: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatTime(this.business_created_at);
        },
      },
      v_updated_date: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatDate(this.business_updated_at);
        },
      },
      v_updated_time: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatTime(this.business_updated_at);
        },
      },
    }, {
      timestamps: true,
      createdAt: "business_created_at",
      updatedAt: "business_updated_at",
      deletedAt: "business_deleted_at",
      paranoid: true,
      indexes: [
        {
          fields: ['user_id']
        },
        {
          fields: ['business_name']
        },
        {
          fields: ['verification_status']
        }
      ],
    });
    
    return PartnerBusiness;
};
