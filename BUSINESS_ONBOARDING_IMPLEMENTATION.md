# Business Partner Onboarding Implementation

## Overview

This document describes the business partner onboarding workflow implementation, which is similar to the partner user onboarding but specifically handles business/company registration with their own set of requirements.

## Architecture

The business partner onboarding follows the same Temporal workflow pattern as the partner user onboarding:

```
Frontend -> API Controller -> Temporal Workflow -> Activities -> Database + S3/Supabase
```

### Key Components

1. **Workflow**: `partnerBusinessOnboarding` - Orchestrates the entire onboarding process
2. **Activities**: Business validation, video upload, business record creation, email notification
3. **Controller**: `onboardBusinessPartner` - API endpoint handler
4. **Route**: `POST /partnerUser/businessOnboarding` - API endpoint
5. **Entity**: `PartnerBusiness` - Database model with owner video field

## API Endpoint

### POST /partnerUser/businessOnboarding

Handles business partner onboarding with multipart/form-data for owner video upload.

#### Request Headers
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### Request Body (multipart/form-data)

| Field | Type | Required | Description | Example |
|-------|------|----------|-------------|---------|
| businessName | string | Yes | Business/Company name | VIRTUSA CONSULTING PVT LTD |
| registrationNumber | string | Yes | Business registration number | jhhnfjtmnfjmtjfj |
| businessAddress | string | Yes | Complete business address (min 10 chars) | FLAT - 601, Block A, Elegant Height, Telco Jamshedpur |
| businessEmail | string | Yes | Business email address | avikumarshooters@gmail.com |
| businessPhones | JSON string | Yes | Array of phone objects | [{"phone":"9631045873"}] |
| ownerVideo | file | Yes | Owner verification video (binary) | video file |

#### businessPhones Format

The `businessPhones` field must be a JSON string containing an array of objects with a `phone` property:

```json
[
  {"phone": "9631045873"},
  {"phone": "9876543210"}
]
```

Or as a single phone:
```json
[{"phone": "9631045873"}]
```

#### Sample Request (cURL)

```bash
curl -X POST http://localhost:3000/api/partnerUser/businessOnboarding \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "businessName=VIRTUSA CONSULTING PVT LTD" \
  -F "registrationNumber=jhhnfjtmnfjmtjfj" \
  -F "businessAddress=FLAT - 601, Block A, Elegant Height, Telco Jamshedpur" \
  -F "businessEmail=avikumarshooters@gmail.com" \
  -F 'businessPhones=[{"phone":"9631045873"}]' \
  -F "ownerVideo=@/path/to/owner-video.mp4"
```

#### Sample Request (Postman)

1. Set method to `POST`
2. URL: `http://localhost:3000/api/partnerUser/businessOnboarding`
3. Headers:
   - `Authorization`: `Bearer YOUR_TOKEN`
4. Body (form-data):
   - `businessName`: `VIRTUSA CONSULTING PVT LTD`
   - `registrationNumber`: `jhhnfjtmnfjmtjfj`
   - `businessAddress`: `FLAT - 601, Block A, Elegant Height, Telco Jamshedpur`
   - `businessEmail`: `avikumarshooters@gmail.com`
   - `businessPhones`: `[{"phone":"9631045873"}]`
   - `ownerVideo`: (select file)

#### Response (202 Accepted - When Temporal is enabled)

```json
{
  "status": "success",
  "message": "Business profile submitted for verification. Processing in progress.",
  "data": {
    "workflowId": "business-onboarding-123-1732147200000",
    "status": "processing",
    "message": "Your business profile is being processed. You will receive an email once verification is complete."
  },
  "meta": {
    "userId": 123,
    "businessOnboardingSubmitted": true,
    "workflowStarted": true,
    "timestamp": "2024-11-21T00:00:00.000Z"
  },
  "error": null
}
```

#### Response (200 OK - When Temporal is disabled/fallback)

```json
{
  "status": "success",
  "message": "Business profile submitted for verification successfully",
  "data": {
    "business": {
      "businessId": 1,
      "userId": 123,
      "businessName": "VIRTUSA CONSULTING PVT LTD",
      "registrationNumber": "jhhnfjtmnfjmtjfj",
      "businessAddress": "FLAT - 601, Block A, Elegant Height, Telco Jamshedpur",
      "businessEmail": "avikumarshooters@gmail.com",
      "businessPhone": [{"phone": "9631045873"}],
      "verificationStatus": "PENDING",
      "ownerVideo": "https://supabase.example.com/storage/business-owners/123/verification-video-1732147200000.mp4"
    },
    "verificationStatus": "PENDING"
  },
  "meta": {
    "userId": 123,
    "businessOnboardingSubmitted": true,
    "ownerVideoUploaded": true,
    "timestamp": "2024-11-21T00:00:00.000Z"
  },
  "error": null
}
```

