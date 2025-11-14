const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists for temporary files
const uploadDir = path.join(__dirname, "../uploads/profile-videos");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage - Use diskStorage for temporary file storage
// The temporal workflow will upload to Supabase and clean up temp files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: userId-timestamp-originalname
    const userId = req.user?.userId || "unknown";
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const sanitizedName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, "_");
    cb(null, `${userId}-${timestamp}-${sanitizedName}${ext}`);
  },
});

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
  handleUploadError,
};
