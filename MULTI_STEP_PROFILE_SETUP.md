# Multi-Step Profile Setup Implementation

## Overview
This document describes the implementation of the multi-step profile setup feature for the Partner Platform. The feature allows users to complete their profile in 4 sequential steps with validation and verification.

## Features Implemented

### Frontend (React)
Location: `partner-platform-dashboard/src/modules/ProfileSetup.jsx`

#### Step 1: Personal Information
- First Name (required)
- Last Name (required)
- Phone Number (required, with format validation)
- Account Type (INDIVIDUAL/AGENT/ORGANIZATION)

#### Step 2: Location Capture
- Browser geolocation API integration
- Automatic address lookup using OpenStreetMap Nominatim API
- Latitude and longitude coordinates capture
- Visual feedback for location status
- Option to recapture location

#### Step 3: Profile Image Upload
- Live camera capture using browser MediaDevices API
- Real-time video preview
- Photo capture with canvas rendering
- Retake option if not satisfied
- Automatic camera cleanup on component unmount
- Image saved as JPEG with 95% quality
- Visual feedback for camera status and errors

#### Step 4: Review & Submit
- Complete profile review
- All captured information displayed
- Submit for verification button
- Verification pending status

### Backend (Node.js/Express)

#### Database Schema Updates
File: `migrations/add-location-profile-image-columns.sql`

New columns added to `platform_user` table:
- `user_latitude` (DECIMAL 10,8) - Latitude coordinate
- `user_longitude` (DECIMAL 11,8) - Longitude coordinate
- `user_address` (TEXT) - Formatted address from geolocation
- `user_profile_image` (VARCHAR 500) - Profile image URL/path
- `verification_status` (ENUM: PENDING/APPROVED/REJECTED) - Profile verification status
- `verification_notes` (TEXT) - Admin notes during verification
- `verified_at` (DATETIME) - Timestamp of verification

#### Entity Updates
File: `src/entity/PlatformUser.entity.js`

Added fields:
```javascript
latitude: Sequelize.DECIMAL(10, 8)
longitude: Sequelize.DECIMAL(11, 8)
address: Sequelize.TEXT
profileImage: Sequelize.STRING(500)
verificationStatus: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED')
verificationNotes: Sequelize.TEXT
verifiedAt: Sequelize.DATE
```

#### Upload Middleware
File: `src/middleware/uploadMiddleware.js`

Features:
- Multer configuration for file uploads
- Image file type validation (JPEG, PNG, GIF, WebP)
- File size limit: 5MB
- Unique filename generation (userId-timestamp-filename)
- Upload directory: `src/uploads/profile-images/`
- Error handling for upload failures

#### Controller Updates
File: `src/controller/User.controller.js`

**Updated `updateUser` function:**
- Accepts multipart/form-data for image upload
- Validates location coordinates (latitude: -90 to 90, longitude: -180 to 180)
- Validates all required fields for profile completion
- Sets `verificationStatus` to 'PENDING' on profile completion
- Stores profile image path relative to server
- Returns comprehensive error messages for validation failures

#### Route Updates
File: `src/routes/user.route.js`

Updated route:
```javascript
router.patch(
  "/partnerUser/update", 
  authMiddleware, 
  uploadProfileImage,
  handleUploadError,
  UserController.updateUser
);
```

#### Server Configuration
File: `server.js`

- Added static file serving for uploaded images
- Route: `/uploads` serves files from `src/uploads/`

#### Auth Status Update
File: `src/routes/auth.route.js`

Added fields to auth status response:
- `profileImage`
- `verificationStatus`
- `latitude`
- `longitude`
- `address`

## API Endpoints

### Update User Profile (Profile Completion)
**Endpoint:** `PATCH /partnerUser/update`

**Headers:**
- `Cookie: accessToken=<token>` (automatically sent by browser)

