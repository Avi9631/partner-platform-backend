# Temporal Setup Guide

## Current Status: Temporal Disabled (Fallback Mode Active)

The application is currently running in **fallback mode** where profile submissions are processed directly without Temporal workflows. This ensures the application works immediately without requiring Temporal setup.

## Why Use Temporal?

When enabled, Temporal provides:
- ✅ **Asynchronous Processing**: Videos upload to Supabase in background
- ✅ **Automatic Retries**: Failed operations retry automatically
- ✅ **Better Reliability**: Workflow state persists across restarts
- ✅ **Scalability**: Handle high volumes of profile submissions
- ✅ **Email Notifications**: Automated confirmation emails

## Current Fallback Behavior

When `TEMPORAL_ENABLED=false` (current setting):
1. Profile video stored locally in `src/uploads/profile-videos/`
2. Database updated immediately
3. User status set to ACTIVE
4. Verification status set to PENDING
5. No email notifications sent
6. No Supabase upload

## How to Enable Temporal

### Option 1: Quick Local Development Setup

#### Step 1: Install Temporal CLI
```bash
# Windows (PowerShell as Administrator)
Invoke-WebRequest -Uri https://temporal.download/cli.ps1 -OutFile temporal-cli.ps1
.\temporal-cli.ps1

# Or using Chocolatey
choco install temporal

# Or download from: https://github.com/temporalio/cli/releases
```

#### Step 2: Start Temporal Server
```bash
# Start Temporal development server
temporal server start-dev

# Keep this terminal running
# Access Temporal UI at: http://localhost:8233
```

#### Step 3: Start Temporal Worker
```bash
# In a new terminal, navigate to project directory
cd d:\my codes\partner-platform-backend

# Start the worker
node src/temporal/worker.js

# Keep this terminal running
```

#### Step 4: Enable Temporal in Application
```bash
# Edit prod.env
TEMPORAL_ENABLED=true
```

#### Step 5: Restart Application
```bash
# Restart your Node.js server
npm start
```

### Option 2: Production Temporal Cloud Setup

#### Step 1: Sign up for Temporal Cloud
1. Visit: https://temporal.io/cloud
2. Create an account
3. Create a new namespace

#### Step 2: Get Connection Details
From Temporal Cloud dashboard, note:
- Namespace name
- gRPC endpoint
- Certificate and key

#### Step 3: Update Environment Variables
```env
TEMPORAL_ENABLED=true
TEMPORAL_ADDRESS=<your-namespace>.tmprl.cloud:7233
TEMPORAL_NAMESPACE=<your-namespace>
TEMPORAL_TASK_QUEUE=partner-platform-queue

# Add certificate paths if required
TEMPORAL_CLIENT_CERT_PATH=/path/to/client.pem
TEMPORAL_CLIENT_KEY_PATH=/path/to/client.key
```

#### Step 4: Deploy Worker
Deploy the worker as a separate service:
```bash
node src/temporal/worker.js
```

### Option 3: Docker Compose Setup

#### Step 1: Create docker-compose.yml
```yaml
version: '3.8'
services:
  temporal:
    image: temporalio/auto-setup:latest
    ports:
      - "7233:7233"
      - "8233:8233"
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgresql
    depends_on:
      - postgresql

  postgresql:
    image: postgres:13
    environment:
      POSTGRES_PASSWORD: temporal
      POSTGRES_USER: temporal
    volumes:
      - temporal-postgres:/var/lib/postgresql/data

volumes:
  temporal-postgres:
```

#### Step 2: Start Services
```bash
docker-compose up -d
```

#### Step 3: Enable in Application
```env
TEMPORAL_ENABLED=true
```

## Verification

### Check if Temporal is Working

1. **Submit a profile** with `completeProfile=true`
2. **Check logs** for:
   ```
   Partner onboarding workflow started for user X: partner-onboarding-...
   ```
3. **Open Temporal UI**: http://localhost:8233
4. **Look for workflow**: Search for `partner-onboarding-*`
5. **Verify video upload**: Check Supabase storage

### Check if Fallback is Active

If you see this in logs:
```
Processing profile completion directly for user X (Temporal: disabled)
```
Then fallback mode is active (current state).

## Troubleshooting

### Error: "Unexpected error while making gRPC request"
- **Cause**: Temporal server not running
- **Solution**: Start Temporal server or set `TEMPORAL_ENABLED=false`

### Error: "Worker not registered"
- **Cause**: Worker not running
- **Solution**: Start worker: `node src/temporal/worker.js`

### Error: "Workflow not found"
- **Cause**: Worker not loaded with workflows
- **Solution**: Check worker is importing workflows correctly

### Videos Not Uploading to Supabase
- **Cause**: S3 credentials missing
- **Solution**: Add S3 configuration to prod.env:
  ```env
  S3_ENDPOINT=https://your-project.supabase.co/storage/v1/s3
  S3_ACCESS_KEY_ID=your-key
  S3_SECRET_ACCESS_KEY=your-secret
  S3_DEFAULT_BUCKET=partner-videos
  ```

## Required Environment Variables

### Temporal Configuration
```env
TEMPORAL_ENABLED=true          # Enable/disable Temporal
TEMPORAL_ADDRESS=localhost:7233 # Temporal server address
TEMPORAL_NAMESPACE=default      # Namespace name
TEMPORAL_TASK_QUEUE=partner-platform-queue  # Task queue name
```

### S3/Supabase Configuration (for video upload)
```env
S3_ENDPOINT=https://your-project.supabase.co/storage/v1/s3
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_REGION=ap-south-1
S3_DEFAULT_BUCKET=partner-videos
```

### SMTP Configuration (for email notifications)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@partner-platform.com
```

## Feature Comparison

| Feature | Temporal Enabled | Temporal Disabled (Current) |
|---------|-----------------|---------------------------|
| Profile Submission | ✅ Works | ✅ Works |
| Video Storage | Supabase (S3) | Local Disk |
| Async Processing | Yes | No (Synchronous) |
| Email Notifications | Yes | No |
| Automatic Retries | Yes | No |
| Workflow Tracking | Yes (Workflow ID) | No |
| Scalability | High | Limited |
| Failure Recovery | Automatic | Manual |

## Recommendation

### For Development/Testing
Use **Option 1** (Local Development) - Quick and easy setup

### For Production
Use **Option 2** (Temporal Cloud) - Fully managed, scalable

### For Now (Current Setup)
Keep **Temporal Disabled** - Application works without it

## Next Steps

1. ✅ Application is working with fallback mode
2. ⏳ When ready, set up Temporal using one of the options above
3. ⏳ Update `TEMPORAL_ENABLED=true` in prod.env
4. ⏳ Configure S3/Supabase for video upload
5. ⏳ Configure SMTP for email notifications
6. ⏳ Test workflow execution

---

**Current Status**: ✅ Application Working (Fallback Mode)  
**Temporal Status**: ⏸️ Disabled (Optional Feature)  
**Action Required**: None (Application fully functional)
