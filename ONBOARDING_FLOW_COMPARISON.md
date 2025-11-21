# Partner Onboarding Flow Analysis

## Overview

This document provides a detailed comparison between the **Partner User Onboarding** and the **Business Partner Onboarding** workflows.

---

## Flow Comparison

### Partner User Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PARTNER USER ONBOARDING                      │
└─────────────────────────────────────────────────────────────────┘

Frontend (Form Submission)
    │
    ├── Personal Details:
    │   ├── firstName
    │   ├── lastName
    │   ├── phone
    │   └── accountType (INDIVIDUAL/AGENT/BUSINESS)
    │
    ├── Location:
    │   ├── latitude
    │   ├── longitude
    │   └── address
    │
    └── Verification:
        └── profileVideo (binary file)
    
    ↓
    
POST /api/partnerUser/onboarding
    │
    ↓
    
UserController.onboardUser()
    │
    ├── Validate required fields
    ├── Validate phone format
    ├── Validate coordinates
    └── Validate video file
    
    ↓
    
Temporal Workflow: partnerUserOnboarding
    │
    ├── Step 1: validateProfileData
    │   ├── Validate firstName, lastName
    │   ├── Validate phone format
    │   ├── Validate location (lat/lon)
    │   ├── Validate accountType
    │   └── Check video buffer exists
    │
    ├── Step 2: uploadVideoToSupabase
    │   ├── Generate S3 key: partner-profiles/{userId}/verification-video-{timestamp}.mp4
    │   ├── Upload to S3/Supabase
    │   └── Return video URL
    │
    ├── Step 3: updatePartnerUser
    │   ├── Update platform_user table
    │   ├── Set firstName, lastName, phone
    │   ├── Set latitude, longitude, address
    │   ├── Store profileVideo URL
    │   ├── Set verificationStatus: PENDING
    │   └── Set userStatus: ACTIVE
    │
    └── Step 4: sendOnboardingNotification
        ├── Send email to user
        └── Include verification timeline
    
    ↓
    
Response: 202 Accepted
    └── workflowId: partner-onboarding-{userId}-{timestamp}
    
    ↓
    
Admin Verification (Manual)
    │
    ├── Review profile details
    ├── Watch profileVideo
    └── Approve/Reject
    
    ↓
    
POST /api/partnerUser/approveVerification
    │
    └── Update platform_user:
        ├── verificationStatus: APPROVED
        ├── profileCompleted: true
        ├── verifiedAt: NOW()
        └── verifiedBy: admin_user_id
```

---

### Business Partner Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  BUSINESS PARTNER ONBOARDING                    │
└─────────────────────────────────────────────────────────────────┘

Frontend (Form Submission)
    │
    ├── Business Details:
    │   ├── businessName
    │   ├── registrationNumber
    │   ├── businessAddress
    │   ├── businessEmail
    │   └── businessPhones: [{phone: "..."}, ...]
    │
    └── Verification:
        └── ownerVideo (binary file)
    
    ↓
    
POST /api/partnerUser/businessOnboarding
    │
    ↓
    
UserController.onboardBusinessPartner()
    │
    ├── Validate required fields
    ├── Parse businessPhones JSON
    ├── Validate email format
    ├── Validate phone array format
    └── Validate video file
    
    ↓
    
Temporal Workflow: partnerBusinessOnboarding
    │
    ├── Step 1: validateBusinessOnboardingData
    │   ├── Validate businessName (min 2 chars)
    │   ├── Validate registrationNumber
    │   ├── Validate businessAddress (min 10 chars)
    │   ├── Validate businessEmail format
    │   ├── Validate businessPhones array
    │   ├── Check each phone format
    │   └── Check video buffer exists
    │
    ├── Step 2: uploadOwnerVideoToSupabase
    │   ├── Generate S3 key: business-owners/{userId}/verification-video-{timestamp}.mp4
    │   ├── Upload to S3/Supabase
    │   └── Return video URL
    │
    ├── Step 3: createPartnerBusinessRecord
    │   ├── Check if business exists for user
    │   ├── Create/Update partner_business table
    │   ├── Set businessName, registrationNumber
    │   ├── Set businessAddress, businessEmail
    │   ├── Store businessPhones (JSONB array)
    │   ├── Store ownerVideo URL
    │   ├── Set verificationStatus: PENDING
    │   └── Update user accountType: BUSINESS
    │
    └── Step 4: sendBusinessOnboardingNotification
        ├── Send email to business owner
        └── Include verification timeline
    
    ↓
    
Response: 202 Accepted
    └── workflowId: business-onboarding-{userId}-{timestamp}
    
    ↓
    
Admin Verification (Manual)
    │
    ├── Review business details
    ├── Watch ownerVideo
    ├── Verify registration number
    └── Approve/Reject
    
    ↓
    
UPDATE partner_business (TODO: Create API endpoint)
    │
    └── Update partner_business:
        ├── verificationStatus: APPROVED/REJECTED
        ├── verificationNotes: "..."
        ├── verifiedAt: NOW()
        └── verifiedBy: admin_user_id
```

