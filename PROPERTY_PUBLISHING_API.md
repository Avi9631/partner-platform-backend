# Property Publishing API - Implementation Guide

## Overview

This document describes the implementation of the Property Publishing functionality, including route, controller, service, and Temporal workflow integration.

## Architecture

The Property Publishing feature follows the same pattern as PG/Hostel and Developer publishing, with:
- **Temporal Workflow Integration**: Asynchronous processing with fallback to direct execution
- **Draft-based Publishing**: Properties are published from listing drafts
- **Entity Relationships**: Proper linking between User, Property, ListingDraft, and Project entities

## Implementation Pattern Analysis

Based on the analysis of existing PG/Hostel and Developer controllers, the implementation follows this pattern:

### 1. Controller Pattern
- Accepts `draftId` in request body
- Validates draft existence and ownership
- Attempts to start Temporal workflow
- **Fallback**: If Temporal fails, executes direct database operations
- Returns 202 (Accepted) for async workflow or 201/200 for direct execution

### 2. Service Pattern
- `createProperty()`: Creates new property record
- `updateProperty()`: Updates existing property
- `getUserProperties()`: Fetches user's properties
- `listProperties()`: Lists properties with filters
- `deleteProperty()`: Soft deletes property

### 3. Temporal Workflow Pattern
- **Validation Step**: Validates all required data
- **Create/Update Step**: Executes database operations
- **Notification Step**: Sends user notifications
- **Draft Update Step**: Updates draft status to PUBLISHED

## Files Created/Modified

### 1. Route - `src/routes/property.route.js`
```javascript
POST /api/property/publishProperty - Publish property (with temporal workflow)
GET /api/property/my-properties - Get user's properties
GET /api/property/list - List properties with filters
GET /api/property/:propertyId - Get property by ID
PUT /api/property/:propertyId - Update property
DELETE /api/property/:propertyId - Delete property (soft delete)
```

### 2. Controller - `src/controller/Property.controller.js`
- `publishProperty()`: Main publish endpoint with temporal/fallback logic
- `getMyProperties()`: Fetch user's properties
- `getPropertyById()`: Get single property
- `listProperties()`: List with pagination and filters
- `updateProperty()`: Update property details
- `deleteProperty()`: Soft delete property

### 3. Service - `src/service/PropertyService.service.js`
- `createProperty()`: Database creation logic
- `updateProperty()`: Update logic with authorization
- `getPropertyById()`: Fetch with relations
- `getUserProperties()`: User's property list
- `listProperties()`: Paginated list with filters
- `deleteProperty()`: Soft delete with paranoid

### 4. Temporal Workflow - `src/temporal/workflows/property/propertyPublishing.workflow.js`
Orchestrates the publishing process:
1. Validate property data
2. Create or update property record
3. Update draft status
4. Send notification

### 5. Temporal Activities - `src/temporal/activities/property/propertyPublishing.activities.js`
- `validatePropertyData()`: Validates input and checks constraints
- `createPropertyRecord()`: Creates property in database
- `updatePropertyRecord()`: Updates existing property
- `sendPropertyPublishingNotification()`: Sends notification to user
- `updateListingDraftStatus()`: Marks draft as published

### 6. Entity Updates - `src/entity/Property.entity.js`
- Added `draftId` field with foreign key to `listing_draft`
- Added index on `draft_id` for performance

### 7. Entity Relationships - `src/entity/index.js`
- Property → User (creator)
- Property → ListingDraft (draft)
- Property → Project (optional project association)
- ListingDraft → Property (one-to-one)
- Project → Properties (one-to-many)

### 8. Server Configuration - `server.js`
- Registered route: `app.use("/api/property", propertyRoute)`

### 9. Temporal Worker Configuration
- Updated `src/temporal/workflows/index.js` - Added propertyPublishing workflow
- Updated `src/temporal/activities/registry.js` - Added property activities

### 10. Database Migration - `migrations/add-draft-id-to-property.sql`
SQL migration to add `draft_id` column to existing property table

## API Usage

### Publish Property

