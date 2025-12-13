# Frontend Integration Guide - Listing Draft Media Upload

## Quick Reference

### API Endpoint
```
PATCH /api/draft/updateListingDraft
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

### Required Form Fields

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `draftId` | string | Yes | The draft ID to update |
| `draftData` | JSON string | Yes | Draft data with metadata arrays |
| `mediaData` | File(s) | No | Property media files (images/videos) |
| `docMediaData` | File(s) | No | Document files |
| `planMediaData` | File(s) | No | Floor plan files |

### How It Works

The `draftData` JSON contains metadata arrays with the same names as the file upload fields:
- `draftData.mediaData` → metadata array for `mediaData` files
- `draftData.docMediaData` → metadata array for `docMediaData` files  
- `draftData.planMediaData` → metadata array for `planMediaData` files

When files are uploaded, the API merges the S3 URLs with the corresponding metadata.

### Media Metadata Structure in draftData

Each metadata object should match this structure:

```typescript
interface MediaMetadata {
  title: string;        // e.g., "Front View", "Living Room"
  type: string;         // e.g., "image", "video", "document", "floor-plan"
  category: string;     // e.g., "exterior", "interior", "legal", "layout"
  description: string;  // e.g., "Beautiful front facade with landscaping"
}
```

**Important:** The order of items in each metadata array must match the order of corresponding files.

## React/JavaScript Implementation

### Example 1: Basic Upload with FormData

```javascript
const uploadMediaToDraft = async (draftId, mediaFiles, docFiles, planFiles) => {
  const formData = new FormData();
  
  // Add draft ID
  formData.append('draftId', draftId);
  
  // Build draftData with metadata arrays
  const draftData = {
    propertyName: 'Luxury Villa', // Other draft properties
    mediaData: [],
    docMediaData: [],
    planMediaData: []
  };
  
  // Add media files and their metadata
  mediaFiles.forEach(({ file, title, type, category, description }) => {
    draftData.mediaData.push({ title, type, category, description });
    formData.append('mediaData', file);
  });
  
  // Add document files and their metadata
  docFiles.forEach(({ file, title, type, category, description }) => {
    draftData.docMediaData.push({ title, type, category, description });
    formData.append('docMediaData', file);
  });
  
  // Add plan files and their metadata
  planFiles.forEach(({ file, title, type, category, description }) => {
    draftData.planMediaData.push({ title, type, category, description });
    formData.append('planMediaData', file);
  });
  
  formData.append('draftData', JSON.stringify(draftData));
  
  try {
    const response = await fetch('/api/draft/updateListingDraft', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Upload successful:', result.data);
      return result.data;
    } else {
      console.error('Upload failed:', result.message);
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
};

// Usage
const mediaFiles = [
  {
    file: imageFile1,
    title: 'Front View',
    type: 'image',
    category: 'exterior',
    description: 'Main entrance view'
  },
  {
    file: videoFile,
    title: 'Property Tour',
    type: 'video',
    category: 'tour',
    description: 'Complete walkthrough'
  }
];

const docFiles = [
  {
    file: pdfFile,
    title: 'Property Deed',
    type: 'document',
    category: 'legal',
    description: 'Ownership document'
  }
];

const planFiles = [
  {
    file: planFile,
    title: 'Ground Floor',
    type: 'floor-plan',
    category: 'layout',
    description: 'Ground floor layout'
  }
];

await uploadMediaToDraft('123', mediaFiles, docFiles, planFiles);
```

### Example 2: React Component with File Input

```jsx
import React, { useState } from 'react';

const MediaUploadForm = ({ draftId, onSuccess }) => {
  const [files, setFiles] = useState([]);
  const [metadata, setMetadata] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e, fieldType) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Create file objects with metadata
    const fileObjects = selectedFiles.map(file => ({
      file,
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      type: file.type.startsWith('image/') ? 'image' : 
            file.type.startsWith('video/') ? 'video' : 'document',
      category: fieldType === 'media' ? 'general' : 
                fieldType === 'doc' ? 'legal' : 'layout',
      description: ''
    }));
    
    if (fieldType === 'media') {
      setFiles(prev => ({ ...prev, media: fileObjects }));
    } else if (fieldType === 'doc') {
      setFiles(prev => ({ ...prev, docs: fileObjects }));
    } else if (fieldType === 'plan') {
      setFiles(prev => ({ ...prev, plans: fileObjects }));
    }
  };

  const updateMetadata = (index, field, value) => {
    const newMetadata = [...metadata];
    newMetadata[index][field] = value;
    setMetadata(newMetadata);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    const formData = new FormData();
    formData.append('draftId', draftId);
    formData.append('mediaMetadata', JSON.stringify(metadata));
    
    files.forEach(file => {
      formData.append('media', file);
    });

    try {
      const response = await fetch('/api/draft/updateListingDraft', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        onSuccess(result.data);
        setFiles([]);
        setMetadata([]);
      } else {
        alert('Upload failed: ' + result.message);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Select Media Files (Images/Videos)</label>
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </div>

      {files.map((file, index) => (
        <div key={index} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
          <h4>{file.name}</h4>
          
          <label>Title:</label>
          <input
            type="text"
            value={metadata[index]?.title || ''}
            onChange={(e) => updateMetadata(index, 'title', e.target.value)}
            required
          />

          <label>Type:</label>
          <select
            value={metadata[index]?.type || 'image'}
            onChange={(e) => updateMetadata(index, 'type', e.target.value)}
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="thumbnail">Thumbnail</option>
            <option value="floor-plan">Floor Plan</option>
          </select>

          <label>Category:</label>
          <select
            value={metadata[index]?.category || 'general'}
            onChange={(e) => updateMetadata(index, 'category', e.target.value)}
          >
            <option value="exterior">Exterior</option>
            <option value="interior">Interior</option>
            <option value="amenity">Amenity</option>
            <option value="layout">Layout</option>
            <option value="general">General</option>
          </select>

          <label>Description:</label>
          <textarea
            value={metadata[index]?.description || ''}
            onChange={(e) => updateMetadata(index, 'description', e.target.value)}
            rows="2"
          />
        </div>
      ))}

      <button type="submit" disabled={uploading || files.length === 0}>
        {uploading ? 'Uploading...' : 'Upload Media'}
      </button>
    </form>
  );
};

export default MediaUploadForm;
```

### Example 3: Using Axios with Progress Tracking

```javascript
import axios from 'axios';

const uploadMediaWithProgress = async (draftId, files, metadata, onProgress) => {
  const formData = new FormData();
  formData.append('draftId', draftId);
  formData.append('mediaMetadata', JSON.stringify(metadata));
  
  files.forEach(file => {
    formData.append('media', file);
  });

  try {
    const response = await axios.patch(
      '/api/draft/updateListingDraft',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          if (onProgress) {
            onProgress(percentCompleted);
          }
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Usage with progress callback
await uploadMediaWithProgress(
  '123',
  files,
  metadata,
  (progress) => {
    console.log(`Upload progress: ${progress}%`);
    // Update UI progress bar
  }
);
```

## Common Media Categories

Use these predefined categories for consistency:

- **exterior**: Outdoor views, building facade, entrances
- **interior**: Indoor rooms, living spaces
- **amenity**: Swimming pool, gym, clubhouse, parking
- **layout**: Floor plans, property layouts
- **location**: Nearby landmarks, neighborhood
- **general**: Miscellaneous media

## Common Media Types

- **image**: Regular photographs
- **video**: Video tours, walkthroughs
- **thumbnail**: Small preview images
- **floor-plan**: Architectural floor plans
- **360**: 360-degree panoramic images (future)

## Error Handling

```javascript
try {
  const result = await uploadMediaToDraft(draftId, files, metadata);
  // Success
} catch (error) {
  if (error.message.includes('File too large')) {
    alert('File size exceeds 100MB limit');
  } else if (error.message.includes('Too many files')) {
    alert('Maximum 20 files allowed per upload');
  } else if (error.message.includes('Invalid file type')) {
    alert('Only images and videos are allowed');
  } else if (error.message.includes('Draft ID is required')) {
    alert('Draft ID is missing');
  } else if (error.message.includes('Draft not found')) {
    alert('Draft not found or unauthorized');
  } else {
    alert('Upload failed. Please try again.');
  }
}
```

## File Validation (Client-side)

```javascript
const validateFile = (file) => {
  const maxSize = 100 * 1024 * 1024; // 100MB
  const allowedTypes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'
  ];

  if (file.size > maxSize) {
    throw new Error(`File ${file.name} exceeds 100MB limit`);
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File ${file.name} has unsupported format`);
  }

  return true;
};

// Validate before upload
const files = Array.from(fileInput.files);
files.forEach(file => validateFile(file));
```

## Response Data Structure

After successful upload, you'll receive:

```javascript
{
  success: true,
  data: {
    draftId: 123,
    userId: 456,
    draftData: {
      // ... other draft data
      media: [
        {
          url: "https://s3.../file.jpg",
          key: "listing-drafts/media/user-456/uuid.jpg",
          title: "Front View",
          type: "image",
          category: "exterior",
          description: "Main entrance view",
          originalName: "front.jpg",
          mimetype: "image/jpeg",
          uploadedAt: "2025-11-24T10:30:00.000Z"
        }
        // ... more media items
      ]
    }
  },
  message: "Draft updated successfully"
}
```

## Tips for Frontend Implementation

1. **Always match array order**: Ensure `mediaMetadata` array order matches the `media` files order
2. **Validate files client-side**: Check file size and type before upload to save bandwidth
3. **Show upload progress**: Use `onUploadProgress` for better UX
4. **Handle large files**: Consider chunking or separate uploads for very large videos
5. **Preserve existing media**: The API merges new media with existing, so existing media is preserved
6. **Use thumbnails**: Generate and upload thumbnails separately for better performance
7. **Lazy load media**: Load media URLs from the draft lazily to improve initial page load

## Testing

Test with various scenarios:
- Single image upload
- Multiple images upload
- Mix of images and videos
- Maximum file size (100MB)
- Maximum file count (20 files)
- Invalid file types
- Missing metadata
- Metadata mismatch (different array lengths)
