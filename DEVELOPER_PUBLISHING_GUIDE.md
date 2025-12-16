# Developer Publishing Backend Implementation

## Overview
Complete backend implementation for publishing developer profiles with Temporal workflow orchestration, automated verification, and comprehensive API endpoints.

## Architecture Components

### 1. Database Entity
**File:** `src/entity/Developer.entity.js`

**Fields:**
- **Basic Information:**
  - `developerName` (required) - Developer/Company name
  - `developerType` (required) - International/National/Regional Developer
  - `description` (optional) - Detailed description
  - `establishedYear` (required) - Year established
  - `registrationNumber` (optional) - Business registration number

- **Contact Information:**
  - `primaryContactEmail` (required) - Primary email
  - `primaryContactPhone` (required) - Primary phone
  - `socialLinks` (JSONB array) - Social media links with type and URL

- **Projects & Portfolio:**
  - `totalProjectsCompleted` - Total completed projects count
  - `totalProjectsOngoing` - Total ongoing projects count
  - `totalUnitsDelivered` (optional) - Total units delivered
  - `projectTypes` (array) - Types of projects (Residential, Commercial, etc.)
  - `operatingStates` (array) - States where developer operates

- **Status & Verification:**
  - `publishStatus` - DRAFT | PENDING_REVIEW | APPROVED | REJECTED | PUBLISHED
  - `verificationStatus` - PENDING | AUTOMATED_REVIEW | MANUAL_REVIEW | APPROVED | REJECTED
  - `verificationNotes` - Admin/system verification notes
  - `verifiedAt` - Verification timestamp
  - `verifiedBy` - User ID of verifier
  - `publishedAt` - Publication timestamp

- **SEO & Metadata:**
  - `slug` (unique) - URL-friendly identifier
  - `metaTitle` - SEO meta title
  - `metaDescription` - SEO meta description

- **Analytics:**
  - `viewCount` - Profile view counter
  - `inquiryCount` - Inquiry counter

### 2. Service Layer
**File:** `src/service/DeveloperService.service.js`

**Functions:**
- `createDeveloper(userId, developerData)` - Create new developer record
- `updateDeveloper(developerId, userId, updateData)` - Update developer profile
- `getDeveloperById(developerId)` - Fetch by ID
- `getDeveloperBySlug(slug)` - Fetch by slug (auto-increments view count)
- `getDeveloperByUserId(userId)` - Fetch user's developer profile
- `listDevelopers(filters, page, limit)` - List with filters and pagination
- `updatePublishStatus(developerId, status, notes)` - Update publish status
- `updateVerificationStatus(developerId, status, verifiedBy, notes)` - Update verification
- `deleteDeveloper(developerId, userId)` - Soft delete

**Features:**
- Automatic slug generation from developer name
- Unique slug enforcement with auto-incrementing
- Authorization checks (user ownership)
- Comprehensive filtering and pagination

### 3. Controller Layer
**File:** `src/controller/Developer.controller.js`

**Endpoints:**
- `publishDeveloper` - Main endpoint to publish developer (triggers Temporal workflow)
- `updateDeveloper` - Update developer profile
- `getDeveloper` - Get by ID
- `getDeveloperBySlug` - Get by slug (public)
- `getMyDeveloperProfile` - Get current user's profile
- `listDevelopers` - List with filters
- `updatePublishStatus` - Admin endpoint to update status
- `updateVerificationStatus` - Admin endpoint to update verification
- `deleteDeveloper` - Delete profile

**Features:**
- Field validation
- Temporal workflow integration with fallback
- Error handling and logging
- Response formatting

### 4. Routes
**File:** `src/routes/developer.route.js`

**API Endpoints:**

#### Public Endpoints
- `GET /api/developer/list` - List developers with filters
- `GET /api/developer/slug/:slug` - Get by slug
- `GET /api/developer/:developerId` - Get by ID

