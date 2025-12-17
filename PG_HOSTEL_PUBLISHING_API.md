# PG/Colive/Hostel Publishing API Documentation

## Overview

The PG/Colive/Hostel Publishing API allows partners to publish and manage their PG, Co-living, and Hostel properties on the platform. The publishing process is handled asynchronously via Temporal workflows to ensure reliability and scalability.

## Architecture

Similar to the Developer Publishing API, this API follows a workflow-based architecture:

1. **Controller** - Handles HTTP requests and responses
2. **Service** - Business logic and database operations
3. **Temporal Workflow** - Orchestrates the publishing process
4. **Temporal Activities** - Individual tasks within the workflow

## Workflow Process

```
User Request → Controller → Start Temporal Workflow → Activities
                              ↓
                         1. Validate Data
                         2. Create Record
                         3. Send Notification
```

## API Endpoints

### 1. Publish PG/Colive/Hostel

**Endpoint:** `POST /api/pg-hostel/publishPgColiveHostel`

**Authentication:** Required (Bearer Token)

**Description:** Publishes a new PG/Colive/Hostel listing. This triggers an asynchronous Temporal workflow.

**Request Body:**

```json
{
  "draftId": 123,
  "propertyName": "SUNRISE PG / HOSTELS",
  "genderAllowed": "Gents / Ladies / Unisex",
  "description": "Premium PG accommodation with all modern amenities...",
  "isBrandManaged": true,
  "brandName": "NestAway",
  "yearBuilt": "2021",
  "coordinates": {
    "lat": 28.626226194482996,
    "lng": 77.21509397912742
  },
  "city": "New Delhi",
  "locality": "Janpath",
  "addressText": "10, Sansad Marg, Janpath, Connaught Place, New Delhi, Delhi 110001, India",
  "landmark": "Near Metro Station",
  "roomTypes": [
    {
      "name": "LUXURY LIVING IN SPA",
      "category": "Triple sharing",
      "roomSize": 600,
      "refundPolicy": "",
      "pricing": [
        {
          "type": "Monthly Rent",
          "amount": 8999,
          "currency": "INR",
          "mandatory": true
        },
        {
          "type": "Security Deposit",
          "amount": 8994,
          "currency": "INR",
          "mandatory": true,
          "refundable": false
        }
      ],
      "availability": {
        "totalBeds": 1,
        "availableBeds": 1,
        "soldOut": false,
        "nextAvailability": "Immediate"
      },
      "amenities": [
        {
          "name": "Queen Size Bed",
          "available": true
        },
        {
          "name": "Study Table & Chair",
          "available": true
        }
      ],
      "images": [
        {
          "url": "https://example.com/image1.png"
        }
      ]
    }
  ],
  "commonAmenities": [
    {
      "icon": "CarIcon",
      "name": "2-Wheeler Parking",
      "available": true
    },
    {
      "icon": "Building2",
      "name": "Lift",
      "available": true
    }
  ],
  "foodMess": {
    "available": true,
    "meals": ["Breakfast", "Lunch", "Dinner"],
    "foodType": "Veg & Non-veg",
    "cookingAllowed": true,
    "weeklyMenu": [
      {
        "day": "Monday",
        "breakfastTiming": "08:00",
        "lunchTiming": "13:00",
        "dinnerTiming": "20:00",
        "breakfast": {
          "veg": ["Poha", "Upma"],
          "nonVeg": ["Omelette"]
        },
        "lunch": {
          "veg": ["Dal Tadka", "Jeera Rice"],
          "nonVeg": ["Chicken Curry"]
        },
        "dinner": {
          "veg": ["Paneer Butter Masala"],
          "nonVeg": ["Chicken Biryani"]
        }
      }
    ]
  },
  "rules": [
    {
      "key": "Smoking",
      "value": "No"
    }
  ],
  "mediaData": [
    {
      "id": "media-1765990879762-0.40392406429712735",
      "url": "https://example.com/image.png",
      "type": "image",
      "title": "",
      "category": "",
      "description": ""
    }
  ]
}
```

**Required Fields:**
- `draftId` - Draft ID from listing_draft table
- `propertyName` - Name of the PG/Hostel
- `genderAllowed` - Gender restrictions (Gents/Ladies/Unisex)
- `roomTypes` - Array with at least one room type

**Response (202 Accepted):**

```json
{
  "success": true,
  "message": "PG/Colive/Hostel is being processed",
  "data": {
    "workflowId": "pg-hostel-publish-123-1734476400000",
    "message": "PG/Hostel publishing workflow started successfully"
  }
}
```

**Response (400 Bad Request):**

```json
{
  "success": false,
  "message": "Property name is required"
}
```

**Response (404 Not Found):**

```json
{
  "success": false,
  "message": "Draft not found or unauthorized"
}
```

---

### 2. Get My PG/Hostel Profiles

**Endpoint:** `GET /api/pg-hostel/my-profiles`

**Authentication:** Required (Bearer Token)

**Description:** Get all PG/Hostel profiles created by the authenticated user.

**Response (200 OK):**

```json
{
  "success": true,
  "message": "PG/Hostel profiles fetched successfully",
  "data": [
    {
      "pgHostelId": 1,
      "propertyName": "SUNRISE PG",
      "slug": "sunrise-pg",
      "city": "New Delhi",
      "publishStatus": "PENDING_REVIEW",
      "verificationStatus": "PENDING",
      "pg_hostel_created_at": "2025-12-17T10:30:00Z"
    }
  ]
}
```

---

### 3. List PG/Hostels (Public)

