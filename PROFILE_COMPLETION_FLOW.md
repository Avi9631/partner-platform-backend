# Profile Completion Flow - Updated Implementation

## 🎯 Key Changes

### Before
- User had to send `completeProfile: true` in the request
- `profileCompleted` was set immediately upon submission
- No clear distinction between submission and approval

### After ✅
- **No `completeProfile` flag required** - automatically detected
- `profileCompleted` is set to `true` ONLY when admin approves verification
- Clear workflow: Submit → Verify → Complete

---

## 📊 New Profile Completion Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER SUBMITS PROFILE                                      │
│    - Provides all required fields                            │
│    - Uploads profile video                                   │
│    - NO completeProfile flag needed ✅                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. SYSTEM AUTO-DETECTS PROFILE SETUP                        │
│    - Checks if all required fields present                   │
│    - Has profile video                                       │
│    - Sets: verificationStatus = "PENDING"                    │
│    - Sets: profileCompleted = false ⚠️                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. TEMPORAL WORKFLOW PROCESSES                               │
│    - Validates profile data                                  │
│    - Validates business data (if AGENCY)                     │
│    - Uploads video to Supabase                               │
│    - Updates user record (verificationStatus: PENDING)       │
│    - Creates business profile (if AGENCY)                    │
│    - Sends notification email                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. ADMIN REVIEWS PROFILE                                     │
│    - Reviews submitted information                           │
│    - Verifies video                                          │
│    - Checks business registration (if AGENCY)                │
└────────────────────┬────────────────────────────────────────┘
                     │
           ┌─────────┴─────────┐
           │                   │
           ▼                   ▼
    ┌───────────┐      ┌────────────┐
    │ APPROVE   │      │ REJECT     │
    └─────┬─────┘      └─────┬──────┘
          │                  │
          ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│ APPROVED ✅      │  │ REJECTED ❌      │
│                  │  │                  │
│ - verification   │  │ - verification   │
│   Status:        │  │   Status:        │
│   "APPROVED"     │  │   "REJECTED"     │
│                  │  │                  │
│ - profileCom-    │  │ - profileCom-    │
│   pleted: true   │  │   pleted: false  │
│                  │  │                  │
│ - verifiedAt:    │  │ - verification   │
│   timestamp      │  │   Notes: reason  │
│                  │  │                  │
│ - verifiedBy:    │  │                  │
│   admin_id       │  │                  │
└──────────────────┘  └──────────────────┘
```

---

## 🔑 Key Attributes

### `verificationStatus` (ENUM)
- **PENDING**: Profile submitted, awaiting admin review
- **APPROVED**: Admin approved the profile
- **REJECTED**: Admin rejected the profile

### `profileCompleted` (BOOLEAN)
- **false**: Profile not yet verified/approved
- **true**: Profile verified and approved by admin ✅

### `verifiedAt` (DATETIME)
- Timestamp when admin approved verification

### `verifiedBy` (INTEGER)
- User ID of admin who approved verification

---

## 📝 API Endpoints

### 1. Submit Profile (User)
```http
PATCH /partnerUser/update
Authorization: Bearer <user_token>
Content-Type: multipart/form-data

# Required fields for profile setup:
firstName: TECHFUSION
lastName: STUDIO
phone: +919631045873
accountType: AGENCY
latitude: 22.7803136
longitude: 86.2650368
address: Jamshedpur...
profileVideo: (binary file)

# If AGENCY, also required:
agencyName: SRKVD
agencyRegistrationNumber: RERA948789599
agencyAddress: FLAT - 601...
agencyEmail: avi@gmail.com
agencyPhone: +919631045873
```

**Response:**
```json
{
  "success": true,
  "message": "Profile submitted for verification successfully",
  "data": {
    "user": {
      "userId": 123,
      "verificationStatus": "PENDING",
      "profileCompleted": false,
      "userStatus": "ACTIVE"
    },
    "business": { /* if AGENCY */ }
  },
  "meta": {
    "profileSetupSubmitted": true,
    "note": "profileCompleted will be set to true when admin approves verification"
  }
}
```

### 2. Approve Verification (Admin)
```http
PATCH /partnerUser/approveVerification
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "targetUserId": 123,
  "verificationNotes": "All documents verified"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User verification approved successfully",
  "data": {
    "user": {
      "userId": 123,
      "verificationStatus": "APPROVED",
      "profileCompleted": true,
      "verifiedAt": "2025-11-14T10:30:00Z",
      "verifiedBy": 999
    }
  },
  "meta": {
    "approvedBy": 999,
    "profileCompleted": true
  }
}
```

### 3. Reject Verification (Admin)
```http
PATCH /partnerUser/rejectVerification
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "targetUserId": 123,
  "verificationNotes": "Invalid registration number"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User verification rejected",
  "data": {
    "user": {
      "userId": 123,
      "verificationStatus": "REJECTED",
      "profileCompleted": false,
      "verificationNotes": "Invalid registration number"
    }
  }
}
```

---

## 🔄 State Transitions

```
Initial State
    │
    ├─ User submits profile
    │
    ▼