#### Protected Endpoints (Requires Authentication)
- `POST /api/developer/publishDeveloper` - Publish new developer
- `GET /api/developer/my-profile` - Get own profile
- `PATCH /api/developer/updateDeveloper/:developerId` - Update profile
- `DELETE /api/developer/:developerId` - Delete profile

#### Admin Endpoints (Requires Authentication)
- `PATCH /api/developer/:developerId/publish-status` - Update publish status
- `PATCH /api/developer/:developerId/verification-status` - Update verification

### 5. Temporal Workflow
**File:** `src/temporal/workflows/developer/developerPublishing.workflow.js`

**Workflow Steps:**
1. **Validate Developer Data** - Comprehensive field validation
2. **Create Developer Record** - Insert into database
3. **Perform Automated Verification** - Score-based verification (0-100)
4. **Update Verification Status** - Based on automated checks
5. **Update Publish Status** - Set to APPROVED or PENDING_REVIEW
6. **Log Publishing Event** - Analytics logging
7. **Send Notification Email** - Notify user of publication

**Verification Logic:**
- 25 points: Valid name (≥2 characters)
- 25 points: Valid contact information
- 25 points: Has project history
- 25 points: Has operating locations

**Status Decisions:**
- Score ≥75: AUTOMATED_REVIEW + APPROVED
- Score 50-74: MANUAL_REVIEW + PENDING_REVIEW
- Score <50: PENDING + PENDING_REVIEW

### 6. Temporal Activities
**File:** `src/temporal/activities/developer/developerPublishing.activities.js`

**Activities:**
- `validateDeveloperData` - Validate all required fields and business rules
- `createDeveloperRecord` - Create database record
- `updateDeveloperPublishStatus` - Update publish status
- `updateDeveloperVerificationStatus` - Update verification status
- `performAutomatedVerification` - Run automated checks
- `sendDeveloperPublishingNotification` - Send email notification
- `logDeveloperEvent` - Log analytics events

## Database Migration

**File:** `migrations/create-developer-table.sql`

Run this migration to create the developer table:

```bash
psql -U your_username -d your_database -f migrations/create-developer-table.sql
```

The migration includes:
- Table creation with all fields
- Enum type definitions
- Indexes for performance
- GIN indexes for array/JSONB columns
- Constraints and checks
- Automatic timestamp updates
- Comments and documentation

## Usage Examples

### 1. Publishing a Developer Profile

**Step 1: Create Draft**
```javascript
const draftResponse = await apiClient.post('/api/draft/createListingDraft', {
  draftType: 'DEVELOPER'
});
const draftId = draftResponse.data.data.draftId;
```

**Step 2: Update Draft with Developer Data**
```javascript
await apiClient.patch('/api/draft/updateListingDraft', {
  draftId,
  draftData: {
    developerName: 'Godrej Properties',
    developerType: 'National Developer',
    description: 'Leading real estate developer in India...',
    establishedYear: 1990,
    registrationNumber: 'REG123456',
    primaryContactEmail: 'contact@godrejproperties.com',
    primaryContactPhone: '+919876543210',
    socialLinks: [
      { type: 'website', url: 'https://godrejproperties.com' },
      { type: 'linkedin', url: 'https://linkedin.com/company/godrej' }
    ],
    totalProjectsCompleted: 150,
    totalProjectsOngoing: 25,
    totalUnitsDelivered: 50000,
    projectTypes: ['Residential', 'Commercial', 'Integrated Township'],
    operatingStates: ['Maharashtra', 'Karnataka', 'NCR', 'Tamil Nadu']
  },
  draftType: 'DEVELOPER'
});
```

