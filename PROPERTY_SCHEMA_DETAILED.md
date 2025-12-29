# Property Entity Schema - Detailed Structure

## Overview

The Property entity has been updated to use dedicated columns for different types of data instead of storing everything in a generic `propertyDetails` JSONB field. This provides better query performance, data validation, and clearer schema structure.

## Database Schema

### Core Fields
- `propertyId` (INTEGER, PK) - Auto-increment property ID
- `propertyName` (VARCHAR 255) - Property name (required)
- `projectId` (INTEGER, FK) - Optional link to project
- `createdBy` (INTEGER, FK) - User who created the property
- `draftId` (INTEGER, FK) - Link to listing draft
- `status` (ENUM) - ACTIVE, INACTIVE, ARCHIVED

### Basic Information
- `title` (VARCHAR 500) - Property listing title
- `description` (TEXT) - Detailed description
- `propertyType` (VARCHAR 50) - apartment, villa, plot, etc.
- `listingType` (ENUM) - sale, rent, lease
- `isNewProperty` (BOOLEAN) - Whether it's a new property

### Location Information
- `city` (VARCHAR 100) - City name
- `locality` (VARCHAR 200) - Locality/area name
- `landmark` (VARCHAR 200) - Nearby landmark
- `addressText` (TEXT) - Full formatted address
- `lat` (DECIMAL 10,8) - Latitude coordinate
- `lng` (DECIMAL 11,8) - Longitude coordinate
- `showMapExact` (BOOLEAN) - Show exact location on map

### Property Specifications
- `bedrooms` (VARCHAR 20) - Number of bedrooms
- `bathrooms` (VARCHAR 20) - Number of bathrooms
- `facing` (VARCHAR 50) - Direction property faces (north, south, etc.)
- `view` (VARCHAR 50) - View type (park_view, road_view, etc.)
- `floorNumber` (VARCHAR 20) - Floor number
- `totalFloors` (VARCHAR 20) - Total floors in building
- `unitNumber` (VARCHAR 50) - Unit/flat number
- `towerName` (VARCHAR 100) - Tower/wing name
- `isUnitNumberPrivate` (BOOLEAN) - Hide unit number from public

### Area Measurements
- `carpetArea` (VARCHAR 50) - Carpet area in sq ft
- `superArea` (VARCHAR 50) - Super built-up area in sq ft
- `areaConfig` (JSONB) - Breakdown of area types (balcony, common, parking)
- `measurementMethod` (VARCHAR 50) - How area was measured

### Property Status & Type
- `ownershipType` (VARCHAR 50) - freehold, leasehold, co-operative
- `furnishingStatus` (VARCHAR 50) - furnished, semi_furnished, unfurnished
- `possessionStatus` (VARCHAR 50) - ready, under_construction
- `ageOfProperty` (VARCHAR 50) - Age in years
- `propertyPosition` (VARCHAR 50) - corner, middle, end
- `availableFrom` (TIMESTAMP) - When property becomes available
- `possessionDate` (TIMESTAMP) - Expected possession date

### Pricing Information
- `pricing` (JSONB) - Array of pricing objects with type, unit, value
- `isPriceVerified` (BOOLEAN) - Price verification status
- `isPriceNegotiable` (BOOLEAN) - Whether price is negotiable

### Project & Names
- `projectName` (VARCHAR 200) - Name of the project
- `customPropertyName` (VARCHAR 200) - Custom property name

### Features & Amenities (JSONB Arrays)
- `features` (JSONB) - Property features (clubhouse, lift, etc.)
- `amenities` (JSONB) - Unit amenities (modular_kitchen, etc.)
- `flooringTypes` (JSONB) - Types of flooring (Ceramic, Granite, etc.)
- `smartHomeDevices` (JSONB) - Smart devices installed
- `maintenanceIncludes` (JSONB) - What maintenance covers

### Boolean Flags
- `isGated` (BOOLEAN) - Gated community
- `fireSafety` (BOOLEAN) - Fire safety features
- `hasIntercom` (BOOLEAN) - Intercom facility
- `petFriendly` (BOOLEAN) - Pets allowed
- `hasEmergencyExit` (BOOLEAN) - Emergency exit available