verificationStatus: PENDING
profileCompleted: false
    │
    ├─ Admin reviews
    │
    ├─────────┬─────────┐
    │         │         │
    ▼         ▼         ▼
 APPROVED  REJECTED  (stays PENDING)
 true      false     false
```

---

## 💻 Code Changes Summary

### Controller (`User.controller.js`)
```javascript
// BEFORE
const isProfileCompletion = updateData.completeProfile === "true";

// AFTER ✅
const hasAllRequiredFields = !!(updateData.firstName && updateData.lastName && 
                                 updateData.phone && updateData.latitude && 
                                 updateData.longitude);
const hasProfileVideo = !!(req.file);
const isProfileSetupSubmission = hasAllRequiredFields && hasProfileVideo;
```

**New Functions:**
- `approveVerification(req, res)` - Approve user verification
- `rejectVerification(req, res)` - Reject user verification

### Service (`UserService.service.js`)

**New Functions:**
- `approveVerification(userId, notes, verifiedBy)` - Sets profileCompleted=true
- `rejectVerification(userId, notes)` - Sets profileCompleted=false

### Routes (`user.route.js`)

**New Routes:**
```javascript
PATCH /partnerUser/approveVerification  // Admin only
PATCH /partnerUser/rejectVerification   // Admin only
```

### Temporal Activities (`partnerOnboarding.activities.js`)
```javascript
// BEFORE
profileCompleted: true  // Set immediately

// AFTER ✅
// profileCompleted NOT set - will be set by admin upon approval
```

---

## ✅ Benefits of New Flow

1. **Clear Separation**: Submission vs Approval
2. **Admin Control**: Only admins can mark profiles as complete
3. **Better UX**: Users know their profile is pending review
4. **Audit Trail**: Track who approved and when
5. **Rejection Handling**: Clear feedback on rejection
6. **No Manual Flag**: System auto-detects profile setup

---

## 🧪 Testing

### Test 1: Submit Profile
```bash
# User submits profile WITHOUT completeProfile flag
curl -X PATCH http://localhost:3000/api/partnerUser/update \
  -H "Authorization: Bearer USER_TOKEN" \
  -F "firstName=TECHFUSION" \
  -F "lastName=STUDIO" \
  -F "phone=+919631045873" \
  -F "accountType=AGENCY" \
  -F "latitude=22.7803136" \
  -F "longitude=86.2650368" \
  -F "address=Jamshedpur..." \
  -F "agencyName=SRKVD" \
  -F "agencyRegistrationNumber=RERA948789599" \
  -F "agencyAddress=FLAT - 601..." \
  -F "agencyEmail=avi@gmail.com" \
  -F "agencyPhone=+919631045873" \
  -F "profileVideo=@video.mp4"

# Check: verificationStatus=PENDING, profileCompleted=false ✅
```

### Test 2: Approve Verification
```bash
# Admin approves verification
curl -X PATCH http://localhost:3000/api/partnerUser/approveVerification \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetUserId": 123, "verificationNotes": "Verified"}'

# Check: verificationStatus=APPROVED, profileCompleted=true ✅
```

### Test 3: Reject Verification
```bash
# Admin rejects verification
curl -X PATCH http://localhost:3000/api/partnerUser/rejectVerification \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetUserId": 124, "verificationNotes": "Invalid docs"}'

# Check: verificationStatus=REJECTED, profileCompleted=false ✅
```

---

## 📋 Database State Examples

### After User Submission
```sql
SELECT user_id, verification_status, profile_completed, verified_at
FROM platform_user WHERE user_id = 123;

-- Result:
-- 123 | PENDING | 0 (false) | NULL
```

### After Admin Approval
```sql
SELECT user_id, verification_status, profile_completed, verified_at, verified_by
FROM platform_user WHERE user_id = 123;

-- Result:
-- 123 | APPROVED | 1 (true) | 2025-11-14 10:30:00 | 999
```

---

## 🚨 Important Notes

1. **No completeProfile flag needed** - System auto-detects
2. **profileCompleted=true ONLY on APPROVED** - Not on submission
3. **Admin routes need protection** - Add admin middleware
4. **Audit trail maintained** - verifiedBy and verifiedAt tracked
5. **Rejection feedback** - verificationNotes required for rejection

---

## 🎉 Summary

The new flow ensures:
- ✅ Users don't need to send `completeProfile` flag
- ✅ Profile completion is controlled by admin approval
- ✅ Clear workflow: Submit → Review → Approve/Reject → Complete
- ✅ Better audit trail with verifiedBy and verifiedAt
- ✅ Proper separation of user actions vs admin actions
