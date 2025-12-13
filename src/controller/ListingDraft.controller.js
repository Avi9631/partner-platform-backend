const ListingDraftService = require("../service/ListingDraftService.service");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/responseFormatter");
const { uploadMultipleToS3 } = require("../utils/s3Upload");

/**
 * Create a new listing draft
 * POST /api/draft/createListingDraft
 */
const createListingDraft = async (req, res) => {
  try {
    const userId = req.user.userId; // From auth middleware
    const draftType = req.body.draftType || 'PROPERTY';
    const result = await ListingDraftService.createDraft(userId, draftType);

    if (result.success) {
      return sendSuccessResponse(res, result.data, result.message, 201);
    } else {
      return sendErrorResponse(res, result.message, 400);
    }
  } catch (error) {
    console.error('Error in createListingDraft:', error);
    return sendErrorResponse(res, 'Failed to create listing draft', 500);
  }
};

/**
 * Update an existing listing draft
 * PATCH /api/draft/updateListingDraft
 * Supports file uploads for media (images/videos) with metadata embedded in draftData
 * Media keys: mediaData, docMediaData, planMediaData
 */
const updateListingDraft = async (req, res) => {
  try {
    const userId = req.user.userId; // From auth middleware
    let { draftId, draftData, draftType } = req.body;

    if (!draftId) {
      return sendErrorResponse(res, 'Draft ID is required', 400);
    }

    // Parse draftData if it's a string (happens with multipart/form-data)
    if (typeof draftData === 'string') {
      try {
        draftData = JSON.parse(draftData);
      } catch (parseError) {
        return sendErrorResponse(res, 'Invalid draftData JSON format', 400);
      }
    }

    // Define media field mappings (field name -> S3 folder)
    const mediaFieldMappings = {
      'mediaData': 'listing-drafts/media/'+draftId,
      'docMediaData': 'listing-drafts/documents/'+draftId,
      'planMediaData': 'listing-drafts/plans/'+draftId
    };

    // Process each media field type
    for (const [fieldName, s3Folder] of Object.entries(mediaFieldMappings)) {
      const files = req.files && req.files[fieldName] ? req.files[fieldName] : [];
      const existingMetadata = draftData[fieldName] || [];
      
      if (files.length > 0) {
        try {
          const uploadedFiles = await uploadMultipleToS3({
            files: files,
            folder: s3Folder,
            userId: userId,
          });

          // Separate metadata: already uploaded (with URLs) vs new files (without URLs)
          const alreadyUploaded = existingMetadata.filter(item => item.url);
          const newFileMetadata = existingMetadata.filter(item => !item.url);

          // Combine uploaded files with their corresponding metadata
          const newlyProcessedMedia = uploadedFiles.map((file, index) => {
            const metadata = newFileMetadata[index] || {};
            return {
              ...metadata, // Preserve metadata (title, type, category, description)
              url: file.url,
              key: file.key,
              originalName: file.originalName,
              mimetype: file.mimetype,
              uploadedAt: new Date().toISOString(),
            };
          });

          // REPLACE the entire array (not append) with already uploaded + newly uploaded
          draftData[fieldName] = [...alreadyUploaded, ...newlyProcessedMedia];

          console.log(`Processed ${fieldName}: ${alreadyUploaded.length} existing + ${newlyProcessedMedia.length} new = ${draftData[fieldName].length} total`);
        } catch (uploadError) {
          console.error(`Error uploading ${fieldName}:`, uploadError);
          return sendErrorResponse(res, `Failed to upload ${fieldName}`, 500);
        }
      } else if (existingMetadata.length > 0) {
        // No new files, but we have metadata (could be preserving existing uploads)
        // Keep only items with URLs (already uploaded items)
        draftData[fieldName] = existingMetadata.filter(item => item.url);
        console.log(`Preserved ${draftData[fieldName].length} existing ${fieldName} items`);
      }
    }

    const result = await ListingDraftService.updateDraft(draftId, userId, draftData, draftType);

    if (result.success) {
      return sendSuccessResponse(res, result.data, result.message);
    } else {
      return sendErrorResponse(res, result.message, 404);
    }
  } catch (error) {
    console.error('Error in updateListingDraft:', error);
    return sendErrorResponse(res, 'Failed to update listing draft', 500);
  }
};

/**
 * Get a single listing draft by ID
 * GET /api/draft/listingDraft/:id
 */
const getListingDraftById = async (req, res) => {
  try {
    const userId = req.user.userId; // From auth middleware
    const draftId = req.params.id;

    if (!draftId) {
      return sendErrorResponse(res, 'Draft ID is required', 400);
    }

    const result = await ListingDraftService.getDraftById(draftId, userId);

    if (result.success) {
      return sendSuccessResponse(res, result.data);
    } else {
      return sendErrorResponse(res, result.message, 404);
    }
  } catch (error) {
    console.error('Error in getListingDraftById:', error);
    return sendErrorResponse(res, 'Failed to fetch listing draft', 500);
  }
};

/**
 * Get all listing drafts for the authenticated user
 * GET /api/draft/listingDraft
 * Query params: draftType (optional) - Filter by PROPERTY, PG, PROJECT, or DEVELOPER
 */
const getUserListingDrafts = async (req, res) => {
  try {
    const userId = req.user.userId; // From auth middleware
    const { draftType } = req.query; // Optional filter

    const result = await ListingDraftService.getUserDrafts(userId, draftType);

    if (result.success) {
      return sendSuccessResponse(res, result.data, `Found ${result.count} draft(s)`);
    } else {
      return sendErrorResponse(res, result.message, 400);
    }
  } catch (error) {
    console.error('Error in getUserListingDrafts:', error);
    return sendErrorResponse(res, 'Failed to fetch listing drafts', 500);
  }
};

/**
 * Delete a listing draft
 * DELETE /api/draft/deleteListingDraft
 */
const deleteListingDraft = async (req, res) => {
  try {
    const userId = req.user.userId; // From auth middleware
    const { draftId } = req.body;

    if (!draftId) {
      return sendErrorResponse(res, 'Draft ID is required', 400);
    }

    const result = await ListingDraftService.deleteDraft(draftId, userId);

    if (result.success) {
      return sendSuccessResponse(res, null, result.message);
    } else {
      return sendErrorResponse(res, result.message, 404);
    }
  } catch (error) {
    console.error('Error in deleteListingDraft:', error);
    return sendErrorResponse(res, 'Failed to delete listing draft', 500);
  }
};

/**
 * Submit a listing draft (creates property and optionally project)
 * POST /api/draft/submitListingDraft
 */
const submitListingDraft = async (req, res) => {
  try {
    const userId = req.user.userId; // From auth middleware
    const { draftId } = req.body;

    if (!draftId) {
      return sendErrorResponse(res, 'Draft ID is required', 400);
    }

    const result = await ListingDraftService.submitDraft(draftId, userId);

    if (result.success) {
      return sendSuccessResponse(res, result.data, result.message, 201);
    } else {
      return sendErrorResponse(res, result.message, 400);
    }
  } catch (error) {
    console.error('Error in submitListingDraft:', error);
    return sendErrorResponse(res, 'Failed to submit listing draft', 500);
  }
};

module.exports = {
  createListingDraft,
  updateListingDraft,
  getListingDraftById,
  getUserListingDrafts,
  deleteListingDraft,
  submitListingDraft
};