**Endpoint**: `POST /api/property/publishProperty`

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "draftId": 123,
  "propertyName": "Luxury Apartment 3BHK",
  "projectId": 456,
  "propertyDetails": {
    "area": "1500 sqft",
    "bedrooms": 3,
    "bathrooms": 2,
    "floor": 5,
    "facing": "East",
    "furnishing": "Semi-furnished"
  },
  "status": "ACTIVE"
}
```

**Response (Temporal Enabled)**:
```json
{
  "success": true,
  "message": "Property is being processed",
  "data": {
    "workflowId": "property-publish-123-1735481234567",
    "isUpdate": false,
    "message": "Property publishing workflow started successfully"
  }
}
```
Status Code: `202 Accepted`

**Response (Direct Mode/Fallback)**:
```json
{
  "success": true,
  "message": "Property published successfully (direct mode)",
  "data": {
    "propertyId": 789,
    "propertyName": "Luxury Apartment 3BHK",
    "projectId": 456,
    "createdBy": 123,
    "draftId": 123,
    "status": "ACTIVE",
    "propertyDetails": {...},
    "property_created_at": "2025-12-29T10:30:00.000Z",
    "property_updated_at": "2025-12-29T10:30:00.000Z"
  }
}
```
Status Code: `201 Created`

### Get My Properties

**Endpoint**: `GET /api/property/my-properties`

**Response**:
```json
{
  "success": true,
  "message": "Properties fetched successfully",
  "data": [
    {
      "propertyId": 789,
      "propertyName": "Luxury Apartment 3BHK",
      "projectId": 456,
      "status": "ACTIVE",
      "creator": {
        "userId": 123,
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

### List Properties

**Endpoint**: `GET /api/property/list?status=ACTIVE&page=1&limit=10`

**Query Parameters**:
- `status` (optional): ACTIVE, INACTIVE, ARCHIVED
- `projectId` (optional): Filter by project
- `search` (optional): Search in property name
- `page` (default: 1)
- `limit` (default: 10)

## Temporal Workflow vs Direct Flow

### When Temporal is Enabled:
1. Request received → Controller attempts to start workflow
2. Workflow ID returned immediately (202 Accepted)
3. Workflow executes asynchronously:
   - Validates data
   - Creates/updates property
   - Updates draft status
   - Sends notification
4. Client can check workflow status separately

### When Temporal is Disabled/Fails:
1. Request received → Temporal connection fails
2. Controller catches error and executes fallback
3. Direct service call: `PropertyService.createProperty()`
4. Result returned immediately (201 Created or 200 OK)
5. No workflow tracking, synchronous execution

## Environment Variables

No additional environment variables required. The system uses existing Temporal configuration from:
- `src/config/temporal.config.js`
- `src/utils/temporalClient.js`

## Error Handling

### Validation Errors (400 Bad Request)
```json
{
  "success": false,
  "message": "Property name is required",
  "statusCode": 400
}
```

### Authorization Errors (404 Not Found)
```json
{
  "success": false,
  "message": "Draft not found or unauthorized",
  "statusCode": 404
}
```

### Server Errors (500 Internal Server Error)
```json
{
  "success": false,
  "message": "An error occurred while publishing property",
  "statusCode": 500
}
```

## Database Schema Updates

Run the migration to add draft_id support:

```bash
psql -U <username> -d <database> -f migrations/add-draft-id-to-property.sql
```

Or if using sequelize sync (development only):
```javascript
// The entity definition will auto-sync in development mode
await db.sequelize.sync({ alter: true });
```

## Testing

### 1. Create a Draft First
```bash
POST /api/draft/create
{
  "draftType": "PROPERTY",
  "draftData": {
    "propertyName": "Test Property"
  }
}
```

### 2. Publish the Property
```bash
POST /api/property/publishProperty
{
  "draftId": <draft_id_from_step_1>,
  "propertyName": "Test Property",
  "status": "ACTIVE"
}
```

### 3. Verify Property Creation
```bash
GET /api/property/my-properties
```

## Integration Points

### With ListingDraft
- Property requires a draft with `draftType: 'PROPERTY'`
- Draft status updated to 'PUBLISHED' after successful publish

### With Project (Optional)
- Property can be linked to a project via `projectId`
- Useful for organizing multiple properties under one project

### With User
- Property tracks creator via `createdBy` field
- Authorization checks ensure users can only modify their own properties

## Monitoring Temporal Workflows

Check workflow status:
```bash
# Using Temporal CLI
temporal workflow describe --workflow-id property-publish-123-1735481234567

# Using Temporal Web UI
http://localhost:8233
```

## Future Enhancements

1. **Verification Workflow**: Add verification steps similar to PG/Hostel
2. **Bulk Publishing**: Support publishing multiple properties at once
3. **Media Upload**: Integrate with media upload service
4. **Location Support**: Add lat/lng and location-based queries
5. **Advanced Filters**: Add more filtering options (price range, area, etc.)

## Comparison with Other Entities

| Feature | Developer | PG/Hostel | Property |
|---------|-----------|-----------|----------|
| Temporal Workflow | ✅ Yes | ✅ Yes | ✅ Yes |
| Direct Fallback | ✅ Yes | ✅ Yes | ✅ Yes |
| Draft Linking | ✅ Yes | ✅ Yes | ✅ Yes |
| Update Support | ✅ Yes | ✅ Yes | ✅ Yes |
| Soft Delete | ✅ Yes | ❌ No | ✅ Yes |
| Location Support | ❌ No | ✅ Yes | ❌ No |
| Verification Status | ✅ Yes | ✅ Yes | ❌ No |

## Support

For issues or questions:
1. Check logs: `src/config/winston.config.js`
2. Verify Temporal status: `temporal server start-dev`
3. Check database connectivity
4. Review error messages in response

---

**Implementation Date**: December 29, 2025  
**Version**: 1.0.0  
**Pattern Based On**: PG/Hostel and Developer Publishing APIs
