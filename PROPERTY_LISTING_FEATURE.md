# Property Listing - Custom Property Name Feature

## Overview
This feature allows users to create new properties when the property they're looking for is "Not Listed" in the project name dropdown.

## Frontend Changes

### 1. BasicDetailsStepV2.jsx
**Location:** `partner-platform-dashboard/src/modules/listProperty/v2/components/steps/BasicDetailsStepV2.jsx`

**Changes Made:**
- Added `customPropertyName` field to form default values
- Added conditional input field that appears when "Not Listed" is selected
- Updated form submission handler to:
  - Use `customPropertyName` as the `projectName` when "Not Listed" is selected
  - Add `isNewProperty` flag to indicate a new property should be created

**User Flow:**
1. User selects "Not Listed" from the Project Name dropdown
2. A new input field appears: "Enter New Property Name"
3. User enters the custom property name
4. On submission, the system creates both the project and property

### 2. basicDetailsSchema.js
**Location:** `partner-platform-dashboard/src/modules/listProperty/schemas/basicDetailsSchema.js`

**Changes Made:**
- Added `customPropertyName` as optional field
- Added validation rule: when `projectName === 'Not Listed'`, `customPropertyName` is required
- Error message: "Custom property name is required when 'Not Listed' is selected"

## Backend Changes

### 1. New Entity: Property.entity.js
**Location:** `partner-platform-backend/src/entity/Property.entity.js`

**Schema:**
```javascript
{
  propertyId: INTEGER (Primary Key),
  propertyName: STRING(255),
  projectId: INTEGER (Foreign Key -> project),
  createdBy: INTEGER (Foreign Key -> user),
  propertyDetails: JSONB,
  status: ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED')
}
```

### 2. New Entity: Project.entity.js
**Location:** `partner-platform-backend/src/entity/Project.entity.js`

**Schema:**
```javascript
{
  projectId: INTEGER (Primary Key),
  projectName: STRING(255),
  developerId: INTEGER (Foreign Key -> developer),
  createdBy: INTEGER (Foreign Key -> user),
  projectDetails: JSONB,
  status: ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED')
}
```

### 3. Updated: entity/index.js
**Location:** `partner-platform-backend/src/entity/index.js`

**Changes Made:**
- Added Project and Property entities
- Established relationships:
  - User → Projects (one-to-many)
  - User → Properties (one-to-many)
  - Project → Properties (one-to-many)

### 4. New Service: ListingDraftService.service.js
**Location:** `partner-platform-backend/src/service/ListingDraftService.service.js`

**Methods:**
- `createDraft(userId, draftDetails)` - Create new listing draft
- `updateDraft(draftId, userId, draftDetails)` - Update existing draft
- `getDraftById(draftId, userId)` - Get single draft
- `getUserDrafts(userId)` - Get all user drafts
- `deleteDraft(draftId, userId)` - Delete a draft
- `submitDraft(draftId, userId)` - **Submit draft and create property/project**

**Submit Draft Logic:**
```javascript
if (isNewProperty && customPropertyName) {
  1. Create new Project with customPropertyName
  2. Create new Property linked to the Project
  3. Update draft status to 'PUBLISHED'
} else {
  1. Find existing Project by projectName
  2. Create Property linked to existing Project
  3. Update draft status to 'PUBLISHED'
}
```

### 5. New Controller: ListingDraft.controller.js
**Location:** `partner-platform-backend/src/controller/ListingDraft.controller.js`

**Endpoints:**
- `POST /api/draft/createListingDraft` - Create draft
- `PATCH /api/draft/updateListingDraft` - Update draft
- `GET /api/draft/listingDraft` - Get all user drafts
- `GET /api/draft/listingDraft/:id` - Get specific draft
- `DELETE /api/draft/deleteListingDraft` - Delete draft
- `POST /api/draft/submitListingDraft` - Submit draft (creates property)

### 6. Updated: draft.route.js
**Location:** `partner-platform-backend/src/routes/draft.route.js`

**Changes Made:**
- Updated all routes to use `ListingDraftController` instead of placeholder `AuthController`
- All routes are protected with `authMiddleware`

### 7. Updated: responseFormatter.js
**Location:** `partner-platform-backend/src/utils/responseFormatter.js`

**Changes Made:**
- Added helper functions for backward compatibility:
  - `sendSuccessResponse(res, data, message, statusCode)`
  - `sendErrorResponse(res, message, statusCode, errorCode, details)`

## Database Migration

You'll need to run migrations to create the new tables:

```sql
-- Create project table
CREATE TABLE project (
  project_id SERIAL PRIMARY KEY,
  project_name VARCHAR(255) NOT NULL,
  developer_id INTEGER,
  created_by INTEGER NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
  project_details JSONB,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  project_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  project_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  project_deleted_at TIMESTAMP
);

-- Create property table
CREATE TABLE property (
  property_id SERIAL PRIMARY KEY,
  property_name VARCHAR(255) NOT NULL,
  project_id INTEGER REFERENCES project(project_id) ON DELETE SET NULL,
  created_by INTEGER NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
  property_details JSONB,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  property_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  property_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  property_deleted_at TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_property_name ON property(property_name);
CREATE INDEX idx_property_project ON property(project_id);
CREATE INDEX idx_property_creator ON property(created_by);
CREATE INDEX idx_project_name ON project(project_name);
CREATE INDEX idx_project_creator ON project(created_by);
```

## Testing

### Frontend Testing
1. Navigate to the property listing form
2. Select "Not Listed" from the Project Name dropdown
3. Verify that the "Enter New Property Name" field appears
4. Try submitting without entering a name (should show validation error)
5. Enter a property name and submit
6. Verify the data is saved correctly in the context

### Backend Testing

**Create Draft:**
```bash
curl -X POST http://localhost:3000/api/draft/createListingDraft \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Not Listed",
    "customPropertyName": "My New Property",
    "isNewProperty": true,
    "ownershipType": "freehold",
    "ageOfProperty": "2",
    "possessionStatus": "ready"
  }'
```

**Submit Draft:**
```bash
curl -X POST http://localhost:3000/api/draft/submitListingDraft \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": 1
  }'
```

## Data Flow

```
User Input → Frontend Form
    ↓
BasicDetailsStepV2 (Validates with Zod schema)
    ↓
PropertyFormContextV2 (Stores in context)
    ↓
API Call: POST /api/draft/createListingDraft
    ↓
ListingDraftController.createListingDraft
    ↓
ListingDraftService.createDraft
    ↓
Database: listing_draft table (JSONB storage)

When Ready to Submit:
    ↓
API Call: POST /api/draft/submitListingDraft
    ↓
ListingDraftController.submitListingDraft
    ↓
ListingDraftService.submitDraft
    ↓
If isNewProperty === true:
  1. Create Project (project table)
  2. Create Property (property table)
  3. Update draft status to 'PUBLISHED'
```

## Configuration

No additional configuration needed. The feature integrates seamlessly with existing authentication and authorization middleware.

## Future Enhancements

1. **Duplicate Check:** Add validation to prevent duplicate property names
2. **Project Search:** Enhance project search with fuzzy matching
3. **Bulk Import:** Allow importing multiple properties at once
4. **Property Templates:** Save property configurations as templates
5. **Approval Workflow:** Add admin approval for new properties

## Notes

- The `propertyDetails` and `projectDetails` JSONB fields store all form data for flexibility
- All database operations use transactions to ensure data consistency
- Soft deletes are enabled (paranoid mode) for both Property and Project entities
- The feature maintains backward compatibility with existing listing flows
