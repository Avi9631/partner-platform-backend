# Listing View Tracking System

This system tracks views and analytics for all listing types in the partner platform: Properties, Projects, PG/CoLive Hostels, and Developers.

## Features

- **View Tracking**: Records each view with timestamp and duration
- **User Identification**: Tracks both authenticated users and anonymous sessions
- **Analytics**: Provides comprehensive statistics and insights
- **Device Detection**: Tracks device type (mobile, tablet, desktop)
- **Location Tracking**: Records country and city information
- **Trending Listings**: Identifies most viewed listings
- **View History**: Maintains viewing history for logged-in users

## Database Schema

### Table: `listing_view`

| Column | Type | Description |
|--------|------|-------------|
| view_id | INTEGER | Primary key |
| listing_type | ENUM | Type: property, project, pg_hostel, developer |
| listing_id | INTEGER | ID of the viewed listing |
| view_duration | INTEGER | Duration in seconds |
| viewer_id | INTEGER | User ID (if logged in) |
| session_id | VARCHAR | Session ID for anonymous users |
| ip_address | VARCHAR | IP address of viewer |
| user_agent | TEXT | Browser/device information |
| referrer | VARCHAR | Source URL |
| device_type | ENUM | mobile, tablet, desktop, unknown |
| country | VARCHAR | Viewer's country |
| city | VARCHAR | Viewer's city |
| viewed_at | TIMESTAMP | When the view occurred |
| metadata | JSONB | Additional custom data |

## API Endpoints

### 1. Record a View

**POST** `/api/listing-views`

Records a new view. Can be called by authenticated or anonymous users.

**Request Body:**
```json
{
  "listingType": "property",
  "listingId": 123,
  "viewDuration": 45,
  "sessionId": "abc123",
  "deviceType": "mobile",
  "metadata": {
    "scrollDepth": 75,
    "imagesViewed": 5
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "View recorded successfully",
  "data": {
    "viewId": 1,
    "listingType": "property",
    "listingId": 123,
    "viewDuration": 45,
    "viewedAt": "2026-01-07T10:30:00.000Z"
  }
}
```

### 2. Update View Duration

**PUT** `/api/listing-views/:viewId/duration`

Updates the duration of an existing view. Useful for tracking how long a user stays on a page.

**Request Body:**
```json
{
  "duration": 120
}
```

### 3. Get Listing Statistics

**GET** `/api/listing-views/stats/:listingType/:listingId`

Gets comprehensive statistics for a specific listing. Requires authentication.

**Query Parameters:**
- `startDate` (optional): Start date for filtering
- `endDate` (optional): End date for filtering
- `limit` (optional): Number of recent views to return (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalViews": 1500,
      "uniqueViewers": 450,
      "uniqueSessions": 800,
      "avgViewDuration": 65.5,
      "maxViewDuration": 300,
      "minViewDuration": 5
    },
    "deviceBreakdown": [
      { "deviceType": "mobile", "count": 900 },
      { "deviceType": "desktop", "count": 500 },
      { "deviceType": "tablet", "count": 100 }
    ],
    "recentViews": [...]
  }
}
```

### 4. Get Viewer History

**GET** `/api/listing-views/my-history`

Gets viewing history for the authenticated user.

**Query Parameters:**
- `listingType` (optional): Filter by listing type
- `limit` (optional): Number of records (default: 50)
- `offset` (optional): Pagination offset

### 5. Get Trending Listings

**GET** `/api/listing-views/trending/:listingType`

Gets trending listings by type. Public endpoint.

**Query Parameters:**
- `startDate` (optional): Start date (default: last 7 days)
- `endDate` (optional): End date
- `limit` (optional): Number of results (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "listingId": 123,
      "viewCount": 500,
      "uniqueViewers": 150,
      "avgViewDuration": 75.5
    }
  ]
}
```

### 6. Get View Analytics

**GET** `/api/listing-views/analytics`

Gets aggregated analytics grouped by date. Requires authentication.