**Step 3: Publish Developer from Draft**
```javascript
const response = await apiClient.post('/api/developer/publishDeveloper', {
  draftId
});
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

### 2. Fetching Developer by Slug (Public)

**Request:**
```javascript
const response = await apiClient.get('/api/developer/slug/godrej-properties');
```

### 3. Listing Developers with Filters

**Request:**
```javascript
const response = await apiClient.get('/api/developer/list', {
  params: {
    developerType: 'National Developer',
    operatingState: 'Maharashtra',
    projectType: 'Residential',
    page: 1,
    limit: 20
  }
});
```

### 4. Updating Developer Profile

**Request:**
```javascript
const response = await apiClient.patch('/api/developer/updateDeveloper/1', {
  description: 'Updated description...',
  totalProjectsCompleted: 155
});
```

## Integration with Frontend

The backend is fully integrated with the frontend's `listDeveloper` module schemas:

### Schema Mapping

**basicInfoSchema.js** → Database Fields:
- `developerName` → `developerName`
- `developerType` → `developerType`
- `description` → `description`
- `establishedYear` → `establishedYear`
- `registrationNumber` → `registrationNumber`

**contactInfoSchema.js** → Database Fields:
- `primaryContactEmail` → `primaryContactEmail`
- `primaryContactPhone` → `primaryContactPhone`
- `socialLinks` → `socialLinks` (JSONB)

**projectsSchema.js** → Database Fields:
- `totalProjectsCompleted` → `totalProjectsCompleted`
- `totalProjectsOngoing` → `totalProjectsOngoing`
- `totalUnitsDelivered` → `totalUnitsDelivered`
- `projectTypes` → `projectTypes` (array)
- `operatingStates` → `operatingStates` (array)

## Error Handling

The implementation includes comprehensive error handling:

1. **Validation Errors** - Return 400 with specific error messages
2. **Authorization Errors** - Return 401/403 for unauthorized access
3. **Not Found Errors** - Return 404 when resource doesn't exist
4. **Temporal Workflow Errors** - Fallback to direct database operation
5. **Database Errors** - Logged and return 500 with generic message

## Logging

All operations are logged using Winston:
- Info logs for successful operations
- Error logs for failures
- Workflow step logging for debugging

## Testing

### Manual Testing with Postman/Thunder Client

1. **Publish Developer:**
   - POST `http://localhost:3000/api/developer/publishDeveloper`
   - Headers: `Authorization: Bearer <token>`
   - Body: Developer data (see example above)

2. **Get Developer:**
   - GET `http://localhost:3000/api/developer/slug/godrej-properties`

3. **List Developers:**
   - GET `http://localhost:3000/api/developer/list?page=1&limit=10`

## Future Enhancements

1. **Media Support:**
   - Add logo upload functionality
   - Add project images/videos
   - Add certifications/awards documents

2. **Advanced Verification:**
   - Document verification (registration certificate)
   - Phone/email OTP verification
   - Third-party verification integration

3. **Analytics:**
   - Detailed view tracking
   - Inquiry conversion tracking
   - Performance metrics dashboard

4. **Search & Discovery:**
   - Full-text search on Elasticsearch
   - AI-powered recommendations
   - Advanced filtering options

5. **Notifications:**
   - Email notifications implementation
   - SMS notifications
   - In-app notifications

## Deployment Checklist

- [ ] Run database migration
- [ ] Update environment variables
- [ ] Configure Temporal worker
- [ ] Test all endpoints
- [ ] Set up monitoring/logging
- [ ] Configure rate limiting
- [ ] Set up backup strategy
- [ ] Document API in Swagger/OpenAPI

## Environment Variables Required

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password

# JWT
ACCESS_TOKEN_SECRET=your_secret
REFRESH_TOKEN_SECRET=your_secret

# Temporal
TEMPORAL_ADDRESS=localhost:7233

# Frontend
FRONTEND_URL=http://localhost:5173
ACCESS_CONTROL_ALLOW_ORIGIN=http://localhost:5173
```

## Support

For issues or questions, refer to:
- Entity definitions in `src/entity/Developer.entity.js`
- Service logic in `src/service/DeveloperService.service.js`
- API endpoints in `src/routes/developer.route.js`
- Workflow logic in `src/temporal/workflows/developer/developerPublishing.workflow.js`
