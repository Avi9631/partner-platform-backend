# Update Listing Draft API - Media Upload Enhancement

## Overview
The `updateListingDraft` API has been enhanced to support media file uploads (images and videos) to AWS S3. When media files are uploaded, they are stored in S3 and the URLs are automatically merged into the draft data JSON.

## Endpoint
```
PATCH /api/draft/updateListingDraft
```

## Authentication
Requires authentication token in headers.

## Content Type
```
multipart/form-data
```

## Request Parameters

### Form Data Fields:
1. **draftId** (required): The ID of the draft to update
2. **draftData** (required): JSON string containing draft data with metadata arrays
3. **mediaData** (optional): Property media files (images/videos) - up to 20 files
4. **docMediaData** (optional): Document files - up to 20 files
5. **planMediaData** (optional): Floor plan files - up to 20 files

### How It Works:
The `draftData` JSON contains metadata arrays (e.g., `mediaData`, `docMediaData`, `planMediaData`). When you upload files with the same field names, the API:
1. Detects files with keys matching `mediaData`, `docMediaData`, or `planMediaData`
2. Uploads each file to S3
3. Merges the S3 URLs with the corresponding metadata from `draftData`
4. Stores the complete data (metadata + URLs) back in the draft

### Media Metadata Structure in draftData:
Each item in the media arrays should contain metadata:
- `title` (string): Title or caption for the media
- `type` (string): Media type (e.g., "image", "video", "thumbnail", "floor-plan")
- `category` (string): Category (e.g., "exterior", "interior", "amenity", "layout")
- `description` (string): Detailed description of the media

### Supported File Types:
- **Images**: JPEG, JPG, PNG, WebP, HEIC, HEIF
- **Videos**: MP4, MPEG, MOV, AVI, WebM

### File Size Limits:
- Maximum file size: 100MB per file
- Maximum number of files: 20 files per request

## Response

### Success Response (200 OK):
```json
{
  "success": true,
  "data": {
    "draftId": 123,
    "userId": 456,
    "draftData": {
      "propertyName": "Luxury Villa",
      "media": [
        {
          "url": "https://s3.amazonaws.com/bucket/listing-drafts/media/user-456/uuid.jpg",
          "key": "listing-drafts/media/user-456/uuid.jpg",
          "title": "Front View of Villa",
          "type": "image",
          "category": "exterior",
          "description": "Beautiful front facade with landscaping",
          "originalName": "villa-front.jpg",
          "mimetype": "image/jpeg",
          "uploadedAt": "2025-11-24T10:30:00.000Z"
        },
        {
          "url": "https://s3.amazonaws.com/bucket/listing-drafts/media/user-456/uuid.mp4",
          "key": "listing-drafts/media/user-456/uuid.mp4",
          "title": "Property Tour Video",
          "type": "video",
          "category": "tour",
          "description": "Complete walkthrough of the property",
          "originalName": "property-tour.mp4",
          "mimetype": "video/mp4",
          "uploadedAt": "2025-11-24T10:30:00.000Z"
        }
      ]
    },
    "draftStatus": "DRAFT",
    "draft_created_at": "2025-11-24T10:00:00.000Z",
    "draft_updated_at": "2025-11-24T10:30:00.000Z"
  },
  "message": "Draft updated successfully"
}
```

### Error Responses:

**400 Bad Request** - Missing draft ID:
```json
{
  "success": false,
  "message": "Draft ID is required"
}
```

**400 Bad Request** - Invalid file type:
```json
{
  "success": false,
  "message": "Invalid file type. Only images (JPEG, PNG, WebP, HEIC) and videos (MP4, MPEG, MOV, AVI, WebM) are allowed."
}
```

**400 Bad Request** - File too large:
```json
{
  "success": false,
  "message": "File too large. Maximum size is 100MB per file."
}
```

**400 Bad Request** - Too many files:
```json
{
  "success": false,
  "message": "Too many files. Maximum 20 files allowed."
}
```

**404 Not Found** - Draft not found:
```json
{
  "success": false,
  "message": "Draft not found or unauthorized"
}
```

**500 Internal Server Error** - Upload failure:
```json
{
  "success": false,
  "message": "Failed to upload media files"
}
```

## Usage Examples

### Example 1: Update draft with media files and metadata (JavaScript/Fetch)
```javascript
const formData = new FormData();
formData.append('draftId', '123');

// Define draftData with metadata arrays
const draftData = {
  propertyName: 'Luxury Villa',
  price: 5000000,
  location: 'Mumbai',
  // Metadata for property media
  mediaData: [
    {
      title: 'Front View',
      type: 'image',
      category: 'exterior',
      description: 'Beautiful front facade with landscaping'
    },
    {
      title: 'Living Room',
      type: 'image',
      category: 'interior',
      description: 'Spacious living room with modern furnishings'
    }
  ],
  // Metadata for documents
  docMediaData: [
    {
      title: 'Property Deed',
      type: 'document',
      category: 'legal',
      description: 'Official property ownership document'
    }
  ],
  // Metadata for floor plans
  planMediaData: [
    {
      title: 'Ground Floor Plan',
      type: 'floor-plan',
      category: 'layout',
      description: 'Detailed ground floor layout'
    }
  ]
};

formData.append('draftData', JSON.stringify(draftData));

// Add media files (order must match draftData.mediaData array)
formData.append('mediaData', imageFile1); // Front View
formData.append('mediaData', imageFile2); // Living Room

// Add document files (order must match draftData.docMediaData array)
formData.append('docMediaData', pdfFile1); // Property Deed

// Add plan files (order must match draftData.planMediaData array)
formData.append('planMediaData', planFile1); // Ground Floor Plan

const response = await fetch('/api/draft/updateListingDraft', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

### Example 2: Update draft with media files from file input (Axios)
```javascript
const formData = new FormData();
formData.append('draftId', '123');