**Request Body (multipart/form-data):**
```
firstName: string (required)
lastName: string (required)
phone: string (required)
accountType: string (INDIVIDUAL/AGENT/ORGANIZATION)
latitude: number (required, -90 to 90)
longitude: number (required, -180 to 180)
address: string (required)
completeProfile: boolean (true for profile completion)
profileImage: File (required, max 5MB, image formats only)
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Profile submitted for verification successfully",
  "data": {
    "user": {
      "userId": 1,
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "accountType": "INDIVIDUAL",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "address": "New York, NY, USA",
      "profileImage": "/uploads/profile-images/1-1699999999-profile.jpg",
      "verificationStatus": "PENDING",
      "profileCompleted": true
    }
  },
  "meta": {
    "userId": 1,
    "updatedFields": ["firstName", "lastName", "phone", "accountType", "latitude", "longitude", "address", "profileImage", "verificationStatus"],
    "profileCompleted": true,
    "profileImageUploaded": true
  }
}
```

**Error Responses:**

400 - Missing Required Fields:
```json
{
  "success": false,
  "message": "Missing required fields for profile completion: profileImage, location",
  "error": {
    "message": "Missing required fields",
    "code": "VALIDATION_ERROR",
    "source": "updateUser"
  },
  "meta": {
    "missingFields": ["profileImage", "location"]
  }
}
```

400 - Invalid File Type:
```json
{
  "success": false,
  "message": "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.",
  "error": "Invalid file type..."
}
```

400 - File Too Large:
```json
{
  "success": false,
  "message": "File too large. Maximum size is 5MB.",
  "error": "File size exceeds limit"
}
```

## Frontend Components

### Multi-Step Navigation
- Visual step indicator (1-4)
- Progress indication (checkmarks for completed steps)
- Next/Previous navigation
- Step-specific validation

### Form Validation
- Client-side validation for each step
- Real-time error feedback
- Required field indicators
- Format validation for phone numbers

### Location Features
- Browser permission request for geolocation
- Loading state during location capture
- Success/error feedback
- Address display with coordinates
- Retry option for failed captures

### Image Upload Features
- Live camera capture using WebRTC MediaDevices API
- Real-time video preview before capture
- Canvas-based photo capture
- Automatic conversion to JPEG format (95% quality)
- Retake functionality
- Camera permission handling and error feedback
- Automatic camera cleanup on unmount
- Start/Stop/Capture camera controls
- Visual status indicators (camera active, photo captured)

### UI Components Used
- `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription` - Container components
- `Button` - Action buttons
- `Input` - Text inputs
- `Label` - Form labels
- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` - Dropdown
- `Avatar`, `AvatarImage`, `AvatarFallback` - Profile image display
- Icons: `Loader2`, `MapPin`, `Camera`, `CameraOff`, `RefreshCw`, `FileCheck`, `User`

## Setup Instructions

### Backend Setup

1. **Run Database Migration:**
   ```bash
   # Connect to your database and run:
   mysql -u your_user -p your_database < migrations/add-location-profile-image-columns.sql
   ```

2. **Create Upload Directory:**
   ```bash
   mkdir -p src/uploads/profile-images
   ```

3. **Verify Dependencies:**
   - Multer is already installed (v2.0.2)
   - No additional packages needed

4. **Environment Variables:**
   Ensure these are set in your `.env`:
   ```
   FRONTEND_URL=http://localhost:5173
   ACCESS_CONTROL_ALLOW_ORIGIN=http://localhost:5173
   ```

### Frontend Setup

1. **Verify Dependencies:**
   All required UI components should already be in your project under `src/components/ui/`

2. **Environment Variables:**
   Set in `.env`:
   ```
   VITE_BACKEND_URL=http://localhost:3000
   ```

3. **Test the Flow:**
   - Navigate to profile setup page
   - Complete each step sequentially
   - Verify validation works
   - Check image upload
   - Review final submission

## File Structure

```
partner-platform-backend/
├── migrations/
│   └── add-location-profile-image-columns.sql
├── src/
│   ├── controller/
│   │   └── User.controller.js (updated)
│   ├── entity/
│   │   └── PlatformUser.entity.js (updated)
│   ├── middleware/
│   │   └── uploadMiddleware.js (new)
│   ├── routes/
│   │   ├── auth.route.js (updated)
│   │   └── user.route.js (updated)
│   └── uploads/
│       └── profile-images/ (created)
└── server.js (updated)

partner-platform-dashboard/
└── src/
    └── modules/
        └── ProfileSetup.jsx (updated)
