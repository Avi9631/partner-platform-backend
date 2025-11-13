# User API Documentation

## Overview
User management endpoints for the Partner Platform. All endpoints require authentication via JWT token in cookies.

## Base URL
```
http://localhost:3000
```

## Authentication
All endpoints require the `accessToken` cookie to be present. The token is automatically set after OAuth login.

---

## Endpoints

### 1. Get Current User

Get the authenticated user's information.

**Endpoint:** `POST /partnerUser/get`

**Authentication:** Required

**Request Headers:**
```
Cookie: accessToken=<jwt_token>
```

**Request Body:** None

**Success Response (200):**
```json
{
  "status": 200,
  "success": true,
  "message": "User retrieved successfully",
  "data": {
    "user": {
      "userId": 1,
      "firstName": "John",
      "lastName": "Doe",
      "nameInitial": "JD",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "accountType": "INDIVIDUAL",
      "userStatus": "ACTIVE",
      "lastLoginAt": "2025-11-13T10:30:00.000Z",
      "emailVerifiedAt": "2025-11-13T09:00:00.000Z",
      "phoneVerifiedAt": "2025-11-13T09:15:00.000Z",
      "derivedUserName": "John Doe",
      "created_date": "13-Nov-2025",
      "v_created_time": "09:00 AM"
    }
  },
  "meta": {
    "userId": 1
  },
  "warnings": [],
  "error": null,
  "trace": {
    "requestId": "req_abc123",
    "durationMs": 45
  }
}
```

**Error Response (401):**
```json
{
  "status": 401,
  "success": false,
  "message": "Authorization token missing",
  "error": {
    "code": "AUTH_ERROR"
  }
}
```

**Error Response (404):**
```json
{
  "status": 404,
  "success": false,
  "message": "User not found",
  "error": {
    "code": "GET_USER_ERROR",
    "source": "getUser"
  }
}
```

---

### 2. Update User

Update the authenticated user's information.

**Endpoint:** `PATCH /partnerUser/update`

**Authentication:** Required

**Request Headers:**
```
Content-Type: application/json
Cookie: accessToken=<jwt_token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1234567890",
  "accountType": "AGENT"
}
```

**Allowed Fields:**
- `firstName` (string, optional)
- `lastName` (string, optional)
- `phone` (string, optional)
- `accountType` (enum: 'INDIVIDUAL' | 'AGENT' | 'ORGANIZATION', optional)

**Success Response (200):**
```json
{
  "status": 200,
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": {
      "userId": 1,
      "firstName": "John",
      "lastName": "Smith",
      "nameInitial": "JS",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "accountType": "AGENT",
      "userStatus": "ACTIVE"
    }
  },
  "meta": {
    "userId": 1,
    "updatedFields": ["firstName", "lastName", "phone", "accountType"]
  }
}
```

**Error Response (400):**
```json
{
  "status": 400,
  "success": false,
  "message": "No update data provided",
  "error": {
    "code": "VALIDATION_ERROR",
    "source": "updateUser"
  }
}
```

---

### 3. Verify Phone

Verify the authenticated user's phone number.

**Endpoint:** `POST /partnerUser/verifyPhone`

**Authentication:** Required

**Request Headers:**
```
Content-Type: application/json
Cookie: accessToken=<jwt_token>
```

**Request Body:**
```json
{
  "phone": "+1234567890",
  "verificationCode": "123456"
}
```

**Fields:**
- `phone` (string, required) - Phone number to verify
- `verificationCode` (string, optional) - OTP code (for future implementation)

**Success Response (200):**
```json
{
  "status": 200,
  "success": true,
  "message": "Phone verified successfully",
  "data": {
    "user": {
      "userId": 1,
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "phoneVerifiedAt": "2025-11-13T10:45:00.000Z"
    }
  },
  "meta": {
    "userId": 1,
    "phone": "+1234567890"
  }
}
```

**Error Response (400):**
```json
{
  "status": 400,
  "success": false,
  "message": "Invalid phone number format",
  "error": {
    "code": "VALIDATION_ERROR",
    "source": "verifyPhone"
  }
}
```

---

### 4. Get All Users

Get a paginated list of all users with optional filters. **(Admin function - consider adding admin middleware)**

**Endpoint:** `GET /partnerUser/all`

**Authentication:** Required

**Query Parameters:**
- `userStatus` (enum, optional) - Filter by status: PENDING, APPROVED, REJECTED, ACTIVE, INACTIVE, SUSPENDED
- `accountType` (enum, optional) - Filter by type: INDIVIDUAL, AGENT, ORGANIZATION
- `search` (string, optional) - Search in firstName, lastName, email
- `page` (number, optional, default: 1) - Page number
- `limit` (number, optional, default: 10, max: 100) - Items per page

**Example Request:**
```
GET /partnerUser/all?userStatus=ACTIVE&accountType=AGENT&search=john&page=1&limit=10
```

