const { generatePresignedUrls } = require("../utils/s3Upload");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/responseFormatter");

/**
 * Generate multiple presigned URLs for direct S3 upload
 * POST /api/upload/presigned-urls
 * Body: {
 *   folder: string (e.g., 'listing-drafts/images', 'profile/videos'),
 *   count: number (1-50),
 *   contentType: string (optional, e.g., 'image/jpeg', 'image/png'),
 *   bucketName: string (optional)
 * }
 */
const getPresignedUrls = async (req, res) => {
  try {
    const userId = req.user.userId; // From auth middleware
    const { folder, count, contentType, bucketName, expiresIn } = req.body;

    // Validation
    if (!folder) {
      return sendErrorResponse(res, 'Folder path is required', 400);
    }

    if (!count || typeof count !== 'number' || count <= 0) {
      return sendErrorResponse(res, 'Count must be a positive number', 400);
    }

    if (count > 50) {
      return sendErrorResponse(res, 'Cannot generate more than 50 URLs at once', 400);
    }

    // Optional: Validate folder path format
    const allowedFolders = [
      'listing-drafts/images',
      'listing-drafts/videos',
      'listing-drafts/documents',
      'listing-drafts/plans',
      'listing-drafts/room-images',
      'listing/projects/images',
      'listing/projects/videos',
      'listing/projects/legal-docs',
      'profile/images',
      'profile/videos',
      'agency/images',
      'general/images',
      'general/videos',
    ];

    // Check if folder matches allowed patterns (starts with any allowed folder)
    const isValidFolder = allowedFolders.some(allowed => folder.startsWith(allowed));
    if (!isValidFolder) {
      return sendErrorResponse(
        res,
        `Invalid folder path. Allowed folders: ${allowedFolders.join(', ')}`,
        400
      );
    }

    // Generate presigned URLs
    const presignedUrls = await generatePresignedUrls({
      folder,
      count,
      contentType,
      userId,
      bucketName,
      expiresIn: expiresIn || 300, // Default 5 minutes
    });

    return sendSuccessResponse(
      res,
      {
        urls: presignedUrls,
        expiresIn: expiresIn || 300,
        uploadInstructions: {
          method: 'PUT',
          headers: contentType ? { 'Content-Type': contentType } : {},
          note: 'Use the uploadUrl for PUT request with file binary data. After successful upload, use publicUrl to reference the file.',
        },
      },
      'Presigned URLs generated successfully',
      200
    );
  } catch (error) {
    console.error('Error generating presigned URLs:', error);
    return sendErrorResponse(res, error.message || 'Failed to generate presigned URLs', 500);
  }
};

module.exports = {
  getPresignedUrls,
};
