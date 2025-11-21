# Partner Business Entity - Implementation Summary

## Overview
Enhanced the partner platform backend to support **BUSINESS** account type with a separate **PartnerBusiness** entity for storing business/agency information. This follows proper database normalization principles.

## Architecture Design

### Separate Entity Approach ✅
Instead of adding agency fields directly to `platform_user` table, we created a separate `partner_business` table with a **one-to-one relationship**. This approach:
- Follows database normalization best practices
- Allows for future expansion (multiple businesses per user if needed)
- Keeps user and business data logically separated
- Makes queries more efficient and maintainable

## Changes Implemented

### 1. Database Migration ✅
**File**: `migrations/add-agency-columns.sql`

Created a new `partner_business` table with the following structure:
- `business_id` INT (Primary Key)
- `user_id` INT (Foreign Key → platform_user)
- `business_name` VARCHAR(200)
- `registration_number` VARCHAR(100)
- `business_address` TEXT
- `business_email` VARCHAR(100)
- `business_phone` VARCHAR(20)
- `business_type` ENUM (BUSINESS, DEVELOPER, BUILDER, CONSULTANT)
- `business_status` ENUM (ACTIVE, INACTIVE, SUSPENDED, PENDING_VERIFICATION)
- `verification_status` ENUM (PENDING, APPROVED, REJECTED)
- `verification_notes` TEXT
- `verified_at` DATETIME
- `verified_by` INT
- Timestamps and soft delete support

**Run the migration**:
```bash
mysql -u your_user -p your_database < migrations/add-agency-columns.sql
```

### 2. Entity Models ✅

#### **File**: `src/entity/PartnerBusiness.entity.js` (NEW)
Created a complete Sequelize entity model for partner businesses with:
- All business fields properly mapped
- Enum validations for business type and status
- Soft delete support (paranoid mode)
- Virtual fields for formatted dates
- Indexes on key fields for performance

#### **File**: `src/entity/PlatformUser.entity.js`
**Changes**:
- Updated `accountType` ENUM: `'INDIVIDUAL', 'AGENT', 'BUSINESS'`
- No agency fields added (kept clean)

#### **File**: `src/entity/index.js`
**Changes**:
- Added PartnerBusiness entity
- Defined relationships:
  - `PlatformUser hasOne PartnerBusiness` (as 'business')
  - `PartnerBusiness belongsTo PlatformUser` (as 'user')

### 3. Controller Validation ✅
**File**: `src/controller/User.controller.js`

**Changes**:
- Added agency fields to `allowedFields` array
- Enhanced profile completion validation to check agency-specific required fields when `accountType=BUSINESS`
- Added email validation for `agencyEmail`
- Added phone validation for `agencyPhone`
- Updated account type validation to include 'BUSINESS'
- Included agency fields in Temporal workflow payload

**Validation Rules for BUSINESS**:
When `accountType=BUSINESS` and `completeProfile=true`, the following fields are **required**:
- agencyName
- agencyRegistrationNumber
- agencyAddress
- agencyEmail (must be valid email format)
- agencyPhone (must be valid phone format)

### 4. Business Service ✅
**File**: `src/service/PartnerBusiness.service.js` (NEW)

Created a complete service module with functions:
- `createOrUpdateBusiness(userId, businessData)` - Create or update business profile
- `getBusinessByUserId(userId)` - Get business by user ID
- `getBusinessById(businessId)` - Get business by business ID
- `updateVerificationStatus(businessId, status, notes, verifiedBy)` - Update verification
- `getAllBusinesses(filters, page, limit)` - Get paginated business list with filters
- `deleteBusiness(businessId)` - Soft delete business

### 5. User Service ✅
**File**: `src/service/UserService.service.js`

No changes needed - kept focused on user data only.

### 5. Temporal Workflow ✅
**File**: `src/temporal/workflows/user/partnerOnboarding.workflow.js`

**Changes**:
- Updated JSDoc comment to reflect agency data handling

### 6. Temporal Workflow ✅
**File**: `src/temporal/workflows/user/partnerOnboarding.workflow.js`

**Changes**:
- Added `businessData` parameter to workflow input
- Added `validateBusinessData` activity proxy
- Added `createPartnerBusiness` activity proxy
- Updated workflow steps to validate and create business profile
- Returns business data in success response

### 7. Temporal Activities ✅
**File**: `src/temporal/activities/user/partnerOnboarding.activities.js`

**New Activities**:
- `validateBusinessData(businessData)` - Validates all business fields with email/phone format checks
- `createPartnerBusiness({userId, businessData})` - Creates/updates business record via service

**Updated Activities**:
- `validateProfileData()` - Simplified, removed agency field validation (now in validateBusinessData)
- `updatePartnerUser()` - Simplified, removed agency field handling (now in createPartnerBusiness)

## Database Relationships

```
platform_user (1) ←→ (1) partner_business
   user_id                    user_id (FK)
   
One user can have ONE business profile
One business profile belongs to ONE user
```

## API Request Example

