const { s3, defaultBucket } = require("../config/s3.config");
const path = require("path");

// Lazy load uuid to handle ES Module
let uuidv4;
const getUuidv4 = async () => {
  if (!uuidv4) {
    const uuid = await import("uuid");
    uuidv4 = uuid.v4;
  }
  return uuidv4;
};

/**
 * Upload a file to S3 and return the URL
 * @param {Object} params - Upload parameters
 * @param {Buffer} params.fileBuffer - File buffer from multer
 * @param {string} params.fileName - Original file name
 * @param {string} params.mimetype - File mimetype
 * @param {string} params.folder - S3 folder path (e.g., 'listing-drafts/images')
 * @param {number} params.userId - User ID for organizing files
 * @param {string} params.bucketName - Optional bucket name (defaults to defaultBucket)
 * @returns {Promise<{success: boolean, url: string, key: string}>}
 */
async function uploadToS3({ fileBuffer, fileName, mimetype, folder, userId, bucketName }) {
  try {
    if (!fileBuffer || !fileName || !mimetype) {
      throw new Error("Missing required parameters: fileBuffer, fileName, or mimetype");
    }

    // Generate unique filename
    const fileExtension = path.extname(fileName);
    const uuidFunc = await getUuidv4();
    const uniqueFileName = `${uuidFunc()}${fileExtension}`;
    
    // Construct S3 key with folder structure
    const s3Key = `${folder}/${uniqueFileName}`;
    
    // Prepare S3 upload parameters
    const uploadParams = {
      Bucket: bucketName || process.env.S3_LISTING_BUCKET || defaultBucket,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimetype,
      ACL: 'public-read', // Make files publicly accessible
    };
    
    // Upload to S3
    const uploadResult = await s3.upload(uploadParams).promise();
    
    // Construct file URL
    const fileUrl = uploadResult.Location || `${process.env.S3_ENDPOINT}/${uploadParams.Bucket}/${s3Key}`;
    
    return {
      success: true,
      url: fileUrl,
      key: s3Key,
    };
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw error;
  }
}

/**
 * Upload multiple files to S3
 * @param {Object} params - Upload parameters
 * @param {Array} params.files - Array of file objects from multer
 * @param {string} params.folder - S3 folder path
 * @param {number} params.userId - User ID
 * @param {string} params.bucketName - Optional bucket name
 * @returns {Promise<Array<{url: string, key: string, originalName: string}>>}
 */
async function uploadMultipleToS3({ files, folder, userId, bucketName }) {
  try {
    if (!files || files.length === 0) {
      return [];
    }

    const uploadPromises = files.map(file =>
      uploadToS3({
        fileBuffer: file.buffer,
        fileName: file.originalname,
        mimetype: file.mimetype,
        folder,
        userId,
        bucketName,
      }).then(result => ({
        url: result.url,
        key: result.key,
        originalName: file.originalname,
        mimetype: file.mimetype,
      }))
    );

    const uploadedFiles = await Promise.all(uploadPromises);
    return uploadedFiles;
  } catch (error) {
    console.error("Error uploading multiple files to S3:", error);
    throw error;
  }
}

/**
 * Delete a file from S3
 * @param {string} key - S3 object key
 * @param {string} bucketName - Optional bucket name
 * @returns {Promise<boolean>}
 */
async function deleteFromS3(key, bucketName) {
  try {
    const deleteParams = {
      Bucket: bucketName || process.env.S3_LISTING_BUCKET || defaultBucket,
      Key: key,
    };

    await s3.deleteObject(deleteParams).promise();
    return true;
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    throw error;
  }
}

/**
 * Generate presigned URLs for direct upload to S3
 * @param {Object} params - Parameters for generating presigned URLs
 * @param {string} params.folder - S3 folder path (e.g., 'listing-drafts/images')
 * @param {number} params.count - Number of presigned URLs to generate
 * @param {string} params.contentType - Optional content type (e.g., 'image/jpeg', 'image/png')
 * @param {number} params.userId - User ID for organizing files
 * @param {string} params.bucketName - Optional bucket name (defaults to defaultBucket)
 * @param {number} params.expiresIn - Optional expiration time in seconds (default: 300 = 5 minutes)
 * @returns {Promise<Array<{uploadUrl: string, key: string, publicUrl: string}>>}
 */
async function generatePresignedUrls({ folder, count, contentType, userId, bucketName, expiresIn = 300 }) {
  try {
    if (!folder || !count || count <= 0) {
      throw new Error("Missing required parameters: folder and count (count must be > 0)");
    }

    if (count > 50) {
      throw new Error("Cannot generate more than 50 presigned URLs at once");
    }

    const uuidFunc = await getUuidv4();
    const bucket = bucketName || process.env.S3_LISTING_BUCKET || defaultBucket;
    const presignedUrls = [];

    for (let i = 0; i < count; i++) {
      // Generate unique filename with timestamp and UUID
      const timestamp = Date.now();
      const uniqueId = uuidFunc();
      const fileExtension = contentType ? getExtensionFromMimeType(contentType) : '';
      const uniqueFileName = `${timestamp}_${uniqueId}${fileExtension}`;
      
      // Construct S3 key with folder structure
      const s3Key = `${folder}/${uniqueFileName}`;
      
      // Prepare params for presigned URL
      const params = {
        Bucket: bucket,
        Key: s3Key,
        Expires: expiresIn,
        ACL: 'public-read',
      };

      // Add ContentType if specified
      if (contentType) {
        params.ContentType = contentType;
      }

      // Generate presigned URL for PUT operation
      const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
      
      // Construct the public URL that will be accessible after upload
      const publicUrl = process.env.S3_ENDPOINT 
        ? `${process.env.S3_ENDPOINT}/${bucket}/${s3Key}`
        : `https://${bucket}.s3.${process.env.S3_REGION || 'ap-south-1'}.amazonaws.com/${s3Key}`;

      presignedUrls.push({
        uploadUrl,
        key: s3Key,
        publicUrl,
      });
    }

    return presignedUrls;
  } catch (error) {
    console.error("Error generating presigned URLs:", error);
    throw error;
  }
}

/**
 * Helper function to get file extension from MIME type
 * @param {string} mimeType - MIME type (e.g., 'image/jpeg')
 * @returns {string} File extension with dot (e.g., '.jpg')
 */
function getExtensionFromMimeType(mimeType) {
  const mimeMap = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'video/mp4': '.mp4',
    'video/mpeg': '.mpeg',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
    'application/pdf': '.pdf',
  };
  
  return mimeMap[mimeType] || '';
}

module.exports = {
  uploadToS3,
  uploadMultipleToS3,
  deleteFromS3,
  generatePresignedUrls,
};
