# Presigned URL API Documentation

## Overview
This API allows you to generate multiple presigned URLs for direct upload to S3 storage. This approach is more efficient than uploading through the server as files are uploaded directly from the client to S3.

## Endpoint

**POST** `/api/upload/presigned-urls`

### Authentication
Requires authentication. Include the JWT token in the Authorization header or as a cookie.

### Request Body

```json
{
  "folder": "listing-drafts/images",
  "count": 5,
  "contentType": "image/jpeg",
  "bucketName": "optional-custom-bucket",
  "expiresIn": 300
}
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `folder` | string | Yes | S3 folder path where files will be uploaded |
| `count` | number | Yes | Number of presigned URLs to generate (1-50) |
| `contentType` | string | No | MIME type (e.g., 'image/jpeg', 'image/png', 'video/mp4') |
| `bucketName` | string | No | Custom bucket name (uses default if not provided) |
| `expiresIn` | number | No | URL expiration time in seconds (default: 300 = 5 minutes) |

#### Allowed Folder Paths

- `listing-drafts/images`
- `listing-drafts/videos`
- `listing-drafts/documents`
- `listing-drafts/plans`
- `profile/images`
- `profile/videos`
- `agency/images`
- `general/images`
- `general/videos`

### Response

#### Success Response (200)

```json
{
  "success": true,
  "data": {
    "urls": [
      {
        "uploadUrl": "https://s3.amazonaws.com/bucket/path?signature=...",
        "key": "listing-drafts/images/1734480000000_abc123.jpg",
        "publicUrl": "https://bucket.s3.region.amazonaws.com/listing-drafts/images/1734480000000_abc123.jpg"
      },
      {
        "uploadUrl": "https://s3.amazonaws.com/bucket/path?signature=...",
        "key": "listing-drafts/images/1734480000001_def456.jpg",
        "publicUrl": "https://bucket.s3.region.amazonaws.com/listing-drafts/images/1734480000001_def456.jpg"
      }
    ],
    "expiresIn": 300,
    "uploadInstructions": {
      "method": "PUT",
      "headers": {
        "Content-Type": "image/jpeg"
      },
      "note": "Use the uploadUrl for PUT request with file binary data. After successful upload, use publicUrl to reference the file."
    }
  },
  "message": "Presigned URLs generated successfully"
}
```

#### Error Responses

**400 Bad Request**
```json
{
  "success": false,
  "message": "Folder path is required"
}
```

**400 Bad Request**
```json
{
  "success": false,
  "message": "Count must be a positive number"
}
```

**400 Bad Request**
```json
{
  "success": false,
  "message": "Cannot generate more than 50 URLs at once"
}
```

**400 Bad Request**
```json
{
  "success": false,
  "message": "Invalid folder path. Allowed folders: ..."
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Failed to generate presigned URLs"
}
```

## Usage Example

### 1. Request Presigned URLs

```javascript
// Frontend code
const response = await fetch('http://localhost:3000/api/upload/presigned-urls', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` // or use cookies
  },
  credentials: 'include',
  body: JSON.stringify({
    folder: 'listing-drafts/images',
    count: 3,
    contentType: 'image/jpeg',
    expiresIn: 600 // 10 minutes
  })
});

const result = await response.json();
const presignedUrls = result.data.urls;
```

### 2. Upload Files Using Presigned URLs

```javascript
// Upload each file to its presigned URL
async function uploadFile(file, presignedUrlData) {
  const { uploadUrl, publicUrl, key } = presignedUrlData;
  
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });
    
    if (response.ok) {
      console.log('Upload successful!');
      console.log('Public URL:', publicUrl);
      return { success: true, url: publicUrl, key };
    } else {
      throw new Error('Upload failed');
    }
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error };
  }
}

// Upload multiple files
const files = Array.from(fileInput.files); // From <input type="file" multiple>
const uploadResults = await Promise.all(
  files.map((file, index) => uploadFile(file, presignedUrls[index]))
);

// Save the public URLs to your database
const uploadedUrls = uploadResults
  .filter(result => result.success)
  .map(result => result.url);
```

### 3. React Example with File Upload

```jsx
import { useState } from 'react';

function ImageUploader() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState([]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    
    try {
      // Step 1: Get presigned URLs
      const response = await fetch('/api/upload/presigned-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          folder: 'listing-drafts/images',
          count: files.length,
          contentType: 'image/jpeg'
        })
      });
      
      const result = await response.json();
      const presignedUrls = result.data.urls;
      
      // Step 2: Upload files to S3
      const uploadPromises = files.map((file, index) => 
        fetch(presignedUrls[index].uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type }
        })
      );
      
      await Promise.all(uploadPromises);
      
      // Step 3: Save public URLs
      const publicUrls = presignedUrls.map(url => url.publicUrl);
      setUploadedUrls(publicUrls);
      
      alert('Upload successful!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        multiple 
        accept="image/*" 
        onChange={handleFileChange} 
      />
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      
      {uploadedUrls.length > 0 && (
        <div>
          <h3>Uploaded Images:</h3>
          {uploadedUrls.map((url, index) => (
            <img key={index} src={url} alt={`Upload ${index}`} width="200" />
          ))}
        </div>
      )}
    </div>
  );
}
```

## Benefits of Using Presigned URLs

1. **Better Performance**: Files upload directly to S3, bypassing your server
2. **Reduced Server Load**: No need to handle large file uploads on your backend
3. **Cost Efficient**: Saves bandwidth costs on your server
4. **Scalable**: Can handle many concurrent uploads without affecting server performance
5. **Secure**: URLs expire after specified time, preventing unauthorized access

## Security Considerations

- Presigned URLs expire after the specified time (default: 5 minutes)
- Only authenticated users can request presigned URLs
- Folder paths are validated against an allowlist
- Maximum 50 URLs can be generated per request
- Files are uploaded with public-read ACL (adjust if needed)

## Notes

- Each presigned URL is unique and can only be used once
- The `publicUrl` in the response is the URL you should save to your database
- File names are automatically generated with timestamp and UUID to avoid conflicts
- Ensure your S3 bucket has proper CORS configuration for direct uploads from browser