```http
PATCH /partnerUser/update
Content-Type: multipart/form-data
Authorization: Bearer <token>

firstName=TECHFUSION
lastName=STUDIO
phone=+919631045873
accountType=BUSINESS
latitude=22.7803136
longitude=86.2650368
address=Jamshedpur, Golmuri-Cum-Jugsalai, East Singhbhum, Jharkhand, 831001, India
completeProfile=true
agencyName=SRKVD
agencyRegistrationNumber=RERA948789599
agencyAddress=FLAT - 601, BLOCK A , ELEGANT HEIGHT,  NEAR LOYOLA SCHOOL TELCO, TELCO COLONY, JAMSHEDPUR, JHARKHAND
agencyEmail=avikumarshooters@gmail.com
agencyPhone=+919631045873
profileVideo=<binary file>
```

**Note**: The controller extracts business fields separately and stores them in the `partner_business` table.

## Validation Flow

### When `accountType=BUSINESS` and `completeProfile=true`:

1. **Controller Level**:
   - Validates all basic profile fields (firstName, lastName, phone, location, profileVideo)
   - Validates all agency fields (agencyName, agencyRegistrationNumber, agencyAddress, agencyEmail, agencyPhone)
   - Validates email format for agencyEmail
   - Validates phone format for agencyPhone

2. **Temporal Workflow** (if enabled):
   - `validateProfileData` activity repeats validation with same rules
   - Returns detailed errors if validation fails
   - Continues to video upload and database update only if validation passes

3. **Database Update**:
   - User data saved to `platform_user` table
   - Business data saved to `partner_business` table (via PartnerBusinessService)
   - `profileCompleted` set to `true`
   - `verificationStatus` set to `PENDING`
   - `userStatus` set to `ACTIVE`
   - Business status set to `PENDING_VERIFICATION`

## Response Examples

### Success Response
```json
{
  "success": true,
  "message": "Profile submitted for verification successfully",
  "data": {
    "user": {
      "userId": 123,
      "firstName": "TECHFUSION",
      "lastName": "STUDIO",
      "phone": "+919631045873",
      "accountType": "BUSINESS",
      "profileCompleted": true,
      "verificationStatus": "PENDING",
      "profileVideo": "/uploads/profile-videos/video-123456.mp4"
    },
    "business": {
      "businessId": 456,
      "userId": 123,
      "businessName": "SRKVD",
      "registrationNumber": "RERA948789599",
      "businessAddress": "FLAT - 601, BLOCK A , ELEGANT HEIGHT...",
      "businessEmail": "avikumarshooters@gmail.com",
      "businessPhone": "+919631045873",
      "businessType": "BUSINESS",
      "businessStatus": "PENDING_VERIFICATION",
      "verificationStatus": "PENDING"
    }
  }
}
```

**Note**: User and business data are now returned separately in the response.

### Validation Error Response
```json
{
  "success": false,
  "message": "Missing required fields for profile completion: agencyName, agencyEmail",
  "error": {
    "message": "Missing required fields",
    "code": "VALIDATION_ERROR",
    "source": "updateUser"
  },
  "meta": {
    "missingFields": ["agencyName", "agencyEmail"]
  }
}
```

## Testing Checklist

- [ ] Run database migration
- [ ] Restart application to load new entity model
- [ ] Test BUSINESS profile creation with all required fields
- [ ] Test validation errors when agency fields are missing
- [ ] Test email format validation for agencyEmail
- [ ] Test phone format validation for agencyPhone
- [ ] Test profile completion with Temporal workflow enabled
- [ ] Test profile completion with Temporal workflow disabled
- [ ] Verify data is correctly stored in database
- [ ] Test retrieval of user with agency data

## Database Migration Command

```bash
# For MySQL
mysql -u your_username -p your_database < migrations/add-agency-columns.sql

# Or manually connect and run:
mysql -u your_username -p
use your_database;
source migrations/add-agency-columns.sql;
```

## Architecture Benefits

✅ **Separation of Concerns**: User data and business data are logically separated
✅ **Scalability**: Easy to extend with more business types (DEVELOPER, BUILDER, etc.)
✅ **Data Integrity**: Foreign key constraints ensure referential integrity
✅ **Query Efficiency**: Indexes on business fields improve search performance
✅ **Future-Proof**: Can easily add features like business verification history, documents, etc.

## Notes

- Business data is stored in a **separate table** (`partner_business`), not in `platform_user`
- One-to-one relationship: Each user can have ONE business profile
- Business fields are optional for `INDIVIDUAL` and `AGENT` account types
- Business fields are mandatory only when `accountType=BUSINESS` and `completeProfile=true`
- The Temporal workflow automatically handles business validation and creation
- Business records support soft delete (paranoid mode)

## Next Steps

1. **Run the database migration** to add new columns
2. **Restart your Node.js server** to load the updated entity model
3. **Test the API** with the provided payload
4. **Update frontend forms** to collect agency information when BUSINESS is selected
5. **Update documentation** for API consumers

## Questions or Issues?

If you encounter any issues:
1. Check that the migration ran successfully
2. Verify the entity model loaded correctly (check server logs)
3. Ensure Temporal is configured if you're using async workflows
4. Check validation error messages for specific field issues
