const {formatDate, formatTime} = require("../utils/dateFormatters");

module.exports = (sequelize, Sequelize) => {
    const ListingDraft = sequelize.define("listing_draft", {
      draftId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: "draft_id",
      },
      userId: {
        type: Sequelize.INTEGER,
        field: "user_id",
        allowNull: false,
        references: {
          model: 'user',
          key: 'user_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      draftDetails: {
        type: Sequelize.JSONB,
        field: "draft_details",
        allowNull: true,
      },
      draftStatus: {
        type: Sequelize.ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED'),
        field: "draft_status",
        defaultValue: 'DRAFT'
      },

      // Virtual fields for formatted date/time
      v_created_date: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatDate(this.draft_created_at);
        },
      },
      v_created_time: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatTime(this.draft_created_at);
        },
      },
      v_updated_date: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatDate(this.draft_updated_at);
        },
      },
      v_updated_time: {
        type: Sequelize.VIRTUAL,
        get() {
          return formatTime(this.draft_updated_at);
        },
      },
    }, {
      timestamps: true,
      createdAt: "draft_created_at",
      updatedAt: "draft_updated_at",
      deletedAt: "draft_deleted_at",
      paranoid: true,
      indexes: [
        {
          fields: ['user_id']
        },
        {
          fields: ['draft_status']
        },
        {
          fields: ['draft_created_at']
        }
      ],
    });

    return ListingDraft;
};