#### Error Responses

**400 Bad Request - Missing Fields**
```json
{
  "status": "error",
  "message": "Missing required fields for business onboarding: businessName, ownerVideo",
  "data": null,
  "meta": {
    "missingFields": ["businessName", "ownerVideo"],
    "timestamp": "2024-11-21T00:00:00.000Z"
  },
  "error": {
    "message": "Missing required fields",
    "code": "VALIDATION_ERROR",
    "source": "onboardBusinessPartner"
  }
}
```

**400 Bad Request - Invalid Email**
```json
{
  "status": "error",
  "message": "Invalid business email format",
  "data": null,
  "meta": {
    "timestamp": "2024-11-21T00:00:00.000Z"
  },
  "error": {
    "message": "Business email must be a valid email address",
    "code": "VALIDATION_ERROR",
    "source": "onboardBusinessPartner"
  }
}
```

**400 Bad Request - Invalid Phone Format**
```json
{
  "status": "error",
  "message": "Invalid phone number format at index 0",
  "data": null,
  "meta": {
    "timestamp": "2024-11-21T00:00:00.000Z"
  },
  "error": {
    "message": "Phone number must contain only digits, spaces, +, -, ()",
    "code": "VALIDATION_ERROR",
    "source": "onboardBusinessPartner"
  }
}
```

## Workflow Steps

### 1. Validate Business Data
- Checks all required fields are present and valid
- Validates business name (min 2 chars)
- Validates registration number
- Validates business address (min 10 chars)
- Validates business email format
- Validates business phone array and each phone format
- Checks owner video buffer exists

### 2. Upload Owner Verification Video
- Uploads video to Supabase Storage using S3 protocol
- Stores in bucket: `business-owners/{userId}/verification-video-{timestamp}.mp4`
- Sets ACL to private for security
- Returns video URL for storage

### 3. Create Business Record
- Creates or updates business record in `partner_business` table
- Stores owner video URL in `owner_video` field
- Sets verification status to `PENDING`
- Updates user's account type to `BUSINESS`

### 4. Send Onboarding Notification
- Sends email to business owner
- Includes submission details
- Explains next steps and verification process

## Database Schema

### partner_business Table

The `partner_business` table stores business information:

```sql
CREATE TABLE partner_business (
  business_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES platform_user(user_id),
  business_name VARCHAR(200) NOT NULL,
  registration_number VARCHAR(100),
  business_address TEXT NOT NULL,
  business_email VARCHAR(100) NOT NULL,
  business_phone JSONB,
  owner_video TEXT,  -- URL to owner verification video
  verification_status VARCHAR(20) DEFAULT 'PENDING',
  verification_notes TEXT,
  verified_at TIMESTAMP,
  verified_by INTEGER,
  business_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  business_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  business_deleted_at TIMESTAMP
);
```

### Migration

Add the `owner_video` column to existing `partner_business` table:

```sql
-- Add owner_video column to partner_business table
ALTER TABLE partner_business 
ADD COLUMN owner_video TEXT;

COMMENT ON COLUMN partner_business.owner_video IS 'URL to the owner verification video stored in Supabase/S3';
```

## Workflow Configuration

### Temporal Settings

```javascript
{
  startToCloseTimeout: '5 minutes', // Longer timeout for video upload
  retry: {
    initialInterval: '1s',
    maximumInterval: '30s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  }
}
```

## Activities

### 1. validateBusinessOnboardingData
Validates all business data and owner video buffer.

**Input:**
```javascript
{
  userId: number,
  businessData: {
    businessName: string,
    registrationNumber: string,
    businessAddress: string,
    businessEmail: string,
    businessPhones: [{phone: string}]
  },
  videoBuffer: Buffer
}
```

**Output:**
```javascript
{
  success: boolean,
  errors?: string[]
}
```

### 2. uploadOwnerVideoToSupabase
Uploads owner verification video to Supabase/S3.

**Input:**
```javascript
{
  userId: number,
  videoBuffer: Buffer,
  originalFilename: string,
  videoMimetype: string
}
```

**Output:**
```javascript
{
  success: boolean,
  videoUrl: string,
  s3Key: string
}
```

### 3. createPartnerBusinessRecord
Creates or updates business record in database.

**Input:**
```javascript
{
  userId: number,
  businessData: {
    businessName: string,
    registrationNumber: string,
    businessAddress: string,
    businessEmail: string,
    businessPhones: [{phone: string}]
  },
  ownerVideoUrl: string
}
```

**Output:**
```javascript
{
  success: boolean,
  business: {
    businessId: number,
    userId: number,
    businessName: string,
    ...
  }
}
```

