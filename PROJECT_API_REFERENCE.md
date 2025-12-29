# Project API Reference

## Overview
The Project API provides endpoints for publishing and managing real estate projects. Projects can contain multiple properties and are used to organize listings under a common development.

## Base URL
```
http://localhost:3000/api/project
```

## Authentication
Most endpoints require authentication using a Bearer token in the Authorization header:
```
Authorization: Bearer <your_token>
```

## Endpoints

### 1. Publish Project
**POST** `/publishProject`

Publishes a new project (creates and triggers Temporal workflow for processing).

**Authentication:** Required

**Request Body:**
```json
{
  "draftId": 123,  // Optional - if publishing from a draft
  "projectName": "Green Valley Residency",
  "coordinates": {
    "lat": 28.6139,
    "lng": 77.2090
  },
  "city": "New Delhi",
  "locality": "Saket",
  "description": "Premium residential project with world-class amenities",
  "totalUnits": 500,
  "totalTowers": 5,
  "totalAcres": 10.5,
  "launchDate": "2024-01-15",
  "possessionDate": "2026-12-31",
  "projectStatus": "Ongoing",
  "amenities": ["Swimming Pool", "Gym", "Club House", "Garden"],
  "features": ["RERA Approved", "Earthquake Resistant", "Green Building"],
  "images": ["url1", "url2"],
  "videos": ["video_url"],
  "priceRange": "50L - 2Cr",
  "reraNumber": "RERA/2024/001",
  "projectType": "Residential",
  "status": "ACTIVE"
}
```

**Success Response (202 Accepted):**
```json
{
  "status": "success",
  "data": {
    "workflowId": "project-publish-123-1234567890",
    "message": "Project publishing workflow started successfully"
  },
  "message": "Project is being processed"
}
```

**Error Response (400/404/500):**
```json
{
  "status": "error",
  "message": "Error description"
}
```

---

### 2. Get My Projects
**GET** `/my-projects`

Retrieves all projects created by the authenticated user.

**Authentication:** Required

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "projects": [
      {
        "projectId": 1,
        "projectName": "Green Valley Residency",
        "status": "ACTIVE",
        "lat": 28.6139,
        "lng": 77.2090,
        "projectDetails": { /* ... */ },
        "project_created_at": "2024-01-01T00:00:00.000Z",
        "project_updated_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  },
  "message": "Projects fetched successfully"
}
```

---

### 3. List Projects
**GET** `/list`

Lists all projects with optional filters (public endpoint).

**Authentication:** Not required

**Query Parameters:**
- `status` (optional) - Filter by status (ACTIVE, INACTIVE, ARCHIVED)
- `city` (optional) - Filter by city
- `search` (optional) - Search by project name
- `createdBy` (optional) - Filter by user ID
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page

**Example:**
```
GET /api/project/list?city=New Delhi&status=ACTIVE&page=1&limit=10
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "projects": [
      {
        "projectId": 1,
        "projectName": "Green Valley Residency",
        "status": "ACTIVE",
        "lat": 28.6139,
        "lng": 77.2090,
        "projectDetails": { /* ... */ },
        "creator": {
          "userId": 123,
          "firstName": "John",
          "lastName": "Doe",
          "email": "john@example.com"
        }
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  },
  "message": "Projects listed successfully"
}
```

---

### 4. Get Project by ID
**GET** `/:projectId`

Retrieves a specific project by ID (public endpoint).

**Authentication:** Not required

**Path Parameters:**
- `projectId` (required) - Project ID

**Example:**
```
GET /api/project/123
```

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "projectId": 123,
    "projectName": "Green Valley Residency",
    "status": "ACTIVE",
    "lat": 28.6139,
    "lng": 77.2090,
    "projectDetails": {
      "description": "Premium residential project",
      "city": "New Delhi",
      "locality": "Saket",
      "totalUnits": 500,
      "amenities": ["Swimming Pool", "Gym"],
      /* ... more details ... */
    },
    "creator": {
      "userId": 123,
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "project_created_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Project fetched successfully"
}
```

**Error Response (404):**
```json
{
  "status": "error",
  "message": "Project not found"
}
```

---

### 5. Update Project
**PUT** `/:projectId`

Updates an existing project.

**Authentication:** Required (must be project creator)

**Path Parameters:**
- `projectId` (required) - Project ID

**Request Body:**
```json
{
  "projectName": "Updated Project Name",
  "status": "INACTIVE",
  "description": "Updated description",
  "totalUnits": 550,
  "amenities": ["Swimming Pool", "Gym", "Tennis Court"]
}
```
*Note: Only include fields you want to update*

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "projectId": 123,
    "projectName": "Updated Project Name",
    "status": "INACTIVE",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Project updated successfully"
}
```

**Error Response (404):**
```json
{
  "status": "error",
  "message": "Project not found or unauthorized"
}
```

---

### 6. Delete Project
**DELETE** `/:projectId`

Soft deletes (archives) a project.

**Authentication:** Required (must be project creator)

**Path Parameters:**
- `projectId` (required) - Project ID

**Example:**
```
DELETE /api/project/123
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Project deleted successfully"
}
```

**Error Response (404):**
```json
{
  "status": "error",
  "message": "Project not found or unauthorized"
}
```

---

## Project Data Structure

### Project Details (JSONB)
The `projectDetails` field stores comprehensive project information:

```json
{
  "description": "string",
  "city": "string",
  "locality": "string",
  "area": "string",
  "addressText": "string",
  "landmark": "string",
  "totalUnits": number,
  "totalTowers": number,
  "totalAcres": number,
  "launchDate": "date",
  "possessionDate": "date",
  "completionDate": "date",
  "projectStatus": "string (Upcoming, Ongoing, Completed)",
  "amenities": ["array of strings"],
  "features": ["array of strings"],
  "images": ["array of URLs"],
  "videos": ["array of URLs"],
  "brochure": "URL",
  "floorPlans": ["array of URLs"],
  "developerName": "string",
  "developerId": number,
  "priceRange": "string",
  "reraNumber": "string",
  "projectType": "string (Residential, Commercial, Mixed)"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `202` - Accepted (Async processing started)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found
- `409` - Conflict (e.g., draft already published)
- `500` - Internal Server Error

## Workflow Process

When a project is published via `/publishProject`:

1. **Request Received** - API validates basic request structure
2. **Workflow Started** - Temporal workflow initiated (non-blocking)
3. **Validation** - Project data validated in workflow
4. **Database Operation** - Project record created/updated
5. **Draft Update** - Draft status updated (if applicable)
6. **Notification** - User notified of completion

The API returns immediately (202 Accepted) while the workflow processes asynchronously.

## Integration Notes

- Projects use PostGIS geography for location data (efficient spatial queries)
- All timestamps use ISO 8601 format
- Soft delete is implemented (paranoid mode) - deleted projects can be recovered
- Project details are stored in JSONB for flexible schema

## Related APIs

- **Property API** - Properties can be linked to projects via `projectId`
- **Developer API** - Projects can be linked to developers
- **Draft API** - Projects can be created from drafts
