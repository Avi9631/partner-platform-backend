# Developer Publishing API - Quick Reference

## API Endpoints Summary

### Base URL
```
http://localhost:3000/api/developer
```

---

## Public Endpoints (No Authentication Required)

### 1. List Developers
```http
GET /api/developer/list
```

**Query Parameters:**
- `developerType` - Filter by type (International Developer, National Developer, Regional Developer)
- `publishStatus` - Filter by status (DRAFT, PENDING_REVIEW, APPROVED, REJECTED, PUBLISHED)
- `verificationStatus` - Filter by verification (PENDING, AUTOMATED_REVIEW, MANUAL_REVIEW, APPROVED, REJECTED)
- `operatingState` - Filter by operating state
- `projectType` - Filter by project type
- `search` - Search in name and description
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Example:**
```bash
GET /api/developer/list?developerType=National Developer&page=1&limit=10
```

### 2. Get Developer by Slug
```http
GET /api/developer/slug/:slug
```

**Example:**
```bash
GET /api/developer/slug/godrej-properties
```

### 3. Get Developer by ID
```http
GET /api/developer/:developerId
```

**Example:**
```bash
GET /api/developer/1
```

---

## Protected Endpoints (Requires Authentication)

### 4. Publish Developer
```http
POST /api/developer/publishDeveloper
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "draftId": 123
}
```

**Note:** The developer data must first be saved in a draft using the draft API endpoints. The `draftType` should be set to 'DEVELOPER' when creating/updating the draft.

**Draft Creation Example:**
```json
POST /api/draft/createListingDraft
{
  "draftType": "DEVELOPER"
}

PATCH /api/draft/updateListingDraft
{
  "draftId": 123,
  "draftData": {
    "developerName": "Godrej Properties",
    "developerType": "National Developer",
    "description": "Leading real estate developer in India",
    "establishedYear": 1990,
    "registrationNumber": "REG123456",
    "primaryContactEmail": "contact@godrejproperties.com",
    "primaryContactPhone": "+919876543210",
    "socialLinks": [
      {
        "type": "website",
        "url": "https://godrejproperties.com"
      },
      {
        "type": "linkedin",
        "url": "https://linkedin.com/company/godrej"
      }
    ],
    "totalProjectsCompleted": 150,
    "totalProjectsOngoing": 25,
    "totalUnitsDelivered": 50000,
    "projectTypes": ["Residential", "Commercial", "Integrated Township"],
    "operatingStates": ["Maharashtra", "Karnataka", "NCR", "Tamil Nadu"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Developer profile published successfully",
  "data": {
    "developerId": 1,
    "publishStatus": "APPROVED",
    "verificationStatus": "AUTOMATED_REVIEW",
    "requiresManualReview": false,
    "automatedVerificationScore": 100,
    "developer": {
      "developerId": 1,
      "developerName": "Godrej Properties",
      "developerType": "National Developer",
      "slug": "godrej-properties",
      "publishStatus": "APPROVED",
      "verificationStatus": "AUTOMATED_REVIEW"
    }
  }
}
```

### 5. Get My Developer Profile
```http
GET /api/developer/my-profile
Authorization: Bearer <token>
```

### 6. Update Developer Profile
```http
PATCH /api/developer/updateDeveloper/:developerId
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:** (partial update supported)
```json
{
  "description": "Updated description",
  "totalProjectsCompleted": 155,
  "totalProjectsOngoing": 27
}
```

### 7. Delete Developer Profile
```http
DELETE /api/developer/:developerId
Authorization: Bearer <token>
```

---

## Admin Endpoints (Requires Authentication + Admin Role)

### 8. Update Publish Status
```http
PATCH /api/developer/:developerId/publish-status
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "PUBLISHED",
  "notes": "Approved after review"
}
```

**Valid Status Values:**
- `DRAFT`
- `PENDING_REVIEW`
- `APPROVED`
- `REJECTED`
- `PUBLISHED`

### 9. Update Verification Status
```http
PATCH /api/developer/:developerId/verification-status
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "APPROVED",
  "notes": "All verification checks passed"
}
```

**Valid Status Values:**
- `PENDING`
- `AUTOMATED_REVIEW`
- `MANUAL_REVIEW`
- `APPROVED`
- `REJECTED`

---

## Field Validations

### Required Fields
- `developerName` (min 2, max 100 characters)
- `developerType` (enum: International/National/Regional Developer)
- `establishedYear` (1900 to current year)
- `primaryContactEmail` (valid email format)
- `primaryContactPhone` (valid phone format)
- `totalProjectsCompleted` (integer ≥ 0)
- `totalProjectsOngoing` (integer ≥ 0)
- `projectTypes` (array, min 1 item)
- `operatingStates` (array, min 1 item)

### Optional Fields
- `description` (50-1000 characters if provided)
- `registrationNumber` (5-50 characters if provided)
- `socialLinks` (array of objects with type and url)
- `totalUnitsDelivered` (integer ≥ 0)

### Valid Project Types
- Residential
- Commercial
- Mixed Use
- Plotted Development
- Integrated Township
- Villa Projects
- Affordable Housing
- Luxury Housing
- Retail
- IT Parks
- Industrial

### Valid Social Link Types
- website
- facebook
- instagram
- linkedin
- youtube
- twitter
- other

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

---

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Workflow Process

When a developer is published via `POST /api/developer/publishDeveloper`:

1. **Validation** - All fields are validated
2. **Database Creation** - Developer record is created
3. **Automated Verification** - Scoring system (0-100):
   - Valid name: +25 points
   - Valid contact info: +25 points
   - Has project history: +25 points
   - Has operating locations: +25 points
4. **Status Assignment**:
   - Score ≥75: APPROVED + AUTOMATED_REVIEW
   - Score 50-74: PENDING_REVIEW + MANUAL_REVIEW
   - Score <50: PENDING_REVIEW + PENDING
5. **Notification** - Email sent to user
6. **Event Logging** - Analytics event logged

---

## Frontend Integration

### Example with Axios

```javascript
import apiClient from '@/lib/apiClient';