---

## Key Differences

### 1. Data Structure

| Aspect | Partner User | Business Partner |
|--------|-------------|------------------|
| **Primary Focus** | Individual person | Business entity |
| **Name Field** | firstName, lastName | businessName |
| **Contact** | Single phone string | Array of phone objects (JSONB) |
| **Email** | User's personal email | Business email |
| **Location** | Required (lat/lon) | Not required |
| **Registration** | Not required | registrationNumber required |
| **Address** | Optional | Required (min 10 chars) |
| **Video Field Name** | `profileVideo` | `ownerVideo` |
| **Video Storage Path** | `partner-profiles/{userId}/` | `business-owners/{userId}/` |

### 2. API Request Format

#### Partner User Onboarding Request:
```javascript
{
  firstName: "John",
  lastName: "Doe",
  phone: "+1234567890",
  accountType: "AGENT",
  latitude: 40.7128,
  longitude: -74.0060,
  address: "123 Main St, New York, NY",
  profileVideo: <binary file>
}
```

#### Business Partner Onboarding Request:
```javascript
{
  businessName: "VIRTUSA CONSULTING PVT LTD",
  registrationNumber: "jhhnfjtmnfjmtjfj",
  businessAddress: "FLAT - 601, Block A, Elegant Height, Telco Jamshedpur",
  businessEmail: "avikumarshooters@gmail.com",
  businessPhones: [
    {"phone": "9631045873"},
    {"phone": "9876543210"}
  ],
  ownerVideo: <binary file>
}
```

### 3. Database Tables

| Aspect | Partner User | Business Partner |
|--------|-------------|------------------|
| **Table** | `platform_user` | `partner_business` |
| **Primary Key** | `user_id` | `business_id` |
| **Video Field** | `profile_video` | `owner_video` |
| **Phone Storage** | VARCHAR | JSONB (array) |
| **Has Location** | Yes (lat/lon) | No |
| **Account Type** | Stored in user table | Always BUSINESS |

### 4. Workflow Names

| Aspect | Partner User | Business Partner |
|--------|-------------|------------------|
| **Workflow** | `partnerUserOnboarding` | `partnerBusinessOnboarding` |
| **Workflow File** | `partnerOnboarding.workflow.js` | `partnerBusinessOnboarding.workflow.js` |
| **Activities File** | `partnerOnboarding.activities.js` | `partnerBusinessOnboarding.activities.js` |
| **Controller Function** | `onboardUser()` | `onboardBusinessPartner()` |
| **API Endpoint** | `/partnerUser/onboarding` | `/partnerUser/businessOnboarding` |

### 5. Validation Rules

#### Partner User:
- ✅ firstName required
- ✅ lastName required
- ✅ phone required (single string)
- ✅ latitude & longitude required
- ✅ latitude: -90 to 90
- ✅ longitude: -180 to 180
- ✅ profileVideo required
- ✅ accountType optional (INDIVIDUAL/AGENT/BUSINESS)

#### Business Partner:
- ✅ businessName required (min 2 chars)
- ✅ registrationNumber required
- ✅ businessAddress required (min 10 chars)
- ✅ businessEmail required (valid email format)
- ✅ businessPhones required (array of objects)
- ✅ Each phone validated individually
- ✅ ownerVideo required

### 6. Sample JSON Data

