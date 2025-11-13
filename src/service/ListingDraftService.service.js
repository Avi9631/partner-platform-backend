const db = require("../entity");
const ListingDraft = db.ListingDraft;
const Property = db.Property;
const Project = db.Project;
const PlatformUser = db.PlatformUser;

/**
 * Create a new listing draft
 * @param {number} userId - The ID of the user creating the draft
 * @param {object} draftDetails - The draft details (form data)
 * @returns {Promise<object>} The created draft
 */
const createDraft = async (userId) => {
  try {
    const draft = await ListingDraft.create({
      userId: userId,
      draftStatus: 'DRAFT'
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
 * @param {object} draftDetails - The updated draft details
 * @returns {Promise<object>} The updated draft
 */
const updateDraft = async (draftId, userId, draftDetails) => {
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

    await draft.update({
      draftDetails: draftDetails
    });

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
 * @returns {Promise<object>} List of drafts
 */
const getUserDrafts = async (userId) => {
  try {
    const drafts = await ListingDraft.findAll({
      where: {
        userId: userId
      },
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

    const draftDetails = draft.draftDetails;
    let projectId = null;

    // Check if a new property needs to be created
    if (draftDetails.isNewProperty && draftDetails.customPropertyName) {
      // Create a new project with the custom property name
      const newProject = await Project.create({
        projectName: draftDetails.customPropertyName,
        createdBy: userId,
        projectDetails: {
          ownershipType: draftDetails.ownershipType,
          reraIds: draftDetails.reraIds || [],
          ageOfProperty: draftDetails.ageOfProperty,
          possessionStatus: draftDetails.possessionStatus,
          possessionDate: draftDetails.possessionDate,
          createdFromListing: true
        },
        status: 'ACTIVE'
      }, { transaction });

      projectId = newProject.projectId;
    } else if (draftDetails.projectName && draftDetails.projectName !== 'Not Listed') {
      // Find existing project by name
      const existingProject = await Project.findOne({
        where: {
          projectName: draftDetails.projectName
        }
      });

      if (existingProject) {
        projectId = existingProject.projectId;
      }
    }

    // Create the property (listing)
    const property = await Property.create({
      propertyName: draftDetails.customPropertyName || draftDetails.projectName,
      projectId: projectId,
      createdBy: userId,
      propertyDetails: draftDetails,
      status: 'ACTIVE'
    }, { transaction });

    // Update draft status to PUBLISHED
    await draft.update({
      draftStatus: 'PUBLISHED'
    }, { transaction });

    await transaction.commit();

    return {
      success: true,
      data: {
        property: property,
        projectCreated: draftDetails.isNewProperty && projectId !== null
      },
      message: 'Listing submitted successfully'
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