**Success Response (200):**
```json
{
  "status": 200,
  "success": true,
  "message": "Users retrieved successfully",
  "data": {
    "users": [
      {
        "userId": 1,
        "firstName": "John",
        "lastName": "Doe",
        "email": "john.doe@example.com",
        "accountType": "AGENT",
        "userStatus": "ACTIVE"
      },
      {
        "userId": 2,
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane.smith@example.com",
        "accountType": "AGENT",
        "userStatus": "ACTIVE"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 10,
      "totalPages": 3
    }
  },
  "meta": {
    "requestedBy": 1,
    "filters": {
      "userStatus": "ACTIVE",
      "accountType": "AGENT",
      "search": "john"
    }
  }
}
```

**Error Response (400):**
```json
{
  "status": 400,
  "success": false,
  "message": "Limit cannot exceed 100",
  "error": {
    "code": "VALIDATION_ERROR",
    "source": "getAllUsers"
  }
}
```

---

### 5. Update User Status

Update a user's status. **(Admin function - consider adding admin middleware)**

**Endpoint:** `PATCH /partnerUser/updateStatus`

**Authentication:** Required

**Request Headers:**
```
Content-Type: application/json
Cookie: accessToken=<jwt_token>
```

**Request Body:**
```json
{
  "targetUserId": 5,
  "status": "APPROVED"
}
```

**Fields:**
- `targetUserId` (number, required) - ID of the user to update
- `status` (enum, required) - New status: PENDING, APPROVED, REJECTED, ACTIVE, INACTIVE, SUSPENDED

**Success Response (200):**
```json
{
  "status": 200,
  "success": true,
  "message": "User status updated successfully",
  "data": {
    "user": {
      "userId": 5,
      "firstName": "John",
      "lastName": "Doe",
      "userStatus": "APPROVED"
    }
  },
  "meta": {
    "updatedBy": 1,
    "targetUserId": 5,
    "newStatus": "APPROVED"
  }
}
```

**Error Response (400):**
```json
{
  "status": 400,
  "success": false,
  "message": "Invalid status. Must be one of: PENDING, APPROVED, REJECTED, ACTIVE, INACTIVE, SUSPENDED",
  "error": {
    "code": "UPDATE_USER_STATUS_ERROR",
    "source": "updateUserStatus"
  }
}
```

**Error Response (404):**
```json
{
  "status": 404,
  "success": false,
  "message": "User not found",
  "error": {
    "code": "UPDATE_USER_STATUS_ERROR",
    "source": "updateUserStatus"
  }
}
```

---

## Data Models

### User Object

```typescript
{
  userId: number;                    // Primary key
  firstName: string;                 // User's first name
  lastName: string;                  // User's last name
  nameInitial: string;               // Auto-generated (e.g., "JD")
  email: string;                     // Unique email
  phone: string | null;              // Phone number
  accountType: 'INDIVIDUAL' | 'AGENT' | 'ORGANIZATION';
  userStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLoginAt: Date | null;          // Last login timestamp
  emailVerifiedAt: Date | null;      // Email verification timestamp
  phoneVerifiedAt: Date | null;      // Phone verification timestamp
  derivedUserName: string;           // Virtual: "firstName lastName"
  created_date: string;              // Virtual: Formatted date
  v_created_time: string;            // Virtual: Formatted time
}
```

---

## Testing with cURL

### Get Current User
```bash
curl -X POST http://localhost:3000/partnerUser/get \
  -H "Cookie: accessToken=YOUR_TOKEN"
```

### Update User
```bash
curl -X PATCH http://localhost:3000/partnerUser/update \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_TOKEN" \
  -d '{
    "firstName": "John",
    "lastName": "Smith",
    "accountType": "AGENT"
  }'
```

### Verify Phone
```bash
curl -X POST http://localhost:3000/partnerUser/verifyPhone \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_TOKEN" \
  -d '{
    "phone": "+1234567890"
  }'
```

### Get All Users
```bash
curl -X GET "http://localhost:3000/partnerUser/all?page=1&limit=10&userStatus=ACTIVE" \
  -H "Cookie: accessToken=YOUR_TOKEN"
```

### Update User Status
```bash
curl -X PATCH http://localhost:3000/partnerUser/updateStatus \
  -H "Content-Type: application/json" \
  -H "Cookie: accessToken=YOUR_TOKEN" \
  -d '{
    "targetUserId": 5,
    "status": "APPROVED"
  }'
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `GET_USER_ERROR` | Failed to retrieve user |
| `UPDATE_USER_ERROR` | Failed to update user |
| `VERIFY_PHONE_ERROR` | Failed to verify phone |
| `GET_ALL_USERS_ERROR` | Failed to retrieve users list |
| `UPDATE_USER_STATUS_ERROR` | Failed to update user status |
| `VALIDATION_ERROR` | Request validation failed |
| `AUTH_ERROR` | Authentication failed |

---

## Notes

1. **Admin Functions**: `getAllUsers` and `updateUserStatus` should be restricted to admin users. Consider adding an admin role middleware.

2. **Phone Verification**: Currently, phone verification doesn't implement actual OTP validation. This should be added in production.

3. **Rate Limiting**: Consider adding rate limiting to prevent abuse, especially for phone verification.

4. **Pagination**: Maximum limit is capped at 100 items per page.

5. **Name Initials**: Automatically generated from firstName and lastName when either is updated.
