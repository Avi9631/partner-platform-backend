# Update Route Analysis - Agency Profile Support

## Route Overview
```javascript
PATCH /partnerUser/update
Authorization: Required (authMiddleware)
Content-Type: multipart/form-data
```

## Current Payload Analysis

Your submitted payload:
```
firstName: TECHFUSION
lastName: STUDIO
phone: +919631045873
accountType: AGENCY
latitude: 22.7803136
longitude: 86.2650368
address: Jamshedpur, Golmuri-Cum-Jugsalai...
completeProfile: true
agencyName: SRKVD
agencyRegistrationNumber: RERA948789599
agencyAddress: FLAT - 601, BLOCK A...
agencyEmail: avikumarshooters@gmail.com
agencyPhone: +919631045873
profileVideo: (binary)
```

## Issues Found (Before Enhancement)

❌ **Agency fields not supported**
- agencyName, agencyRegistrationNumber, agencyAddress, agencyEmail, agencyPhone were being ignored
- No validation for agency-specific fields
- No database columns to store agency data
- Account type 'AGENCY' not in ENUM (was 'ORGANIZATION')

## Changes Implemented

### ✅ Database Layer
- Added 5 new columns for agency data
- Updated account_type ENUM to include 'AGENCY'

### ✅ Validation Layer (Controller)
**Required fields when `accountType=AGENCY` & `completeProfile=true`:**
- Basic: firstName, lastName, phone, latitude, longitude, profileVideo
- Agency: agencyName, agencyRegistrationNumber, agencyAddress, agencyEmail, agencyPhone

**Format validations:**
- agencyEmail: Must be valid email format
- agencyPhone: Must be valid phone format (+, digits, spaces, -, () allowed)

### ✅ Workflow Layer (Temporal)
**Agency data now flows through:**
1. Controller → Workflow payload
2. Workflow → validateProfileData activity (validates agency fields)
3. Workflow → updatePartnerUser activity (saves agency data)

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PATCH /partnerUser/update                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│              CONTROLLER: User.controller.js                      │
│                                                                   │
│  1. Validate basic fields (firstName, lastName, phone, etc.)     │
│  2. IF accountType=AGENCY → Validate agency fields               │
│  3. Validate email & phone formats                               │
│  4. Add agency fields to updateFields                            │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Temporal Enabled?     │
              └────┬──────────────┬────┘
                   │ YES          │ NO
                   ▼              ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  TEMPORAL WORKFLOW       │   │  DIRECT DB UPDATE        │
│                          │   │                          │
│  1. validateProfileData  │   │  UserService.updateUser  │
│     - Validate agency    │   │  - Save all fields       │
│       fields if AGENCY   │   │    including agency      │
│  2. uploadVideoToSupabase│   │    data                  │
│  3. updatePartnerUser    │   │                          │
│     - Save agency data   │   │                          │
│  4. sendNotification     │   │                          │
└──────────────────────────┘   └──────────────────────────┘
```

## Data Flow for Agency Profile

```javascript
// 1. Request arrives at controller
{
  firstName: "TECHFUSION",
  accountType: "AGENCY",
  agencyName: "SRKVD",
  agencyEmail: "avi@example.com",
  // ... other fields
}

// 2. Controller validates and transforms
updateFields = {
  firstName: "TECHFUSION",
  accountType: "AGENCY",
  agencyName: "SRKVD",        // ✅ Now included
  agencyEmail: "avi@example.com",  // ✅ Now included
  // ... validated fields
}

// 3. Workflow payload (if Temporal enabled)
{
  userId: 123,
  profileData: {
    firstName: "TECHFUSION",
    accountType: "AGENCY",
    agencyName: "SRKVD",      // ✅ Passed to workflow
    agencyEmail: "avi@example.com",
    // ... all fields
  }
}

