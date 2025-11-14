# PartnerBusiness Entity - Complete Implementation Guide

## 🎯 What Was Built

A **separate entity** (`PartnerBusiness`) to store agency/business information instead of adding columns to the `PlatformUser` table. This follows database normalization best practices and provides better scalability.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────┐         ┌──────────────────────────┐
│   platform_user         │         │   partner_business        │
├─────────────────────────┤         ├──────────────────────────┤
│ user_id (PK)           │◄────────│ business_id (PK)         │
│ firstName              │    1:1   │ user_id (FK)             │
│ lastName               │         │ business_name            │
│ accountType (ENUM)     │         │ registration_number      │
│ profileCompleted       │         │ business_address         │
│ ...                    │         │ business_email           │
└─────────────────────────┘         │ business_phone           │
                                    │ business_type (ENUM)     │
                                    │ business_status (ENUM)   │
                                    │ verification_status      │
                                    └──────────────────────────┘
```

### Relationship
- **One-to-One**: Each user can have ONE business profile
- **Foreign Key**: `partner_business.user_id` → `platform_user.user_id`
- **Cascade Delete**: When user is deleted, business is also deleted

---

## 📦 Files Created/Modified

### NEW Files ✨

1. **`src/entity/PartnerBusiness.entity.js`**
   - Sequelize model for partner_business table
   - Enums: businessType, businessStatus, verificationStatus
   - Soft delete support (paranoid)
   - Virtual fields for formatted dates

2. **`src/service/PartnerBusiness.service.js`**
   - `createOrUpdateBusiness()` - Create/update business profile
   - `getBusinessByUserId()` - Fetch business by user ID
   - `getBusinessById()` - Fetch business by business ID
   - `updateVerificationStatus()` - Update verification status
   - `getAllBusinesses()` - Get paginated list with filters
   - `deleteBusiness()` - Soft delete business

### MODIFIED Files 📝

3. **`migrations/add-agency-columns.sql`**
   - Creates `partner_business` table
   - Updates `platform_user.user_account_type` ENUM to include 'AGENCY'

4. **`src/entity/index.js`**
   - Added PartnerBusiness entity
   - Defined hasOne/belongsTo relationships

5. **`src/entity/PlatformUser.entity.js`**
   - Updated accountType ENUM: 'INDIVIDUAL', 'AGENT', 'AGENCY'
   - Removed agency fields (kept clean)

6. **`src/controller/User.controller.js`**
   - Imports PartnerBusinessService
   - Extracts businessFields separately from updateData
   - Validates business email and phone formats
   - Creates business profile when accountType=AGENCY
   - Returns business data in response

7. **`src/temporal/workflows/user/partnerOnboarding.workflow.js`**
   - Added `businessData` parameter
   - Added `validateBusinessData` activity
   - Added `createPartnerBusiness` activity
   - Step 1.5: Validate business data
   - Step 3.5: Create business profile

8. **`src/temporal/activities/user/partnerOnboarding.activities.js`**
   - NEW: `validateBusinessData()` - Validates business fields
   - NEW: `createPartnerBusiness()` - Creates business via service
   - UPDATED: `validateProfileData()` - Removed agency validation
   - UPDATED: `updatePartnerUser()` - Removed agency field handling

---

## 🔄 Data Flow

### Profile Completion Flow (with Business)

```
1. User submits form
   ├─ User fields → updateFields
   └─ Business fields → businessFields

2. Controller validates
   ├─ Basic user fields ✓
   ├─ Business fields (if AGENCY) ✓
   ├─ Email format ✓
   └─ Phone format ✓

3a. Temporal Workflow (if enabled)
    ├─ Step 1: Validate profile data
    ├─ Step 1.5: Validate business data ← NEW
    ├─ Step 2: Upload video to Supabase
    ├─ Step 3: Update user record
    ├─ Step 3.5: Create business profile ← NEW
    └─ Step 4: Send notification

3b. Direct DB Update (if Temporal disabled)
    ├─ Update user record
    ├─ Create business profile via PartnerBusinessService
    └─ Return response

4. Response includes
   ├─ user: { ...user data }
   └─ business: { ...business data } ← NEW
```

---

## 📋 Complete Field Mapping

### Request Payload → Database Tables

```javascript
// Request Body
{
  // USER FIELDS → platform_user table
  firstName: "TECHFUSION"           → user_first_name
  lastName: "STUDIO"                → user_last_name
  phone: "+919631045873"            → user_phone
  accountType: "AGENCY"             → user_account_type
  latitude: 22.7803136              → user_latitude
  longitude: 86.2650368             → user_longitude
  address: "Jamshedpur..."          → user_address
  
  // BUSINESS FIELDS → partner_business table
  agencyName: "SRKVD"               → business_name
  agencyRegistrationNumber: "RERA..." → registration_number
  agencyAddress: "FLAT - 601..."    → business_address
  agencyEmail: "avi@gmail.com"      → business_email
  agencyPhone: "+919631045873"      → business_phone
  
  // AUTO-SET FIELDS
  // In platform_user:
  profileCompleted: true
  verificationStatus: "PENDING"
  userStatus: "ACTIVE"
  
  // In partner_business:
  businessType: "AGENCY"
  businessStatus: "PENDING_VERIFICATION"
  verificationStatus: "PENDING"
}
```

---

## 🔍 Service Layer Functions

### PartnerBusinessService

```javascript
// Create or update business
const business = await PartnerBusinessService.createOrUpdateBusiness(
  userId, 
  {
    agencyName: "SRKVD",
    agencyRegistrationNumber: "RERA948789599",
    agencyAddress: "FLAT - 601...",
    agencyEmail: "avi@gmail.com",
    agencyPhone: "+919631045873"
  }
);

