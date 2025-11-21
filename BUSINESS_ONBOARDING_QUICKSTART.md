# Business Partner Onboarding - Quick Reference

## API Endpoint

**POST** `/api/partnerUser/businessOnboarding`

## Required Headers
```
Authorization: Bearer <your-token>
Content-Type: multipart/form-data
```

## Request Body (multipart/form-data)

| Field | Type | Required | Example |
|-------|------|----------|---------|
| `businessName` | string | ✅ Yes | VIRTUSA CONSULTING PVT LTD |
| `registrationNumber` | string | ✅ Yes | jhhnfjtmnfjmtjfj |
| `businessAddress` | string | ✅ Yes | FLAT - 601, Block A, Elegant Height, Telco Jamshedpur |
| `businessEmail` | string | ✅ Yes | avikumarshooters@gmail.com |
| `businessPhones` | JSON string | ✅ Yes | [{"phone":"9631045873"}] |
| `ownerVideo` | file | ✅ Yes | (binary video file) |

## businessPhones Format

Must be a **JSON string** containing an array of objects:

### Single Phone
```json
[{"phone":"9631045873"}]
```

### Multiple Phones
```json
[
  {"phone":"9631045873"},
  {"phone":"9876543210"}
]
```

## Sample Requests

### cURL
```bash
curl -X POST http://localhost:3000/api/partnerUser/businessOnboarding \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "businessName=VIRTUSA CONSULTING PVT LTD" \
  -F "registrationNumber=jhhnfjtmnfjmtjfj" \
  -F "businessAddress=FLAT - 601, Block A, Elegant Height, Telco Jamshedpur" \
  -F "businessEmail=avikumarshooters@gmail.com" \
  -F 'businessPhones=[{"phone":"9631045873"}]' \
  -F "ownerVideo=@/path/to/video.mp4"
```

### JavaScript (axios)
```javascript
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('businessName', 'VIRTUSA CONSULTING PVT LTD');
form.append('registrationNumber', 'jhhnfjtmnfjmtjfj');
form.append('businessAddress', 'FLAT - 601, Block A, Elegant Height, Telco Jamshedpur');
form.append('businessEmail', 'avikumarshooters@gmail.com');
form.append('businessPhones', JSON.stringify([{"phone":"9631045873"}]));
form.append('ownerVideo', fs.createReadStream('/path/to/video.mp4'));

const response = await axios.post(
  'http://localhost:3000/api/partnerUser/businessOnboarding',
  form,
  {
    headers: {
      ...form.getHeaders(),
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  }
);
```

### Postman
1. **Method**: POST
2. **URL**: `http://localhost:3000/api/partnerUser/businessOnboarding`
3. **Headers**:
   - `Authorization`: `Bearer YOUR_TOKEN`
4. **Body** (form-data):
   - `businessName`: `VIRTUSA CONSULTING PVT LTD`
   - `registrationNumber`: `jhhnfjtmnfjmtjfj`
   - `businessAddress`: `FLAT - 601, Block A, Elegant Height, Telco Jamshedpur`
   - `businessEmail`: `avikumarshooters@gmail.com`
   - `businessPhones`: `[{"phone":"9631045873"}]`
   - `ownerVideo`: (select file)

## Success Response (202 Accepted)

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

## Error Responses

### Missing Fields (400)
```json
{
  "status": "error",
  "message": "Missing required fields for business onboarding: businessName, ownerVideo",
  "data": null,
  "meta": {
    "missingFields": ["businessName", "ownerVideo"]
  },
  "error": {
    "message": "Missing required fields",
    "code": "VALIDATION_ERROR"
  }
}
```

### Invalid Email (400)
```json
{
  "status": "error",
  "message": "Invalid business email format",
  "error": {
    "message": "Business email must be a valid email address",
    "code": "VALIDATION_ERROR"
  }
}
```

### Invalid Phone Format (400)
```json
{
  "status": "error",
  "message": "Invalid phone number format at index 0",
  "error": {
    "message": "Phone number must contain only digits, spaces, +, -, ()",
    "code": "VALIDATION_ERROR"
  }
}
```

## Validation Rules

✅ **businessName**: 
- Required
- Minimum 2 characters

✅ **registrationNumber**: 
- Required

✅ **businessAddress**: 
- Required
- Minimum 10 characters

✅ **businessEmail**: 
- Required
- Valid email format (contains @ and domain)

✅ **businessPhones**: 
- Required
- Must be JSON array
- At least one phone required
- Each phone must match pattern: `[+]?[\d\s\-()]+`

✅ **ownerVideo**: 
- Required
- Binary file (mp4, mov, avi, etc.)

## Workflow Steps

1. ✅ **Validate** - All business data validated
2. ✅ **Upload** - Owner video uploaded to Supabase/S3
3. ✅ **Create** - Business record created in database
4. ✅ **Notify** - Email sent to business owner

## Database

### Table: `partner_business`

```sql
business_id           SERIAL PRIMARY KEY
user_id              INTEGER (references platform_user)
business_name        VARCHAR(200)
registration_number  VARCHAR(100)
business_address     TEXT
business_email       VARCHAR(100)
business_phone       JSONB (array of phone objects)
owner_video          TEXT (S3 URL)
verification_status  ENUM('PENDING', 'APPROVED', 'REJECTED')
```

## Files Location

```
src/
├── controller/User.controller.js
│   └── onboardBusinessPartner()
├── routes/user.route.js
│   └── POST /partnerUser/businessOnboarding
├── temporal/
│   ├── workflows/user/partnerBusinessOnboarding.workflow.js
│   └── activities/user/partnerBusinessOnboarding.activities.js
└── entity/PartnerBusiness.entity.js
```

## Comparison with Partner User Onboarding

| Feature | Partner User | Business Partner |
|---------|--------------|------------------|
| **Endpoint** | `/partnerUser/onboarding` | `/partnerUser/businessOnboarding` |
| **Video Field** | `profileVideo` | `ownerVideo` |
| **Location** | Required | Not required |
| **Phone** | Single string | Array of objects |
| **Table** | `platform_user` | `partner_business` |

## Testing Checklist

- [ ] Test with valid data
- [ ] Test with missing businessName
- [ ] Test with missing registrationNumber
- [ ] Test with missing businessAddress
- [ ] Test with invalid email format
- [ ] Test with empty businessPhones array
- [ ] Test with invalid phone format
- [ ] Test with missing ownerVideo
- [ ] Test with multiple phones
- [ ] Test with invalid JSON in businessPhones
- [ ] Verify video upload to S3
- [ ] Verify database record creation
- [ ] Verify email notification sent
- [ ] Verify workflow ID returned

## Support

For questions or issues, check:
- `BUSINESS_ONBOARDING_IMPLEMENTATION.md` - Full implementation details
- `ONBOARDING_FLOW_COMPARISON.md` - Comparison with partner user flow
- Server logs in `logs/` directory
- Temporal UI at `http://localhost:8233`