// 4. Database record (platform_user table)
{
  user_id: 123,
  user_first_name: "TECHFUSION",
  user_account_type: "AGENCY",
  agency_name: "SRKVD",       // ✅ Stored in DB
  agency_email: "avi@example.com",
  profile_completed: true,
  verification_status: "PENDING"
}
```

## Validation Rules Summary

| Field | Required | Format | Notes |
|-------|----------|--------|-------|
| accountType | Yes* | ENUM: INDIVIDUAL, AGENT, AGENCY | When completing profile |
| agencyName | Yes** | String (max 200 chars) | Required if AGENCY |
| agencyRegistrationNumber | Yes** | String (max 100 chars) | Required if AGENCY |
| agencyAddress | Yes** | Text | Required if AGENCY |
| agencyEmail | Yes** | Valid email format | Required if AGENCY |
| agencyPhone | Yes** | Phone format | Required if AGENCY |

\* Required when `completeProfile=true`
\*\* Required only when `accountType=AGENCY` and `completeProfile=true`

## Error Scenarios

### 1. Missing Agency Fields
```json
{
  "success": false,
  "message": "Missing required fields: agencyName, agencyEmail",
  "error": {
    "code": "VALIDATION_ERROR"
  },
  "meta": {
    "missingFields": ["agencyName", "agencyEmail"]
  }
}
```

### 2. Invalid Email Format
```json
{
  "success": false,
  "message": "Invalid agency email format",
  "error": {
    "code": "VALIDATION_ERROR"
  }
}
```

### 3. Invalid Phone Format
```json
{
  "success": false,
  "message": "Invalid agency phone number format",
  "error": {
    "code": "VALIDATION_ERROR"
  }
}
```

## Testing the Enhanced Route

### Test Case 1: Complete Agency Profile
```bash
curl -X PATCH http://localhost:3000/api/partnerUser/update \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "firstName=TECHFUSION" \
  -F "lastName=STUDIO" \
  -F "phone=+919631045873" \
  -F "accountType=AGENCY" \
  -F "latitude=22.7803136" \
  -F "longitude=86.2650368" \
  -F "address=Jamshedpur, Golmuri-Cum-Jugsalai..." \
  -F "completeProfile=true" \
  -F "agencyName=SRKVD" \
  -F "agencyRegistrationNumber=RERA948789599" \
  -F "agencyAddress=FLAT - 601, BLOCK A..." \
  -F "agencyEmail=avikumarshooters@gmail.com" \
  -F "agencyPhone=+919631045873" \
  -F "profileVideo=@/path/to/video.mp4"
```

### Test Case 2: Individual Profile (No Agency Fields)
```bash
curl -X PATCH http://localhost:3000/api/partnerUser/update \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "phone=+1234567890" \
  -F "accountType=INDIVIDUAL" \
  -F "latitude=40.7128" \
  -F "longitude=-74.0060" \
  -F "address=123 Main St, New York" \
  -F "completeProfile=true" \
  -F "profileVideo=@/path/to/video.mp4"
```

## Key Improvements Made

1. ✅ **Database Support**: Added 5 columns for agency data
2. ✅ **Validation**: Comprehensive validation for agency fields
3. ✅ **Controller**: Agency fields now in allowedFields list
4. ✅ **Workflow**: Agency data flows through Temporal workflow
5. ✅ **Activities**: Agency fields validated and saved in workflow activities
6. ✅ **Enum Update**: Changed ORGANIZATION → AGENCY

## Files Modified

1. `migrations/add-agency-columns.sql` - NEW
2. `src/entity/PlatformUser.entity.js` - Updated ENUM + added 5 fields
3. `src/controller/User.controller.js` - Added validation & agency fields
4. `src/temporal/workflows/user/partnerOnboarding.workflow.js` - Updated docs
5. `src/temporal/activities/user/partnerOnboarding.activities.js` - Added validation

## Deployment Steps

1. ✅ Code changes are complete
2. ⚠️ **Run database migration** (IMPORTANT!)
3. ⚠️ **Restart Node.js server**
4. ✅ Test with your payload
5. ✅ Update frontend to show agency fields when AGENCY is selected

## Migration Command
```bash
# Run this command to add agency columns
mysql -u your_user -p your_database < migrations/add-agency-columns.sql
```