// Create draft first
const createDeveloperDraft = async () => {
  const response = await apiClient.post('/api/draft/createListingDraft', {
    draftType: 'DEVELOPER'
  });
  return response.data.data; // Returns draft with draftId
};

// Update draft with developer data
const updateDeveloperDraft = async (draftId, formData) => {
  const response = await apiClient.patch('/api/draft/updateListingDraft', {
    draftId,
    draftData: formData,
    draftType: 'DEVELOPER'
  });
  return response.data;
};

// Publish Developer from draft
const publishDeveloper = async (draftId) => {
  try {
    const response = await apiClient.post('/api/developer/publishDeveloper', {
      draftId
    });
    return response.data;
  } catch (error) {
    console.error('Error publishing developer:', error);
    throw error;
  }
};

// Get Developer List
const getDevelopers = async (filters) => {
  try {
    const response = await apiClient.get('/api/developer/list', {
      params: filters
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching developers:', error);
    throw error;
  }
};

// Get Developer by Slug
const getDeveloperBySlug = async (slug) => {
  try {
    const response = await apiClient.get(`/api/developer/slug/${slug}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching developer:', error);
    throw error;
  }
};
```

---

## Database Schema

### Table: `developer`

**Columns:**
- `developer_id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER, FK to platform_user)
- `developer_name` (VARCHAR 200)
- `developer_type` (ENUM)
- `description` (TEXT)
- `established_year` (INTEGER)
- `registration_number` (VARCHAR 100)
- `primary_contact_email` (VARCHAR 150)
- `primary_contact_phone` (VARCHAR 20)
- `social_links` (JSONB)
- `total_projects_completed` (INTEGER)
- `total_projects_ongoing` (INTEGER)
- `total_units_delivered` (INTEGER)
- `project_types` (TEXT[])
- `operating_states` (TEXT[])
- `publish_status` (ENUM)
- `verification_status` (ENUM)
- `verification_notes` (TEXT)
- `verified_at` (TIMESTAMP)
- `verified_by` (INTEGER, FK to platform_user)
- `published_at` (TIMESTAMP)
- `slug` (VARCHAR 300, UNIQUE)
- `meta_title` (VARCHAR 200)
- `meta_description` (TEXT)
- `view_count` (INTEGER)
- `inquiry_count` (INTEGER)
- `developer_created_at` (TIMESTAMP)
- `developer_updated_at` (TIMESTAMP)
- `developer_deleted_at` (TIMESTAMP)

**Indexes:**
- `idx_developer_user_id`
- `idx_developer_slug`
- `idx_developer_publish_status`
- `idx_developer_type`
- `idx_developer_verification_status`
- GIN indexes on arrays and JSONB

---

## Testing Commands

### cURL Examples

#### Create Developer Draft
```bash
curl -X POST http://localhost:3000/api/draft/createListingDraft \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"draftType": "DEVELOPER"}'
```

#### Update Developer Draft
```bash
curl -X PATCH http://localhost:3000/api/draft/updateListingDraft \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": 123,
    "draftData": {
      "developerName": "Test Developer",
      "developerType": "Regional Developer",
      "establishedYear": 2010,
      "primaryContactEmail": "test@example.com",
      "primaryContactPhone": "9876543210",
      "totalProjectsCompleted": 10,
      "totalProjectsOngoing": 5,
      "projectTypes": ["Residential"],
      "operatingStates": ["Maharashtra"]
    },
    "draftType": "DEVELOPER"
  }'
```

#### Publish Developer from Draft
```bash
curl -X POST http://localhost:3000/api/developer/publishDeveloper \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"draftId": 123}'
```

#### List Developers
```bash
curl -X GET "http://localhost:3000/api/developer/list?page=1&limit=10"
```

#### Get Developer by Slug
```bash
curl -X GET "http://localhost:3000/api/developer/slug/test-developer"
```

---

## Troubleshooting

### Common Errors

**Error: "Developer profile already exists for this user"**
- Each user can only have one developer profile
- Check if profile already exists with `GET /api/developer/my-profile`

**Error: "Missing required fields"**
- Ensure all required fields are provided
- Check field names match exactly (camelCase)

**Error: "Invalid developer type"**
- Must be exactly: "International Developer", "National Developer", or "Regional Developer"

**Error: "Failed to publish developer profile"**
- Check if Temporal worker is running
- Backend will fallback to direct creation if workflow unavailable

---

## Support Files

- **Entity:** `src/entity/Developer.entity.js`
- **Service:** `src/service/DeveloperService.service.js`
- **Controller:** `src/controller/Developer.controller.js`
- **Routes:** `src/routes/developer.route.js`
- **Workflow:** `src/temporal/workflows/developer/developerPublishing.workflow.js`
- **Activities:** `src/temporal/activities/developer/developerPublishing.activities.js`
- **Migration:** `migrations/create-developer-table.sql`
- **Full Guide:** `DEVELOPER_PUBLISHING_GUIDE.md`
