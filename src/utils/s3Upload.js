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

module.exports = {
  uploadToS3,
  uploadMultipleToS3,
  deleteFromS3,
};
