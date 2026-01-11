# Backend API Implementation for PropertyLeads & PropertyAnalytics

## Overview
This document summarizes the backend APIs implemented to support the PropertyLeads and PropertyAnalytics React components in the partner platform dashboard.

## Changes Summary

### 1. **Renamed ListingView to ListingAnalytics**
   - **Reason**: Better semantic naming - "Analytics" more accurately describes tracking views and engagement metrics
   - **Files Changed**:
     - `src/entity/ListingView.entity.js` → `ListingAnalytics.entity.js`
     - Updated references in `src/entity/index.js`
     - Updated `src/service/ListingViewService.service.js` (kept filename for backward compatibility)
     - Updated `src/controller/ListingView.controller.js`
     - Updated route from `/api/listing-views` to `/api/listing-analytics`

### 2. **Created ListingLead Entity & Migration**
   - **Migration**: `migrations/create-listing-lead-table.sql`
   - **Entity**: `src/entity/ListingLead.entity.js`
   - **Features**:
     - Polymorphic relationship to track leads across PROPERTY, PG_COLIVING, PROJECT, DEVELOPER
     - Three lead reasons: CONNECT_AGENT, CALLBACK_REQUEST, VIRTUAL_TOUR
     - Status tracking: NEW, CONTACTED, IN_PROGRESS, COMPLETED, CLOSED
     - Customer information: name, email, phone, message
     - Additional fields: location, preferred contact time, scheduled date
     - Automatic timestamps for created, updated, contacted, and completed

### 3. **Implemented ListingLead Service**
   - **File**: `src/service/ListingLeadService.service.js`
   - **Methods**:
     - `createLead()` - Create new lead
     - `getLeads()` - Get leads with pagination and filters
     - `getLeadById()` - Get specific lead by ID
     - `updateLeadStatus()` - Update lead status
     - `updateLead()` - Update lead details
     - `getLeadStats()` - Get statistics (total, by status, by reason, by type)
     - `deleteLead()` - Delete a lead
     - `getLeadsForListing()` - Get all leads for a specific listing

### 4. **Implemented ListingLead Controller**
   - **File**: `src/controller/ListingLead.controller.js`
   - **Handlers**:
     - `createLeadHandler` - Validate and create leads
     - `getLeadsHandler` - Fetch with filters and pagination
     - `getLeadByIdHandler` - Get single lead with permission check
     - `updateLeadStatusHandler` - Update status with validation
     - `updateLeadHandler` - Update lead details
     - `getLeadStatsHandler` - Get aggregated statistics
     - `deleteLeadHandler` - Delete lead
     - `getLeadsForListingHandler` - Get listing-specific leads

### 5. **Enhanced Analytics Service**
   - **File**: `src/service/ListingViewService.service.js`
   - **New Method**: `getComprehensiveAnalytics()`
   - **Features**:
     - **Views Tracking**: Total views with trend comparison (vs previous period)
     - **Bounce Rate**: Calculated as views < 10 seconds
     - **Conversion Rate**: Leads generated / Total views
     - **Average Time on Page**: From viewDuration field
     - **Time Range Support**: 7d, 30d, 90d, all
     - **Daily Trends**: Daily breakdown for all metrics
     - **Automatic Date Formatting**: Frontend-ready date labels

### 6. **Created Lead Routes**
   - **File**: `src/routes/lead.route.js`
   - **Base Path**: `/api/leads`
   - **Endpoints**:
     ```
     POST   /                          - Create lead (Public)
     GET    /                          - Get leads with filters (Private)
     GET    /stats                     - Get lead statistics (Private)
     GET    /:listingType/:listingId   - Get leads for listing (Private)
     GET    /:leadId                   - Get lead by ID (Private)
     PUT    /:leadId                   - Update lead details (Private)
     PUT    /:leadId/status            - Update lead status (Private)
     DELETE /:leadId                   - Delete lead (Private)
     ```

### 7. **Updated Analytics Routes**
   - **File**: `src/routes/listingView.route.js`
   - **Base Path**: `/api/listing-analytics` (changed from `/api/listing-views`)
   - **New Endpoint**:
     ```
     GET    /comprehensive/:listingType/:listingId
            - Get comprehensive analytics with time range support
            - Query params: timeRange (7d, 30d, 90d, all)
     ```

### 8. **Updated Server Configuration**
   - **File**: `server.js`
   - Registered new lead routes
   - Updated listing-analytics route path

## API Usage Examples

### PropertyLeads Component

#### Fetch Leads for a Property
```javascript
GET /api/leads?listingType=PROPERTY&listingId=123&page=1&pageSize=10&status=NEW
```

**Response**:
```json
{
  "success": true,
  "data": {
    "leads": [...],
    "pagination": {
      "total": 50,
      "page": 1,
      "pageSize": 10,
      "totalPages": 5
    }
  }
}
```