**Query Parameters:**
- `listingType` (optional): Filter by listing type
- `listingId` (optional): Filter by specific listing
- `startDate` (optional): Start date
- `endDate` (optional): End date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "date": "2026-01-07",
      "totalViews": 250,
      "uniqueViewers": 80,
      "avgViewDuration": 68.5
    }
  ]
}
```

## Usage Examples

### Frontend Integration

#### Track a Property View

```javascript
// When a user opens a property page
const trackView = async (propertyId) => {
  const sessionId = getOrCreateSessionId(); // Get from localStorage/cookies
  
  const response = await fetch('/api/listing-views', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Include cookies for auth
    body: JSON.stringify({
      listingType: 'property',
      listingId: propertyId,
      sessionId: sessionId,
      deviceType: detectDeviceType(),
    })
  });
  
  const { data } = await response.json();
  return data.viewId; // Store this to update duration later
};
```

#### Update View Duration on Page Exit

```javascript
let viewId = null;
let viewStartTime = Date.now();

// When page loads
window.addEventListener('load', async () => {
  viewId = await trackView(propertyId);
});

// When user leaves the page
window.addEventListener('beforeunload', async () => {
  if (viewId) {
    const duration = Math.floor((Date.now() - viewStartTime) / 1000);
    
    // Use sendBeacon for reliable tracking even on page close
    navigator.sendBeacon(
      `/api/listing-views/${viewId}/duration`,
      JSON.stringify({ duration })
    );
  }
});
```

#### Display View Statistics

```javascript
// Get statistics for a property
const getPropertyStats = async (propertyId) => {
  const response = await fetch(
    `/api/listing-views/stats/property/${propertyId}?limit=5`,
    {
      credentials: 'include'
    }
  );
  
  const { data } = await response.json();
  console.log(`Total views: ${data.stats.totalViews}`);
  console.log(`Unique visitors: ${data.stats.uniqueViewers}`);
  console.log(`Average time spent: ${data.stats.avgViewDuration}s`);
};
```

#### Show Trending Properties

```javascript
// Get trending properties from last 7 days
const getTrendingProperties = async () => {
  const response = await fetch('/api/listing-views/trending/property?limit=10');
  const { data } = await response.json();
  
  // Display trending properties
  data.forEach(property => {
    console.log(`Property ${property.listingId}: ${property.viewCount} views`);
  });
};
```

## Service Methods

The `ListingViewService` provides the following methods:

### recordView(viewData)
Records a new view with all tracking information.

### updateViewDuration(viewId, duration)
Updates the duration of an existing view.

### getListingViewStats(listingType, listingId, options)
Gets comprehensive statistics for a specific listing.

### getViewerHistory(viewerId, options)
Gets viewing history for a specific user.

### getTrendingListings(listingType, options)
Gets trending listings based on view count.

### getViewAnalytics(options)
Gets analytics data aggregated by date.

### cleanupOldViews(daysToKeep)
Deletes old view records (recommended to run periodically).

## Database Migration

Run the migration to create the table:

```bash
psql -U your_username -d your_database -f migrations/create-listing-view-table.sql
```

Or if using Sequelize sync:
```javascript
await db.sequelize.sync({ alter: true });
```

## Performance Considerations

1. **Indexes**: The table includes optimized indexes for common queries
2. **Async Tracking**: Consider using background jobs for non-critical tracking
3. **Data Retention**: Use the `cleanupOldViews()` method to remove old data
4. **Caching**: Cache aggregated statistics for frequently viewed listings
5. **Rate Limiting**: Consider rate limiting view recording to prevent abuse

## Privacy & GDPR Compliance

- IP addresses are stored but excluded from API responses
- Consider anonymizing IP addresses after a certain period
- Provide methods for users to request their data deletion
- Document data retention policies

## Future Enhancements

- [ ] Real-time view tracking with WebSockets
- [ ] Heatmap tracking for page interactions
- [ ] A/B testing support
- [ ] Integration with external analytics platforms
- [ ] Machine learning for view prediction
- [ ] Automated fraud detection