// Get business by user ID
const business = await PartnerBusinessService.getBusinessByUserId(123);

// Update verification status
const business = await PartnerBusinessService.updateVerificationStatus(
  businessId, 
  'VERIFIED', 
  'All documents verified',
  adminUserId
);

// Get all businesses with filters
const result = await PartnerBusinessService.getAllBusinesses(
  { 
    verificationStatus: 'PENDING',
    businessType: 'AGENCY',
    search: 'SRKVD'
  },
  page = 1,
  limit = 10
);
```

---

## ✅ Testing Your Implementation

### Step 1: Run Migration
```bash
cd "d:\my codes\partner-platform-backend"
mysql -u your_user -p your_database < migrations/add-agency-columns.sql
```

### Step 2: Restart Server
```bash
npm run dev
```

### Step 3: Test API Call

#### Using cURL:
```bash
curl -X PATCH http://localhost:3000/api/partnerUser/update \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "firstName=TECHFUSION" \
  -F "lastName=STUDIO" \
  -F "phone=+919631045873" \
  -F "accountType=AGENCY" \
  -F "latitude=22.7803136" \
  -F "longitude=86.2650368" \
  -F "address=Jamshedpur..." \
  -F "completeProfile=true" \
  -F "agencyName=SRKVD" \
  -F "agencyRegistrationNumber=RERA948789599" \
  -F "agencyAddress=FLAT - 601..." \
  -F "agencyEmail=avi@gmail.com" \
  -F "agencyPhone=+919631045873" \
  -F "profileVideo=@video.mp4"
```

#### Expected Response:
```json
{
  "success": true,
  "message": "Profile submitted for verification successfully",
  "data": {
    "user": {
      "userId": 123,
      "firstName": "TECHFUSION",
      "lastName": "STUDIO",
      "accountType": "AGENCY",
      "profileCompleted": true,
      "verificationStatus": "PENDING"
    },
    "business": {
      "businessId": 456,
      "userId": 123,
      "businessName": "SRKVD",
      "registrationNumber": "RERA948789599",
      "businessAddress": "FLAT - 601...",
      "businessEmail": "avi@gmail.com",
      "businessPhone": "+919631045873",
      "businessType": "AGENCY",
      "businessStatus": "PENDING_VERIFICATION",
      "verificationStatus": "PENDING"
    }
  },
  "meta": {
    "userId": 123,
    "updatedFields": ["firstName", "lastName", "phone", ...],
    "profileCompleted": true,
    "profileVideoUploaded": true
  }
}
```

### Step 4: Verify Database
```sql
-- Check user record
SELECT * FROM platform_user WHERE user_id = 123;

-- Check business record
SELECT * FROM partner_business WHERE user_id = 123;

-- Join query to see both
SELECT 
  u.user_id, u.user_first_name, u.user_last_name, u.user_account_type,
  b.business_id, b.business_name, b.registration_number, b.business_status
FROM platform_user u
LEFT JOIN partner_business b ON u.user_id = b.user_id
WHERE u.user_id = 123;
```

---

## 🎨 Benefits of This Architecture

### ✅ Separation of Concerns
- User data stays in `platform_user`
- Business data stays in `partner_business`
- Clear logical separation

### ✅ Scalability
- Easy to add new business types (DEVELOPER, BUILDER, etc.)
- Can extend business fields without affecting user table
- Can add business-specific features (documents, licenses, etc.)

### ✅ Data Integrity
- Foreign key constraints ensure referential integrity
- Cascade delete maintains consistency
- Proper indexing improves query performance

### ✅ Maintainability
- Clear service layer separation (UserService vs PartnerBusinessService)
- Easy to test business logic independently
- Simple to add business-related features

### ✅ Future-Proof
- Can add multiple businesses per user (change to hasMany)
- Can add business verification workflow
- Can add business document uploads
- Can add business team members

---

## 🚨 Important Notes

1. **One-to-One Relationship**: Currently, each user can have ONE business profile
2. **Cascade Delete**: Deleting a user will delete their business profile
3. **Soft Delete**: Business records are soft-deleted (paranoid mode)
4. **Required for AGENCY**: Business fields are required only when `accountType=AGENCY`
5. **Validation**: Both controller and Temporal activities validate business data
6. **Service Layer**: Always use PartnerBusinessService for business operations

---

## 📚 Related Documentation

- `AGENCY_ENHANCEMENT_SUMMARY.md` - Detailed implementation summary
- `QUICK_SETUP_GUIDE.md` - Quick 3-step setup guide
- `UPDATE_ROUTE_ANALYSIS.md` - Route analysis and data flow

---

## 🔧 Troubleshooting

### Issue: "Table 'partner_business' doesn't exist"
**Solution**: Run the migration file

### Issue: "Cannot read property 'business' of null"
**Solution**: Business is created only for AGENCY account type

### Issue: "Duplicate entry for key 'user_id'"
**Solution**: Each user can have only one business profile. Use update instead of create.

### Issue: "Validation failed: businessName is required"
**Solution**: When accountType=AGENCY, all business fields are required

---

## 🎉 You're All Set!

Your partner platform now has a **properly normalized database** with separate entities for users and businesses. The implementation follows **best practices** and is **scalable** for future enhancements.

**Happy Coding! 🚀**
