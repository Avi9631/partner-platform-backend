# Quick Setup Guide - Partner Business Entity

## 🚀 Quick Start (3 Steps)

**Architecture**: Separate `partner_business` table for business/agency data (follows best practices)

### Step 1: Run Database Migration
```bash
# Navigate to your backend directory
cd "d:\my codes\partner-platform-backend"

# Run the migration
mysql -u your_username -p your_database < migrations/add-agency-columns.sql

# Or for PostgreSQL:
psql -U your_username -d your_database -f migrations/add-agency-columns.sql
```

### Step 2: Restart Your Server
```bash
# Stop current server (Ctrl+C if running)
# Then restart
npm run dev
```

### Step 3: Test the API
Use the test payload from your original request!

---

## ✅ What Was Enhanced

### Before
```javascript
// ❌ These fields were IGNORED (no table to store them)
agencyName: "SRKVD"
agencyRegistrationNumber: "RERA948789599"
agencyAddress: "FLAT - 601..."
agencyEmail: "avikumarshooters@gmail.com"
agencyPhone: "+919631045873"
```

### After
```javascript
// ✅ Now VALIDATED and SAVED to partner_business table
agencyName: "SRKVD"                    → partner_business.business_name
agencyRegistrationNumber: "RERA948789599"  → partner_business.registration_number
agencyAddress: "FLAT - 601..."         → partner_business.business_address
agencyEmail: "avikumarshooters@gmail.com" → partner_business.business_email (validated)
agencyPhone: "+919631045873"           → partner_business.business_phone (validated)
```

### Architecture
```
User Data (platform_user)  +  Business Data (partner_business)
✅ Separate tables
✅ One-to-one relationship
✅ Proper normalization
```

---

## 📋 Validation Rules

### For ALL Users (completing profile)
- ✅ firstName
- ✅ lastName
- ✅ phone
- ✅ latitude/longitude
- ✅ profileVideo

### Additional for BUSINESS Users
- ✅ agencyName (required)
- ✅ agencyRegistrationNumber (required)
- ✅ agencyAddress (required)
- ✅ agencyEmail (required, must be valid email)
- ✅ agencyPhone (required, must be valid phone)

---

## 🧪 Test Your Payload

Your exact payload will now work:

```javascript
POST /partnerUser/update

firstName=TECHFUSION
lastName=STUDIO
phone=+919631045873
accountType=BUSINESS          // ✅ Now supported
latitude=22.7803136
longitude=86.2650368
address=Jamshedpur, Golmuri-Cum-Jugsalai, East Singhbhum...
completeProfile=true
agencyName=SRKVD            // ✅ Now saved
agencyRegistrationNumber=RERA948789599  // ✅ Now saved
agencyAddress=FLAT - 601... // ✅ Now saved
agencyEmail=avikumarshooters@gmail.com // ✅ Now validated & saved
agencyPhone=+919631045873   // ✅ Now validated & saved
profileVideo=(binary)
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Profile submitted for verification successfully",
  "data": {
    "user": {
      "userId": 123,
      "accountType": "BUSINESS",
      "profileCompleted": true,
      "verificationStatus": "PENDING"
    },
    "business": {
      "businessId": 456,
      "userId": 123,
      "businessName": "SRKVD",
      "registrationNumber": "RERA948789599",
      "businessEmail": "avikumarshooters@gmail.com",
      "businessStatus": "PENDING_VERIFICATION"
    }
  }
}
```

---

## 🔍 Troubleshooting

### Error: "Missing required fields: agencyName, agencyEmail"
**Cause**: You're using `accountType=BUSINESS` but didn't provide all agency fields
**Fix**: Provide all 5 required agency fields

### Error: "Invalid agency email format"
**Cause**: agencyEmail is not a valid email
**Fix**: Use proper email format (e.g., name@domain.com)

### Error: "Table 'partner_business' doesn't exist"
**Cause**: Migration not run yet
**Fix**: Run the database migration (Step 1 above)

### Error: "Invalid account type"
**Cause**: Using old 'ORGANIZATION' instead of 'BUSINESS'
**Fix**: Use `accountType=BUSINESS`

---

## 📊 Database Schema Changes

### New Table: `partner_business`

| Column Name | Type | Description |
|------------|------|-------------|
| `business_id` | INT (PK) | Primary key |
| `user_id` | INT (FK) | Foreign key to platform_user |
| `business_name` | VARCHAR(200) | Name of the business/agency |
| `registration_number` | VARCHAR(100) | RERA/Registration number |
| `business_address` | TEXT | Registered office address |
| `business_email` | VARCHAR(100) | Official business email |
| `business_phone` | VARCHAR(20) | Official business phone |
| `business_type` | ENUM | BUSINESS, DEVELOPER, BUILDER, CONSULTANT |
| `business_status` | ENUM | Status of the business |
| `verification_status` | ENUM | Verification status |

### Relationship
```
platform_user (1) ←→ (1) partner_business
```

### ENUM Change in `platform_user`
- **Before**: `user_account_type` = ENUM('INDIVIDUAL', 'AGENT', 'ORGANIZATION')
- **After**: `user_account_type` = ENUM('INDIVIDUAL', 'AGENT', 'BUSINESS')

---

## 🎯 Complete Workflow

```
1. User submits profile with accountType=BUSINESS
                    ↓
2. Controller validates all agency fields
                    ↓
3. If Temporal enabled → Workflow processes
   If Temporal disabled → Direct DB update
                    ↓
4. Agency data saved to platform_user table
                    ↓
5. User receives confirmation email
                    ↓
6. Profile status = PENDING (awaiting verification)
```

---

## 📝 Files Changed

1. ✅ `migrations/add-agency-columns.sql` - Creates partner_business table
2. ✅ `src/entity/PartnerBusiness.entity.js` - NEW entity model
3. ✅ `src/entity/index.js` - Added relationships
4. ✅ `src/entity/PlatformUser.entity.js` - Updated ENUM only
5. ✅ `src/service/PartnerBusiness.service.js` - NEW business service
6. ✅ `src/controller/User.controller.js` - Handles business creation
7. ✅ `src/temporal/workflows/user/partnerOnboarding.workflow.js` - Added business steps
8. ✅ `src/temporal/activities/user/partnerOnboarding.activities.js` - New business activities

---

## 🚦 Ready to Deploy?

### Checklist
- [ ] Database migration executed successfully
- [ ] Server restarted
- [ ] API tested with BUSINESS payload
- [ ] Verified data saved in database
- [ ] Frontend updated to collect agency fields (if applicable)

### Migration Verification
```sql
-- Check if table was created
SHOW TABLES LIKE 'partner_business';

-- Check table structure
DESCRIBE partner_business;

-- Should show all business fields including:
-- business_id, user_id, business_name, registration_number, etc.

-- Verify relationship
SELECT * FROM partner_business WHERE user_id = YOUR_USER_ID;
```

---

## 💡 Pro Tips

1. **For Testing**: Use Postman or curl to test the enhanced route
2. **For Production**: Update frontend forms to show agency fields when BUSINESS is selected
3. **For Existing Data**: If you have users with `accountType=ORGANIZATION`, update them to `BUSINESS`
4. **For Validation**: Agency fields are only required when `accountType=BUSINESS` AND `completeProfile=true`

---

## ❓ Questions?

Check the detailed documentation:
- `AGENCY_ENHANCEMENT_SUMMARY.md` - Full implementation details
- `UPDATE_ROUTE_ANALYSIS.md` - Route analysis and data flow

**You're all set! 🎉**