#### Get Lead Statistics
```javascript
GET /api/leads/stats?listingType=PROPERTY&listingId=123
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 50,
    "new": 15,
    "contacted": 10,
    "inProgress": 12,
    "completed": 8,
    "closed": 5,
    "byReason": [...],
    "byType": [...]
  }
}
```

#### Update Lead Status
```javascript
PUT /api/leads/456/status
Body: { "status": "CONTACTED" }
```

### PropertyAnalytics Component

#### Fetch Comprehensive Analytics
```javascript
GET /api/listing-analytics/comprehensive/property/123?timeRange=7d
```

**Response**:
```json
{
  "success": true,
  "data": {
    "views": {
      "total": 1247,
      "change": 12.5,
      "trend": "up",
      "daily": [
        { "date": "Jan 1", "value": 156 },
        { "date": "Jan 2", "value": 178 },
        ...
      ]
    },
    "bounceRate": {
      "total": 42.3,
      "change": -3.8,
      "trend": "down",
      "daily": [...]
    },
    "conversionRate": {
      "total": 7.14,
      "change": 2.1,
      "trend": "up",
      "daily": [...]
    },
    "averageTimeOnPage": {
      "total": 154,
      "totalFormatted": "2m 34s",
      "change": 8.5,
      "trend": "up",
      "daily": [...]
    }
  }
}
```

## Frontend Integration Updates Needed

### PropertyLeads.jsx Updates
Replace the `loadLeads` function:
```javascript
const loadLeads = async (currentPage = 1, resetPage = false) => {
  try {
    setLoading(true);
    
    const params = new URLSearchParams({
      listingType: 'PROPERTY',
      listingId: draftId,
      page: resetPage ? 1 : currentPage,
      pageSize: pageSize,
    });

    // Add filters
    if (filters.type !== 'all') params.append('listingType', filters.type);
    if (filters.reason !== 'all') params.append('reason', filters.reason);
    if (filters.status !== 'all') params.append('status', filters.status);

    // Fetch leads
    const leadsResponse = await apiClient.get(`/api/leads?${params.toString()}`);
    setLeads(leadsResponse.data.leads);
    setTotalLeads(leadsResponse.data.pagination.total);
    setTotalPages(leadsResponse.data.pagination.totalPages);
    
    // Fetch statistics
    const statsResponse = await apiClient.get(
      `/api/leads/stats?listingType=PROPERTY&listingId=${draftId}`
    );
    setStats(statsResponse.data);
    
    setPage(resetPage ? 1 : currentPage);
  } catch (error) {
    console.error('Error loading leads:', error);
    toast.error('Failed to load leads');
  } finally {
    setLoading(false);
  }
};
```

### PropertyAnalytics.jsx Updates
Replace the `fetchAnalytics` function:
```javascript
const fetchAnalytics = async () => {
  try {
    setLoading(true);
    
    const response = await apiClient.get(
      `/api/listing-analytics/comprehensive/property/${draftId}?timeRange=${timeRange}`
    );
    
    setAnalytics(response.data);
  } catch (error) {
    console.error('Error loading analytics:', error);
    toast.error('Failed to load analytics');
  } finally {
    setLoading(false);
  }
};
```

## Database Migration

Run the migration to create the listing_lead table:
```sql
psql -U your_user -d your_database -f migrations/create-listing-lead-table.sql
```

Or if using Sequelize migrations:
```bash
npm run migrate
```

## Testing

### Test Lead Creation
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "listingType": "PROPERTY",
    "listingId": 123,
    "reason": "CONNECT_AGENT",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "+1234567890",
    "customerMessage": "Interested in property"
  }'
```

### Test Analytics Fetch
```bash
curl -X GET "http://localhost:3000/api/listing-analytics/comprehensive/property/123?timeRange=7d" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Benefits

1. **Better Organization**: Renamed from ListingView to ListingAnalytics for clarity
2. **Comprehensive Lead Management**: Full CRUD operations with filtering and statistics
3. **Rich Analytics**: Bounce rate, conversion rate, time on page with trend analysis
4. **Flexible Time Ranges**: Support for 7d, 30d, 90d, and all-time analytics
5. **Scalable Architecture**: Polymorphic relationships support all listing types
6. **Performance**: Optimized queries with proper indexing
7. **Type Safety**: Enum validation for listing types, reasons, and statuses

## Next Steps

1. Run database migration to create listing_lead table
2. Update frontend API calls in PropertyLeads.jsx and PropertyAnalytics.jsx
3. Test lead creation and retrieval
4. Test analytics with different time ranges
5. Consider adding email notifications for new leads
6. Add webhook support for real-time lead updates