// Build metadata array from file input
const mediaFileInput = document.getElementById('mediaFiles');
const docFileInput = document.getElementById('docFiles');

const draftData = {
  propertyName: 'Modern Apartment',
  mediaData: [],
  docMediaData: []
};

// Process media files
for (let i = 0; i < mediaFileInput.files.length; i++) {
  const file = mediaFileInput.files[i];
  
  // Add metadata to draftData
  draftData.mediaData.push({
    title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
    type: file.type.startsWith('image/') ? 'image' : 'video',
    category: 'general',
    description: ''
  });
  
  // Add file to formData
  formData.append('mediaData', file);
}

// Process document files
for (let i = 0; i < docFileInput.files.length; i++) {
  const file = docFileInput.files[i];
  
  draftData.docMediaData.push({
    title: file.name.replace(/\.[^/.]+$/, ""),
    type: 'document',
    category: 'legal',
    description: ''
  });
  
  formData.append('docMediaData', file);
}

formData.append('draftData', JSON.stringify(draftData));

const response = await axios.patch('/api/draft/updateListingDraft', formData, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data'
  }
});

console.log(response.data);
```

### Example 3: Update draft without media files
```javascript
const response = await fetch('/api/draft/updateListingDraft', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    draftId: 123,
    draftData: {
      propertyName: 'Updated Property Name',
      description: 'New description'
    }
  })
});
```

### Example 4: cURL command
```bash
curl -X PATCH https://api.example.com/api/draft/updateListingDraft \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "draftId=123" \
  -F "draftData={\"propertyName\":\"Luxury Villa\",\"mediaData\":[{\"title\":\"Front View\",\"type\":\"image\",\"category\":\"exterior\",\"description\":\"Main entrance\"},{\"title\":\"Living Room\",\"type\":\"image\",\"category\":\"interior\",\"description\":\"Spacious living area\"}],\"docMediaData\":[{\"title\":\"Property Deed\",\"type\":\"document\",\"category\":\"legal\",\"description\":\"Official document\"}]}" \
  -F "mediaData=@/path/to/image1.jpg" \
  -F "mediaData=@/path/to/image2.jpg" \
  -F "docMediaData=@/path/to/deed.pdf"
```

## Implementation Details

### Architecture:
1. **Route Layer** (`draft.route.js`): Applies upload middleware before controller
2. **Upload Middleware** (`uploadMiddleware.js`): Handles multipart form data and validates files
3. **Controller Layer** (`ListingDraft.controller.js`): Processes uploads and calls S3 utility
4. **S3 Upload Utility** (`s3Upload.js`): Handles S3 upload operations
5. **Service Layer** (`ListingDraftService.service.js`): Merges media URLs with existing draft data

### Data Flow:
1. Client sends multipart form data with:
   - `draftData` JSON containing metadata arrays (`mediaData`, `docMediaData`, `planMediaData`)
   - File fields matching the metadata array names
2. Multer middleware parses files into `req.files.mediaData`, `req.files.docMediaData`, etc.
3. Controller identifies media fields and uploads files to S3
4. S3 returns URLs for uploaded files
5. Controller merges URLs with metadata from `draftData`
6. Service updates draft with complete data (metadata + URLs)

### Media Data Structure:
Each uploaded media item in the `media` array contains:
- `url`: Full S3 URL to access the file
- `key`: S3 object key for deletion/management
- `title`: Title or caption for the media (from metadata or filename)
- `type`: Media type - "image", "video", "thumbnail", "floor-plan", etc. (from metadata or auto-detected)
- `category`: Category - "exterior", "interior", "amenity", "layout", "general", etc. (from metadata)
- `description`: Detailed description of the media (from metadata)
- `originalName`: Original filename from upload
- `mimetype`: MIME type of the uploaded file
- `uploadedAt`: ISO timestamp of when the file was uploaded

## Environment Variables Required

Add these to your `.env` file:
```env
# S3 Configuration
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_REGION=ap-south-1
S3_LISTING_BUCKET=your-listing-bucket-name

# Optional: For S3-compatible services (e.g., Supabase)
S3_ENDPOINT=https://your-s3-endpoint.com
```

## Security Considerations

1. **File Type Validation**: Only allowed file types can be uploaded
2. **File Size Limits**: Prevents abuse with large files
3. **Authentication Required**: All requests must be authenticated
4. **User Authorization**: Users can only update their own drafts
5. **S3 ACL**: Files are set to 'public-read' for frontend access
6. **Unique Filenames**: UUIDs prevent filename collisions

## Future Enhancements

- Add image compression/optimization before upload
- Add thumbnail generation for images
- Add video transcoding for different resolutions
- Add ability to delete specific media files from draft
- Add progress tracking for large file uploads
- Add pre-signed URL support for secure downloads
