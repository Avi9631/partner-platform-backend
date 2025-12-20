const db = require("../entity");
const ListingDraft = db.ListingDraft;
const Property = db.Property;
const Project = db.Project;
const PlatformUser = db.PlatformUser;

/**
 * Create a new listing draft
 * @param {number} userId - The ID of the user creating the draft
 * @param {object} draftData - The draft details (form data)
 * @returns {Promise<object>} The created draft
 */
const createDraft = async (userId, draftType) => {
  try {
    const draft = await ListingDraft.create({
      userId: userId,
      draftStatus: 'DRAFT',
      draftType: draftType,
    });

    return {
      success: true,
      data: draft,
      message: 'Draft created successfully'
    };
  } catch (error) {
    console.error('Error creating draft:', error);
    throw error;
  }
};

/**
 * Update an existing listing draft
 * @param {number} draftId - The ID of the draft to update
 * @param {number} userId - The ID of the user (for authorization)
 * @param {object} draftData - The updated draft details (can include media URLs)
 * @param {string} draftType - Optional draft type to update (PROPERTY, PG, PROJECT, DEVELOPER)
 * @returns {Promise<object>} The updated draft
 */
const updateDraft = async (draftId, userId, draftData, draftType) => {
  try {
    const draft = await ListingDraft.findOne({
      where: {
        draftId: draftId,
        userId: userId
      }
    });

    if (!draft) {
      return {
        success: false,
        message: 'Draft not found or unauthorized'
      };
    }
 
    draft.draftData = draftData

    await draft.save();

    return {
      success: true,
      data: draft,
      message: 'Draft updated successfully'
    };
  } catch (error) {
    console.error('Error updating draft:', error);
    throw error;
  }
};

/**
 * Get a single draft by ID
 * @param {number} draftId - The ID of the draft
 * @param {number} userId - The ID of the user (for authorization)
 * @returns {Promise<object>} The draft
 */
const getDraftById = async (draftId, userId) => {
  try {
    const draft = await ListingDraft.findOne({
      where: {
        draftId: draftId,
        userId: userId
      }
    });

    if (!draft) {
      return {
        success: false,
        message: 'Draft not found or unauthorized'
      };
    }

    return {
      success: true,
      data: draft
    };
  } catch (error) {
    console.error('Error fetching draft:', error);
    throw error;
  }
};

/**
 * Get all drafts for a user
 * @param {number} userId - The ID of the user
 * @param {string} draftType - Optional filter by draft type (PROPERTY, PG, PROJECT, DEVELOPER)
 * @returns {Promise<object>} List of drafts
 */
const getUserDrafts = async (userId, draftType) => {
  try {
    const whereClause = {
      userId: userId
    };

    // Add draftType filter if provided
    if (draftType) {
      whereClause.draftType = draftType;
    }

    const drafts = await ListingDraft.findAll({
      where: whereClause,
      order: [['draft_created_at', 'DESC']]
    });

    return {
      success: true,
      data: drafts,
      count: drafts.length
    };
  } catch (error) {
    console.error('Error fetching user drafts:', error);
    throw error;
  }
};

/**
 * Delete a draft
 * @param {number} draftId - The ID of the draft to delete
 * @param {number} userId - The ID of the user (for authorization)
 * @returns {Promise<object>} Success status
 */
const deleteDraft = async (draftId, userId) => {
  try {
    const draft = await ListingDraft.findOne({
      where: {
        draftId: draftId,
        userId: userId
      }
    });

    if (!draft) {
      return {
        success: false,
        message: 'Draft not found or unauthorized'
      };
    }

    await draft.destroy();

    return {
      success: true,
      message: 'Draft deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting draft:', error);
    throw error;
  }
};

/**
 * Submit a listing draft (create property and optionally project)
 * @param {number} draftId - The ID of the draft to submit
 * @param {number} userId - The ID of the user
 * @returns {Promise<object>} The created property and project (if applicable)
 */
const submitDraft = async (draftId, userId) => {
  const transaction = await db.sequelize.transaction();

  try {
    // Fetch the draft
    const draft = await ListingDraft.findOne({
      where: {
        draftId: draftId,
        userId: userId
      }
    });

    if (!draft) {
      return {
        success: false,
        message: 'Draft not found or unauthorized'
      };
    }

    const draftData = draft.draftData;
    const draftType = draft.draftType;
    let projectId = null;
    let result = {};

    // Handle different draft types
    switch (draftType) {
      case 'PROPERTY':
      case 'PG':
        // Check if a new property needs to be created
        if (draftData.isNewProperty && draftData.customPropertyName) {
          // Create a new project with the custom property name
          const newProject = await Project.create({
            projectName: draftData.customPropertyName,
            createdBy: userId,
            projectDetails: {
              ownershipType: draftData.ownershipType,
              reraIds: draftData.reraIds || [],
              ageOfProperty: draftData.ageOfProperty,
              possessionStatus: draftData.possessionStatus,
              possessionDate: draftData.possessionDate,
              createdFromListing: true
            },
            status: 'ACTIVE'
          }, { transaction });

          projectId = newProject.projectId;
        } else if (draftData.projectName && draftData.projectName !== 'Not Listed') {
          // Find existing project by name
          const existingProject = await Project.findOne({
            where: {
              projectName: draftData.projectName
            }
          });

          if (existingProject) {
            projectId = existingProject.projectId;
          }
        }

        // Create the property (listing)
        const property = await Property.create({
          propertyName: draftData.customPropertyName || draftData.projectName,
          projectId: projectId,
          createdBy: userId,
          propertyDetails: draftData,
          status: 'ACTIVE'
        }, { transaction });

        result = {
          property: property,
          projectCreated: draftData.isNewProperty && projectId !== null
        };
        break;

      case 'PROJECT':
        // Create a new project
        const newProjectDirect = await Project.create({
          projectName: draftData.projectName,
          createdBy: userId,
          projectDetails: draftData,
          status: 'ACTIVE'
        }, { transaction });

        result = {
          project: newProjectDirect
        };
        break;

      case 'DEVELOPER':
        // Handle developer creation (if Developer entity exists)
        // For now, store in draftData or create appropriate entity
        result = {
          developer: draftData,
          message: 'Developer draft submitted (entity creation pending)'
        };
        break;

      default:
        throw new Error(`Unknown draft type: ${draftType}`);
    }

    // Update draft status to PUBLISHED
    await draft.update({
      draftStatus: 'PUBLISHED'
    }, { transaction });

    await transaction.commit();

    return {
      success: true,
      data: result,
      message: `${draftType} listing submitted successfully`
    };
  } catch (error) {
    await transaction.rollback();
    console.error('Error submitting draft:', error);
    throw error;
  }
};

module.exports = {
  createDraft,
  updateDraft,
  getDraftById,
  getUserDrafts,
  deleteDraft,
  submitDraft
};