```

## Testing Checklist

### Frontend
- [ ] Step 1: All fields validate correctly
- [ ] Step 1: Account type selection works
- [ ] Step 2: Location capture button works
- [ ] Step 2: Location permission handling
- [ ] Step 2: Address display after capture
- [ ] Step 3: Camera permission request works
- [ ] Step 3: Start Camera button activates video feed
- [ ] Step 3: Live video preview displays correctly
- [ ] Step 3: Capture Photo button works
- [ ] Step 3: Photo preview displays after capture
- [ ] Step 3: Retake Photo button restarts camera
- [ ] Step 3: Cancel button stops camera
- [ ] Step 3: Camera cleanup on component unmount
- [ ] Step 3: Error handling for denied permissions
- [ ] Step 4: All information displays correctly
- [ ] Step 4: Captured photo shows in review
- [ ] Step 4: Submit button works
- [ ] Navigation: Next/Previous buttons work
- [ ] Navigation: Step indicator updates correctly
- [ ] Error handling: Network errors display
- [ ] Success: Redirects to home after completion

### Backend
- [ ] Migration runs successfully
- [ ] Upload directory created
- [ ] File upload accepts valid images (JPEG from camera capture)
- [ ] File upload rejects invalid types
- [ ] File upload rejects large files (>5MB)
- [ ] Location validation works (lat/long ranges)
- [ ] Profile completion sets verification status to PENDING
- [ ] Static file serving works for uploaded images
- [ ] Auth status returns new fields
- [ ] Database stores all new fields correctly

## Security Considerations

1. **Camera Access Security:**
   - Browser permission required for camera access
   - Camera automatically stopped after capture
   - Stream cleanup on component unmount
   - No recording, only snapshot capture
   - Images converted to JPEG format client-side

2. **File Upload Security:**
   - File type validation (whitelist approach)
   - File size limits enforced (backend validates uploaded JPEG)
   - Unique filenames prevent overwrites
   - Files stored outside web root initially

2. **Location Data:**
   - User consent required (browser permission)
   - Coordinates validated server-side
   - Address stored for display purposes

3. **Authentication:**
   - All endpoints protected by auth middleware
   - User can only update their own profile
   - JWT tokens used for session management

## Future Enhancements

1. **Camera Features:**
   - Switch between front/back camera on mobile
   - Face detection and centering guides
   - Photo filters and adjustments
   - Multiple photo captures for best selection

2. **Image Processing:**
   - Image compression before storage
   - Thumbnail generation
   - Cloud storage integration (S3, Cloudinary)

2. **Verification Workflow:**
   - Admin panel for profile verification
   - Email notifications for verification status
   - Document upload for additional verification

3. **Location Features:**
   - Multiple address support
   - Address search/autocomplete
   - Map display for location confirmation

4. **UI/UX Improvements:**
   - Save draft functionality
   - Resume incomplete profiles
   - Mobile-optimized design
   - Accessibility improvements

## Troubleshooting

### Common Issues

**Issue: "Camera not accessible"**
- Ensure HTTPS or localhost (camera requires secure context)
- Check browser permissions for camera access
- Verify camera is not being used by another application
- Try different browser if issues persist

**Issue: "Camera stream not displaying"**
- Check browser console for errors
- Verify camera permissions are granted
- Ensure video element is properly rendered
- Check device has a working camera

**Issue: "Captured photo is black/blank"**
- Ensure camera stream is active before capture
- Wait for video feed to fully load
- Check browser compatibility with getUserMedia API
- Verify canvas rendering is working

**Issue: "File upload error"**
- Check upload directory permissions
- Verify multer middleware is properly configured
- Check file size and type

**Issue: "Location not captured"**
- Ensure HTTPS or localhost (geolocation requires secure context)
- Check browser permissions
- Verify OpenStreetMap API is accessible

**Issue: "Profile image not displaying"**
- Check static file serving is configured
- Verify file path in database matches actual file
- Check CORS settings for image serving

**Issue: "Validation errors on submit"**
- Complete all steps before submitting
- Check each field meets requirements
- Review browser console for client errors

## Support

For issues or questions, please refer to:
- Backend logs: Check Winston logs for server errors
- Frontend console: Check browser developer tools
- Database: Verify schema matches migration