**Endpoint:** `GET /api/pg-hostel/list`

**Authentication:** Not required

**Description:** List all published PG/Hostels with optional filters.

**Query Parameters:**
- `publishStatus` - Filter by status (PENDING_REVIEW, PUBLISHED, REJECTED, ARCHIVED)
- `verificationStatus` - Filter by verification (PENDING, VERIFIED, REJECTED)
- `city` - Filter by city
- `locality` - Filter by locality
- `genderAllowed` - Filter by gender (Gents/Ladies/Unisex)
- `isBrandManaged` - Filter by brand managed (true/false)
- `search` - Search in name, description, brand name
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

**Example:** `GET /api/pg-hostel/list?city=Bangalore&genderAllowed=Gents&page=1&limit=10`

**Response (200 OK):**

```json
{
  "success": true,
  "message": "PG/Hostels fetched successfully",
  "data": {
    "pgHostels": [
      {
        "pgHostelId": 1,
        "propertyName": "SUNRISE PG",
        "slug": "sunrise-pg",
        "city": "Bangalore",
        "genderAllowed": "Gents",
        "publishStatus": "PUBLISHED"
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

---

### 4. Get PG/Hostel by Slug

**Endpoint:** `GET /api/pg-hostel/slug/:slug`

**Authentication:** Not required

**Description:** Get detailed information about a PG/Hostel by its URL slug.

**Example:** `GET /api/pg-hostel/slug/sunrise-pg`

**Response (200 OK):**

```json
{
  "success": true,
  "message": "PG/Hostel fetched successfully",
  "data": {
    "pgHostelId": 1,
    "propertyName": "SUNRISE PG",
    "slug": "sunrise-pg",
    "description": "Premium PG accommodation...",
    "city": "Bangalore",
    "locality": "Koramangala",
    "coordinates": {
      "lat": 12.9352,
      "lng": 77.6245
    },
    "roomTypes": [...],
    "commonAmenities": [...],
    "foodMess": {...},
    "user": {
      "userId": 123,
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

---

### 5. Get PG/Hostel by ID

**Endpoint:** `GET /api/pg-hostel/:pgHostelId`

**Authentication:** Not required

**Description:** Get detailed information about a PG/Hostel by its ID.

**Example:** `GET /api/pg-hostel/1`

**Response:** Same as "Get by Slug"

---

### 6. Update PG/Hostel

**Endpoint:** `PUT /api/pg-hostel/:pgHostelId`

**Authentication:** Required (Bearer Token, must be owner)

**Description:** Update an existing PG/Hostel listing.

**Request Body:** Same fields as publish endpoint (partial updates allowed)

**Response (200 OK):**

```json
{
  "success": true,
  "message": "PG/Hostel updated successfully",
  "data": {
    "pgHostelId": 1,
    "propertyName": "SUNRISE PG - Updated",
    "slug": "sunrise-pg-updated"
  }
}
```

---

## Temporal Workflow Details

### Workflow Name
`pgHostelPublishing`

### Workflow Steps

1. **Validate PG/Hostel Data**
   - Validates required fields
   - Checks user existence
   - Ensures draft hasn't been published before
   - Validates room types and pricing
   - Validates coordinates and contact information

2. **Create PG/Hostel Record**
   - Generates unique slug from property name
   - Creates database record
   - Sets initial status (PENDING_REVIEW)

3. **Send Notification**
   - Notifies user about publishing status
   - Non-blocking (won't fail workflow if notification fails)

### Workflow Execution

- **Task Queue:** `partner-platform-queue`
- **Timeout:** 2 minutes per activity
- **Retry Policy:**
  - Initial interval: 1 second
  - Maximum interval: 30 seconds
  - Backoff coefficient: 2
  - Maximum attempts: 3

---

## Database Schema

### Table: `pg_colive_hostel`

Key columns:
- `pg_hostel_id` (PK)
- `user_id` (FK to user table)
- `draft_id` (FK to listing_draft, UNIQUE)
- `property_name`
- `slug` (UNIQUE)
- `coordinates` (JSONB)
- `room_types` (JSONB)
- `common_amenities` (JSONB)
- `food_mess` (JSONB)
- `publish_status` (ENUM)
- `verification_status` (ENUM)

---

## Error Handling

The API includes comprehensive error handling:

1. **Validation Errors** - Returns 400 with detailed error messages
2. **Not Found Errors** - Returns 404 when draft or resource not found
3. **Authorization Errors** - Returns 401/403 for unauthorized access
4. **Temporal Errors** - Falls back to direct creation if workflow fails
5. **Server Errors** - Returns 500 for unexpected errors

---

## Testing

### Example cURL Request

```bash
curl -X POST http://localhost:3000/api/pg-hostel/publishPgColiveHostel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "draftId": 123,
    "propertyName": "Test PG",
    "genderAllowed": "Gents",
    "city": "Bangalore",
    "roomTypes": [
      {
        "name": "Single Room",
        "category": "Single sharing",
        "pricing": [
          {
            "type": "Monthly Rent",
            "amount": 10000,
            "currency": "INR",
            "mandatory": true
          }
        ],
        "availability": {
          "totalBeds": 5,
          "availableBeds": 2,
          "soldOut": false
        }
      }
    ]
  }'
```

---

## Notes

1. The `draftId` must be unique - each draft can only be published once
2. Publishing is asynchronous - returns immediately with workflow ID
3. The workflow handles retries automatically for transient failures
4. Notifications are best-effort and won't fail the publishing process
5. All timestamps are stored in UTC with timezone information
