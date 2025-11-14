# Partner User Onboarding Temporal Workflow Implementation

## Overview

This implementation provides a complete temporal workflow solution for partner user profile completion and verification. The workflow handles profile validation, video upload to Supabase Storage (via S3 protocol), and database updates asynchronously.

## Architecture

### Flow Diagram

```
Client Request (PATCH /partnerUser/update with completeProfile=true)
    ↓
[Authentication Middleware] → Verify JWT token
    ↓
[Upload Middleware] → Store video temporarily to disk
    ↓
[User Controller] → Validate basic requirements
    ↓
START Temporal Workflow: partnerUserOnboarding
    ↓
Return HTTP 202 (Accepted) immediately
    ↓
[Background Processing - Temporal Workflow]
    ↓
Activity 1: validateProfileData
    ├─ Validate firstName, lastName, phone
    ├─ Validate latitude, longitude, address
    ├─ Validate accountType
    └─ Check video file exists
    ↓
Activity 2: uploadVideoToSupabase
    ├─ Read video file from temp storage
    ├─ Upload to Supabase using S3 SDK
    ├─ Generate unique S3 key: partner-profiles/{userId}/verification-video-{timestamp}.ext
    └─ Return video URL
    ↓
Activity 3: updatePartnerUser
    ├─ Update platform_user table
    ├─ Set profileVideo URL
    ├─ Set profileCompleted = true
    ├─ Set userStatus = 'ACTIVE'
    ├─ Set verificationStatus = 'PENDING'
    └─ Clean up temp video file
    ↓
Activity 4: sendOnboardingNotification
    └─ Send email notification about submission
    ↓
Workflow Complete ✓
```

## Components

### 1. Database Migration

**File**: `migrations/add-profile-video-column.sql`

```sql
ALTER TABLE platform_user 
ADD COLUMN user_profile_video VARCHAR(500) NULL;
```

### 2. Entity Update

**File**: `src/entity/PlatformUser.entity.js`

Added `profileVideo` field:
```javascript
profileVideo: {
  type: Sequelize.STRING(500),
  field: "user_profile_video",
}
```

### 3. Temporal Workflow

**File**: `src/temporal/workflows/user/partnerOnboarding.workflow.js`

**Workflow Name**: `partnerUserOnboarding`

**Input Parameters**:
```javascript
{
  userId: number,
  email: string,
  profileData: {
    firstName: string,
    lastName: string,
    phone: string,
    latitude: number,
    longitude: number,
    address: string,
    accountType?: 'INDIVIDUAL' | 'AGENT' | 'ORGANIZATION'
  },
  videoPath: string,
  originalFilename: string
}
```

**Output**:
```javascript
{
  success: boolean,
  userId: number,
  message: string,
  data?: {
    profileCompleted: boolean,
    verificationStatus: string,
    videoUrl: string,
    user: Object
  },
  error?: string
}
```

### 4. Activities

**File**: `src/temporal/activities/user/partnerOnboarding.activities.js`

#### Activity 1: `validateProfileData`
- Validates all required profile fields
- Checks data types and formats
- Returns validation errors if any

#### Activity 2: `uploadVideoToSupabase`
- Reads video file from temporary storage
- Uploads to Supabase Storage using S3 SDK
- Stores at path: `partner-profiles/{userId}/verification-video-{timestamp}.{ext}`
- Returns public/signed URL
- Cleans up temporary file

#### Activity 3: `updatePartnerUser`
- Updates `platform_user` table with all profile data
- Sets `user_profile_video` with Supabase URL
- Sets `profile_completed = true`
- Sets `user_status = 'ACTIVE'`
- Sets `verification_status = 'PENDING'`
- Generates user initials

