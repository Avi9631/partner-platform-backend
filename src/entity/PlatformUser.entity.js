const {formatDate, formatTime} = require("../utils/dateFormatters");
module.exports = (sequelize, Sequelize) => {
    const PlatformUser = sequelize.define("platform_user", {
      userId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "user_id",
      },
      firstName: {
        type: Sequelize.STRING(50),
        field: "user_first_name"
      },
      lastName: {
        type: Sequelize.STRING(50),
        field: "user_last_name"
      },
      nameInitial: {
        type: Sequelize.STRING(2),
        field: "user_name_initial",
      },
      email: {
        type: Sequelize.STRING(60),
        field: "user_email", 
        unique: true,
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING(15),
        field: "user_phone"
      }, 
      accountType: {
        type: Sequelize.ENUM( 'INDIVIDUAL', 'AGENT', 'ORGANIZATION'),
        field: "user_account_type",
        defaultValue: 'INDIVIDUAL'
      },
      userStatus: {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE', 'SUSPENDED'),
        field: "user_status",
        defaultValue: 'ACTIVE'
      },
      lastLoginAt: {
        type: Sequelize.DATE,
        field: "user_last_login_at",
      },
      emailVerifiedAt: {
        type: Sequelize.DATE,
        field: "user_email_verified_at",
      },
      phoneVerifiedAt: {
        type: Sequelize.DATE,
        field: "user_phone_verified_at",
      },
      
      derivedUserName: {
        type: Sequelize.VIRTUAL,
        get() {
          if (!this.firstName && !this.lastName) return null;

          return `${this.firstName} ${this.lastName} `; // Format: dd-MMM-YYYY
        },
      },

      created_date: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatDate(this.user_created_at)

        },
      },
      v_created_time: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatTime(this.user_created_at)

        },
      },

      v_updated_date: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatDate(this.user_updated_at)

        },
      },
      v_updated_time: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatTime(this.user_updated_at)

        },
      },
    } , {
      timestamps: true,
      createdAt: "user_created_at",
      updatedAt: "user_updated_at",
      deletedAt: "user_deleted_at",
      // paranoid: true,
      indexes: [
        {
          fields: ['user_first_name', 'user_last_name']
        },
        {
          fields: ['user_email']
        }, 
        {
          fields: ['user_status']
        }
      ],
    });
    return PlatformUser;
  };