### RERA & Documents
- `reraIds` (JSONB) - Array of RERA registration IDs
- `documents` (JSONB) - Array of property documents

### Media
- `mediaData` (JSONB) - Array of property images and videos
- `propertyPlans` (JSONB) - Array of floor plans

### Additional Details
- `furnishingDetails` (JSONB) - Detailed furnishing information

### Timestamps
- `property_created_at` (TIMESTAMP) - Creation timestamp
- `property_updated_at` (TIMESTAMP) - Last update timestamp
- `property_deleted_at` (TIMESTAMP) - Soft delete timestamp (nullable)

## Indexes

The following indexes are created for optimized queries:

1. `idx_property_name` - On property_name
2. `idx_property_project_id` - On project_id
3. `idx_property_created_by` - On created_by
4. `idx_property_draft_id` - On draft_id
5. `idx_property_status` - On status
6. `idx_property_city` - On city
7. `idx_property_locality` - On locality
8. `idx_property_type` - On property_type
9. `idx_property_listing_type` - On listing_type
10. `idx_property_bedrooms` - On bedrooms
11. `idx_property_lat_lng` - Composite on (lat, lng)
12. `idx_property_possession_status` - On possession_status
13. `idx_property_furnishing_status` - On furnishing_status
14. `idx_property_created_at` - On property_created_at

## Sample Request Payload

```json
{
  "draftId": 123,
  "city": "New Delhi",
  "view": "park_view",
  "title": "spacious 3bhk for sale in prime location",
  "facing": "north",
  "isGated": true,
  "pricing": [
    {
      "type": "asking_price",
      "unit": "total",
      "value": "8000000"
    }
  ],
  "reraIds": [
    {
      "id": "RETXCTFFCJGFK"
    }
  ],
  "bedrooms": "3",
  "features": [
    "clubhouse",
    "lift",
    "visitor_parking",
    "children_play_area",
    "water_supply_247",
    "piped_gas"
  ],
  "landmark": "",
  "locality": "Pandit Pant Marg Area",
  "amenities": [
    "modular_kitchen",
    "servant_room",
    "furnished",
    "semi_furnished",
    "study_room",
    "internet_wifi",
    "gas_pipeline",
    "intercom"
  ],
  "bathrooms": "2",
  "documents": [
    {
      "key": "listing-drafts/documents/1767026139467.pdf",
      "url": "https://example.com/document.pdf",
      "title": "",
      "docType": "",
      "category": "",
      "fileName": "RERA_Certificate.pdf",
      "fileSize": 508110,
      "fileType": "application/pdf",
      "uploadedAt": "2025-12-29T16:35:39.463Z",
      "description": ""
    }
  ],
  "mediaData": [
    {
      "key": "listing-drafts/images/1767026129278.jpg",
      "url": "https://example.com/image.jpg",
      "type": "image",
      "title": "",
      "category": "",
      "description": ""
    }
  ],
  "superArea": "900",
  "towerName": "A",
  "areaConfig": [
    {
      "type": "balcony",
      "value": "40"
    },
    {
      "type": "common",
      "value": "50"
    },
    {
      "type": "parking",
      "value": "70"
    }
  ],
  "carpetArea": "500",
  "fireSafety": true,
  "unitNumber": "506",
  "addressText": "J6C6+75V, Pandit Pant Marg Area, New Delhi",
  "coordinates": {
    "lat": 28.620507803889033,
    "lng": 77.2102702944514
  },
  "description": "spacious 3bhk for sale in prime location",
  "floorNumber": "5",
  "hasIntercom": false,
  "listingType": "sale",
  "petFriendly": true,
  "projectName": "SRK HOMES",
  "totalFloors": "9",
  "propertyType": "apartment",
  "showMapExact": false,
  "ageOfProperty": "5",
  "availableFrom": "",
  "flooringTypes": [
    "Ceramic",
    "Granite",
    "Marble",
    "Mosaic"
  ],
  "isNewProperty": true,
  "ownershipType": "freehold",
  "propertyPlans": [
    {
      "key": "listing-drafts/plans/1767026135596.jpg",
      "url": "https://example.com/plan.jpg",
      "title": "",
      "fileName": "FloorPlan.jpeg",
      "fileSize": 46259,
      "fileType": "image/jpeg",
      "uploadedAt": "2025-12-29T16:35:35.587Z",
      "description": ""
    }
  ],
  "possessionDate": "",
  "isPriceVerified": false,
  "furnishingStatus": "unfurnished",
  "hasEmergencyExit": false,
  "possessionStatus": "ready",
  "propertyPosition": "middle",
  "smartHomeDevices": [
    "video_doorbell",
    "home_automation_system",
    "smart_switches"
  ],
  "furnishingDetails": {},
  "isPriceNegotiable": false,
  "measurementMethod": "self_measured",
  "customPropertyName": "SRK HOMES",
  "isUnitNumberPrivate": false,
  "maintenanceIncludes": []
}
```

