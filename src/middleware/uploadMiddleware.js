const multer = require("multer");
const path = require("path");

// Configure storage - Use memoryStorage to keep file in memory
// The file buffer will be passed directly to the temporal workflow
// No temporary files on disk needed
const storage = multer.memoryStorage();

// File filter to accept only videos
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/webm"];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only MP4, MPEG, MOV, AVI, and WebM videos are allowed."), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos
  },
});

// Middleware for single profile video upload
const uploadProfileVideo = upload.single("profileVideo");

// Middleware for single owner video upload (for business onboarding)
const uploadOwnerVideo = upload.single("ownerVideo");

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Maximum size is 50MB.",
        error: err.message,
      });
    }
    return res.status(400).json({
      success: false,
      message: "File upload error",
      error: err.message,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "Unknown upload error",
      error: err.message,
    });
  }
  next();
};

module.exports = {
  uploadProfileVideo,
  uploadOwnerVideo,
  handleUploadError,
};