### 4. sendBusinessOnboardingNotification
Sends email notification to business owner.

**Input:**
```javascript
{
  userId: number,
  email: string,
  businessName: string
}
```

**Output:**
```javascript
{
  success: boolean,
  error?: string
}
```

## Comparison: Partner User vs Business Partner Onboarding

| Feature | Partner User Onboarding | Business Partner Onboarding |
|---------|------------------------|----------------------------|
| **Endpoint** | `/partnerUser/onboarding` | `/partnerUser/businessOnboarding` |
| **Workflow** | `partnerUserOnboarding` | `partnerBusinessOnboarding` |
| **Video Field** | `profileVideo` | `ownerVideo` |
| **Main Data** | Personal details (firstName, lastName, phone) | Business details (businessName, registration, address) |
| **Location** | Latitude/Longitude required | Not required |
| **Multiple Phones** | Single phone string | Array of phone objects (JSONB) |
| **Email** | User's email | Business email |
| **Account Type** | INDIVIDUAL, AGENT, or BUSINESS | Always BUSINESS |
| **Video Storage** | `partner-profiles/{userId}/` | `business-owners/{userId}/` |
| **Database Table** | `platform_user` | `partner_business` |

## Testing

### Test Business Onboarding Flow

```javascript
// Sample test data
const businessData = {
  businessName: 'VIRTUSA CONSULTING PVT LTD',
  registrationNumber: 'jhhnfjtmnfjmtjfj',
  businessAddress: 'FLAT - 601, Block A, Elegant Height, Telco Jamshedpur',
  businessEmail: 'avikumarshooters@gmail.com',
  businessPhones: [
    { phone: '9631045873' }
  ]
};

// With video file
const ownerVideo = fs.readFileSync('test-video.mp4');

// Make request
const response = await axios.post(
  'http://localhost:3000/api/partnerUser/businessOnboarding',
  {
    ...businessData,
    businessPhones: JSON.stringify(businessData.businessPhones),
    ownerVideo: ownerVideo
  },
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  }
);

console.log(response.data);
```

## Environment Variables

Required environment variables:

```env
# Temporal
TEMPORAL_ENABLED=true

# S3/Supabase Storage
S3_ENDPOINT=https://your-supabase-project.supabase.co/storage/v1
S3_PARTNER_BUSINESS_BUCKET=business-profiles
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
SMTP_FROM=noreply@partner-platform.com
```

## Error Handling

The workflow includes comprehensive error handling:

1. **Validation Errors**: Returns detailed list of validation failures
2. **Upload Errors**: Retries video upload up to 3 times with exponential backoff
3. **Database Errors**: Rolls back on failure
4. **Notification Errors**: Logs error but doesn't fail workflow

## Admin Verification

After business onboarding, admins can verify the business using:

### Approve Business Verification

```javascript
// TODO: Create separate endpoint for business verification
// For now, admin can manually update database:

UPDATE partner_business 
SET verification_status = 'APPROVED',
    verified_at = NOW(),
    verified_by = <admin_user_id>
WHERE business_id = <business_id>;
```

### Reject Business Verification

```javascript
UPDATE partner_business 
SET verification_status = 'REJECTED',
    verification_notes = 'Reason for rejection'
WHERE business_id = <business_id>;
```

## Future Enhancements

1. **Admin Dashboard**: Create admin panel for business verification
2. **Document Upload**: Add support for business registration documents
3. **Multiple Owners**: Support multiple business owners
4. **Business Types**: Add business type classification (LLC, Corp, etc.)
5. **API Rate Limiting**: Implement rate limiting for onboarding endpoint
6. **Video Processing**: Add video transcoding and thumbnail generation
7. **Webhook Notifications**: Send webhooks on verification status changes

## Files Created/Modified

### New Files
1. `src/temporal/workflows/user/partnerBusinessOnboarding.workflow.js` - Business onboarding workflow
2. `src/temporal/activities/user/partnerBusinessOnboarding.activities.js` - Business onboarding activities
3. `BUSINESS_ONBOARDING_IMPLEMENTATION.md` - This documentation

### Modified Files
1. `src/controller/User.controller.js` - Added `onboardBusinessPartner` function
2. `src/routes/user.route.js` - Added `/partnerUser/businessOnboarding` route
3. `src/temporal/workflows/index.js` - Exported `partnerBusinessOnboarding` workflow
4. `src/temporal/activities/registry.js` - Registered business onboarding activities
5. `src/entity/PartnerBusiness.entity.js` - Added `ownerVideo` field

## Conclusion

The business partner onboarding flow is now complete and follows the same pattern as the partner user onboarding, with specialized handling for business-specific fields and requirements. The implementation is production-ready and includes comprehensive validation, error handling, and notification systems.