#### Activity 4: `sendOnboardingNotification`
- Sends email notification to user
- Includes next steps and timeline
- Non-blocking (doesn't fail workflow if email fails)

### 5. Controller Update

**File**: `src/controller/User.controller.js`

**Key Changes**:
- Detects `completeProfile=true` flag
- Validates required fields before starting workflow
- Starts temporal workflow asynchronously
- Returns HTTP 202 (Accepted) immediately
- Provides workflow ID for tracking
- Falls back to regular update for non-completion updates

**Response for Profile Completion**:
```javascript
{
  success: true,
  message: "Profile submitted for verification. Processing in progress.",
  data: {
    workflowId: "partner-onboarding-123-1699999999999",
    status: "processing",
    message: "Your profile is being processed..."
  },
  meta: {
    userId: 123,
    profileCompleted: true,
    workflowStarted: true
  }
}
```

## Configuration

### Environment Variables Required

```env
# Supabase/S3 Configuration
S3_ENDPOINT=https://your-project.supabase.co/storage/v1/s3
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_REGION=ap-south-1
S3_DEFAULT_BUCKET=partner-videos

# Temporal Configuration
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=partner-platform-queue

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@partner-platform.com
```

### Workflow Timeouts

- **Activity Timeout**: 5 minutes (for video upload)
- **Workflow Timeout**: 30 minutes
- **Retry Policy**: Standard (3 attempts with exponential backoff)

## API Usage

### Endpoint: `PATCH /partnerUser/update`

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Form Data**:
```
firstName: John
lastName: Doe
phone: +1234567890
latitude: 40.7128
longitude: -74.0060
address: 123 Main St, New York, NY
accountType: AGENT
completeProfile: true
profileVideo: <video_file> (max 50MB)
```

**Success Response (202 Accepted)**:
```json
{
  "success": true,
  "message": "Profile submitted for verification. Processing in progress.",
  "data": {
    "workflowId": "partner-onboarding-123-1699999999999",
    "status": "processing",
    "message": "Your profile is being processed. You will receive an email once verification is complete."
  },
  "meta": {
    "userId": 123,
    "profileCompleted": true,
    "workflowStarted": true
  }
}
```

## Error Handling

### Validation Errors (400)
- Missing required fields
- Invalid phone format
- Invalid coordinates
- Invalid account type
- Video file too large (>50MB)

### Workflow Errors (500)
- Failed to start temporal workflow
- S3 upload failure
- Database update failure

### Activity Retries
All activities automatically retry on failure:
- Initial interval: 1 second
- Maximum interval: 30 seconds
- Backoff coefficient: 2x
- Maximum attempts: 3

## Monitoring

### Check Workflow Status

```javascript
const { getWorkflowHandle } = require('./utils/temporalClient');

async function checkStatus(workflowId) {
  const handle = await getWorkflowHandle(workflowId);
  const description = await handle.describe();
  
  console.log('Status:', description.status.name);
  console.log('Start Time:', description.startTime);
}
```

### Temporal UI

Access Temporal Web UI at `http://localhost:8233` to monitor:
- Workflow execution status
- Activity success/failure
- Retry attempts
- Execution history
- Error details

## Database Schema

### platform_user Table Updates

```sql
-- New column
user_profile_video VARCHAR(500) NULL

-- Existing columns used
profile_completed BOOLEAN DEFAULT FALSE
user_status ENUM('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE', 'SUSPENDED')
verification_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING'
```

## Testing

### Manual Test

1. Start Temporal server
2. Start worker: `npm run worker`
3. Start application: `npm start`
4. Make API request with all required fields
5. Check response for workflow ID
6. Monitor workflow in Temporal UI
7. Check email for notification
8. Verify database updated with video URL

### Test Profile Completion

```bash
curl -X PATCH http://localhost:3000/api/partnerUser/update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "phone=+1234567890" \
  -F "latitude=40.7128" \
  -F "longitude=-74.0060" \
  -F "address=123 Main St, New York, NY" \
  -F "accountType=AGENT" \
  -F "completeProfile=true" \
  -F "profileVideo=@/path/to/video.mp4"
```

## Security Considerations

1. **Video Access**: Videos stored with `private` ACL in S3
2. **Signed URLs**: Generate signed URLs for video access
3. **File Validation**: MIME type and file size validation
4. **Cleanup**: Temporary files automatically deleted after upload
5. **No Verification Entity**: No separate verification table created (as per requirement)

## Future Enhancements

1. **Webhook Notifications**: Notify frontend when workflow completes
2. **Admin Approval UI**: Interface for admins to approve/reject profiles
3. **Video Processing**: Thumbnail generation, compression
4. **Progress Updates**: Real-time progress updates via WebSocket
5. **Bulk Verification**: Admin workflow to verify multiple profiles

## Troubleshooting

### Issue: Workflow not starting
- Check Temporal server is running
- Verify worker is running and registered
- Check task queue name matches configuration

### Issue: Video upload fails
- Verify S3/Supabase credentials
- Check bucket exists and permissions
- Verify endpoint URL format

### Issue: Email not sending
- Check SMTP configuration
- Verify app password for Gmail
- Check firewall/network restrictions

## Support

For issues or questions:
1. Check Temporal UI for workflow errors
2. Review application logs in `logs/` directory
3. Check worker logs for activity errors
4. Verify environment variables are set correctly

---

**Implementation Date**: November 14, 2025  
**Version**: 1.0.0  
**Status**: ✅ Complete and Ready for Testing