## Benefits of Detailed Schema

### 1. Performance
- **Indexed Queries**: Direct column indexes are faster than JSONB path queries
- **Query Optimization**: Database can better optimize queries on typed columns
- **Efficient Filtering**: WHERE clauses on columns are more efficient

### 2. Data Integrity
- **Type Safety**: Database enforces data types (VARCHAR, INTEGER, BOOLEAN, etc.)
- **Constraints**: ENUMs enforce valid values (listingType must be sale/rent/lease)
- **Validation**: Database-level validation for data quality

### 3. Developer Experience
- **Clear Schema**: Easy to understand what data is stored where
- **Auto-completion**: Better IDE support with known column names
- **Documentation**: Self-documenting schema with column comments

### 4. Query Flexibility
- **Complex Filters**: Easy to filter by city, bedrooms, price range, etc.
- **Sorting**: Efficient sorting on any column
- **Joins**: Better performance when joining with other tables
- **Aggregations**: Easy to aggregate on specific fields

## Query Examples

### Filter by City and Bedrooms
```sql
SELECT * FROM property 
WHERE city = 'New Delhi' 
  AND bedrooms = '3' 
  AND status = 'ACTIVE'
ORDER BY property_created_at DESC;
```

### Location-based Search
```sql
SELECT * FROM property 
WHERE lat BETWEEN 28.6 AND 28.7 
  AND lng BETWEEN 77.2 AND 77.3
  AND listing_type = 'sale';
```

### Advanced Filtering
```sql
SELECT * FROM property 
WHERE city ILIKE '%delhi%'
  AND property_type = 'apartment'
  AND bedrooms IN ('2', '3')
  AND furnishing_status = 'furnished'
  AND status = 'ACTIVE'
ORDER BY property_created_at DESC
LIMIT 10;
```

## Migration Instructions

1. **Backup Database**: Always backup before running migrations
2. **Run Migration**: Execute `update-property-detailed-schema.sql`
3. **Verify Schema**: Check all columns are created
4. **Update Sequelize**: Restart server to sync entity definitions
5. **Test API**: Verify property creation and queries work

```bash
# Backup
pg_dump -U username database_name > backup_$(date +%Y%m%d).sql

# Run migration
psql -U username -d database_name -f migrations/update-property-detailed-schema.sql

# Verify
psql -U username -d database_name -c "\d property"
```

## Backward Compatibility

The migration adds new columns without removing existing ones. If you had a `property_details` JSONB column, it will remain but should be deprecated in favor of the new specific columns.

## Future Enhancements

1. **Full-text Search**: Add tsvector column for property search
2. **PostGIS Integration**: Use geography type for precise location queries
3. **Price History**: Track price changes over time
4. **View Analytics**: Track property views and interest
5. **Comparison Features**: Easy comparison between properties

---

**Last Updated**: December 29, 2025  
**Schema Version**: 2.0.0  
**Migration File**: `update-property-detailed-schema.sql`