#### Partner User Sample:
```json
{
  "userId": 123,
  "email": "partner@example.com",
  "profileData": {
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "address": "123 Main St, New York, NY",
    "accountType": "AGENT"
  },
  "videoBuffer": "<Buffer ...>",
  "originalFilename": "profile-video.mp4",
  "videoMimetype": "video/mp4",
  "videoSize": 1024000
}
```

#### Business Partner Sample:
```json
{
  "userId": 123,
  "email": "owner@business.com",
  "businessData": {
    "businessName": "VIRTUSA CONSULTING PVT LTD",
    "registrationNumber": "jhhnfjtmnfjmtjfj",
    "businessAddress": "FLAT - 601, Block A, Elegant Height, Telco Jamshedpur",
    "businessEmail": "avikumarshooters@gmail.com",
    "businessPhones": [
      {"phone": "9631045873"}
    ]
  },
  "videoBuffer": "<Buffer ...>",
  "originalFilename": "owner-video.mp4",
  "videoMimetype": "video/mp4",
  "videoSize": 1024000
}
```

---

## Similarities

Both workflows share the following characteristics:

1. **Temporal-based**: Both use Temporal workflows for orchestration
2. **Video Upload**: Both upload verification videos to Supabase/S3
3. **Email Notification**: Both send email notifications after submission
4. **Verification Status**: Both set status to PENDING for admin review
5. **Retry Logic**: Both use same retry configuration (3 attempts, exponential backoff)
6. **Timeout**: Both use 5-minute timeout for video uploads
7. **Security**: Both use private ACL for video files
8. **Fallback**: Both fall back to direct DB update if Temporal fails
9. **Response Format**: Both return 202 Accepted with workflowId

---

## File Structure

```
src/
├── controller/
│   └── User.controller.js
│       ├── onboardUser()                    ← Partner User
│       └── onboardBusinessPartner()         ← Business Partner
│
├── routes/
│   └── user.route.js
│       ├── POST /partnerUser/onboarding           ← Partner User
│       └── POST /partnerUser/businessOnboarding   ← Business Partner
│
├── entity/
│   ├── PlatformUser.entity.js               ← Stores partner user data
│   └── PartnerBusiness.entity.js            ← Stores business data
│
├── service/
│   ├── UserService.service.js               ← User operations
│   └── PartnerBusiness.service.js           ← Business operations
│
└── temporal/
    ├── workflows/
    │   ├── index.js                         ← Exports both workflows
    │   └── user/
    │       ├── partnerOnboarding.workflow.js          ← Partner User
    │       └── partnerBusinessOnboarding.workflow.js  ← Business Partner
    │
    └── activities/
        ├── registry.js                      ← Registers all activities
        └── user/
            ├── partnerOnboarding.activities.js          ← Partner User
            └── partnerBusinessOnboarding.activities.js  ← Business Partner
```

---

## Testing Examples

### Test Partner User Onboarding

```bash
curl -X POST http://localhost:3000/api/partnerUser/onboarding \
  -H "Authorization: Bearer TOKEN" \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "phone=+1234567890" \
  -F "accountType=AGENT" \
  -F "latitude=40.7128" \
  -F "longitude=-74.0060" \
  -F "address=123 Main St, New York, NY" \
  -F "profileVideo=@/path/to/video.mp4"
```

### Test Business Partner Onboarding

```bash
curl -X POST http://localhost:3000/api/partnerUser/businessOnboarding \
  -H "Authorization: Bearer TOKEN" \
  -F "businessName=VIRTUSA CONSULTING PVT LTD" \
  -F "registrationNumber=jhhnfjtmnfjmtjfj" \
  -F "businessAddress=FLAT - 601, Block A, Elegant Height, Telco Jamshedpur" \
  -F "businessEmail=avikumarshooters@gmail.com" \
  -F 'businessPhones=[{"phone":"9631045873"}]' \
  -F "ownerVideo=@/path/to/video.mp4"
```

---

## Summary

The **Business Partner Onboarding** workflow is designed as a parallel but distinct flow from the **Partner User Onboarding**, specifically tailored for company/business registration. While both follow similar Temporal workflow patterns, they have different:

- Data requirements
- Validation rules
- Storage locations
- Database tables
- Field names

This separation ensures:
- ✅ Clear separation of concerns
- ✅ Type-safe data handling
- ✅ Appropriate validation for each entity type
- ✅ Flexible verification processes
- ✅ Scalable architecture for future enhancements
