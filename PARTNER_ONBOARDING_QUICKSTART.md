# Partner User Onboarding - Quick Start Guide

## 🚀 Implementation Summary

The partner user onboarding system now uses a **Temporal workflow** to handle profile completion asynchronously. The workflow validates profile data, uploads verification videos to Supabase Storage, and updates the database.

## 📋 Prerequisites

### 1. Run Database Migration
```bash
# Execute the migration to add user_profile_video column
psql -U your_user -d your_database -f migrations/add-profile-video-column.sql
```

### 2. Configure Environment Variables
Add to your `.env` or `prod.env` file:
```env
# Supabase/S3 Storage
S3_ENDPOINT=https://your-project.supabase.co/storage/v1/s3
S3_ACCESS_KEY_ID=your_supabase_access_key
S3_SECRET_ACCESS_KEY=your_supabase_secret_key
S3_REGION=ap-south-1
S3_DEFAULT_BUCKET=partner-videos

# Temporal Server
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=partner-platform-queue

# Email/SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@partner-platform.com
```

### 3. Start Temporal Worker
```bash
# In a separate terminal
node src/temporal/worker.js
```

### 4. Start Application
```bash
npm start
# or
npm run dev
```

## 🎯 Key Features

✅ **Asynchronous Processing**: Profile completion returns immediately (HTTP 202)  
✅ **Video Upload to Supabase**: Uses S3 protocol for reliable uploads  
✅ **Automatic Validation**: Validates all profile fields before processing  
✅ **Email Notifications**: Sends confirmation email after submission  
✅ **No Verification Entity**: Stores everything in platform_user table  
✅ **Automatic Retry**: Failed activities retry with exponential backoff  
✅ **Temp File Cleanup**: Automatically removes temporary files after upload  

## 📡 API Endpoint

**Endpoint**: `PATCH /partnerUser/update`  
**Authentication**: Required (JWT Bearer token)  
**Content-Type**: `multipart/form-data`

### Request Example
```javascript
// Using fetch API
const formData = new FormData();
formData.append('firstName', 'John');
formData.append('lastName', 'Doe');
formData.append('phone', '+1234567890');
formData.append('latitude', '40.7128');
formData.append('longitude', '-74.0060');
formData.append('address', '123 Main St, New York, NY');
formData.append('accountType', 'AGENT');
formData.append('completeProfile', 'true');
formData.append('profileVideo', videoFile); // File object

const response = await fetch('/api/partnerUser/update', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
// Returns immediately with workflowId
```

### Response (HTTP 202 Accepted)
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

## 🔍 Workflow Steps

1. **Validation** → Validates firstName, lastName, phone, location, video
2. **Upload** → Uploads video to Supabase: `partner-profiles/{userId}/verification-video-{timestamp}.mp4`
3. **Update** → Updates platform_user with video URL, sets status to ACTIVE, verification to PENDING
4. **Notify** → Sends email notification to user

## 📊 Monitoring

### Check Workflow Status (Optional)
```javascript
const { getWorkflowHandle } = require('./utils/temporalClient');

async function checkStatus(workflowId) {
  const handle = await getWorkflowHandle(workflowId);
  const description = await handle.describe();
  console.log('Status:', description.status.name);
}
```

### Temporal UI
Visit: `http://localhost:8233` to monitor workflows

## 🗂️ Files Modified/Created

### Created Files:
- ✅ `migrations/add-profile-video-column.sql` - Database migration
- ✅ `src/temporal/workflows/user/partnerOnboarding.workflow.js` - Workflow definition
- ✅ `src/temporal/activities/user/partnerOnboarding.activities.js` - Activities
- ✅ `PARTNER_ONBOARDING_WORKFLOW.md` - Full documentation
- ✅ `PARTNER_ONBOARDING_QUICKSTART.md` - This file

### Modified Files:
- ✅ `src/entity/PlatformUser.entity.js` - Added profileVideo field
- ✅ `src/controller/User.controller.js` - Triggers temporal workflow
- ✅ `src/middleware/uploadMiddleware.js` - Comments for temp storage
- ✅ `src/temporal/workflows/index.js` - Registered workflow
- ✅ `src/temporal/activities/registry.js` - Registered activities

## ⚠️ Important Notes

1. **Workflow vs Direct Update**:
   - With `completeProfile=true` → Uses temporal workflow (async)
   - Without `completeProfile=true` → Direct database update (sync)

2. **Video File**:
   - Max size: 50MB
   - Allowed types: MP4, MPEG, MOV, AVI, WebM
   - Temporarily stored in `src/uploads/profile-videos/`
   - Automatically cleaned up after Supabase upload

3. **User Status**:
   - After workflow: `userStatus = 'ACTIVE'`, `verificationStatus = 'PENDING'`
   - Admin can later approve/reject via separate API

4. **No Verification Table**:
   - All data stored in `platform_user` table
   - Video URL stored in `user_profile_video` column

## 🧪 Testing

### Test with cURL:
```bash
curl -X PATCH http://localhost:3000/api/partnerUser/update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "phone=+1234567890" \
  -F "latitude=40.7128" \
  -F "longitude=-74.0060" \
  -F "address=123 Main St, New York" \
  -F "accountType=AGENT" \
  -F "completeProfile=true" \
  -F "profileVideo=@./test-video.mp4"
```

### Expected Flow:
1. ✅ API returns immediately (202)
2. ✅ Check Temporal UI - workflow running
3. ✅ Video uploaded to Supabase
4. ✅ Database updated
5. ✅ Email sent to user
6. ✅ Temp file deleted

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Workflow not starting | Check Temporal server & worker are running |
| Video upload fails | Verify S3 credentials and bucket exists |
| Email not sending | Check SMTP configuration |
| 500 error on API | Check logs in `logs/` directory |
| Worker crashes | Ensure all dependencies installed |

## 📞 Support

For detailed documentation, see `PARTNER_ONBOARDING_WORKFLOW.md`

---

**Ready to test!** 🎉
