# Temporal Integration Guide

Welcome to the Temporal integration for Partner Platform Backend. This guide will help you set up, use, and extend the Temporal workflows and activities.

## 🏗️ Architecture

This is an **enterprise-level implementation** with:
- ✅ Clean separation of concerns (workflows vs activities)
- ✅ Domain-driven organization (user, payment, listing, analytics)
- ✅ Centralized configuration and type definitions
- ✅ Comprehensive error handling and logging
- ✅ Production-ready patterns (saga, human-in-the-loop, scheduling)

📖 **See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed documentation**

## What is Temporal?

Temporal is a durable execution platform that allows you to build reliable, scalable applications with workflows and activities. It's perfect for:
- Long-running business processes
- Reliable task execution
- Distributed transactions  
- Background job processing

## Prerequisites

Before running Temporal workflows, you need a Temporal server running. You have two options:

### Option 1: Local Temporal Server (Development)

Install and run Temporal CLI:

```powershell
# Install Temporal CLI using Scoop (Windows)
scoop bucket add temporalio https://github.com/temporalio/scoop-bucket.git
scoop install temporal-cli

# Start Temporal server
temporal server start-dev
```

This will start:
- Temporal Server on `localhost:7233`
- Web UI on `http://localhost:8233`

### Option 2: Temporal Cloud (Production)

Sign up at [https://temporal.io/cloud](https://temporal.io/cloud) and follow their setup instructions.

## Project Structure

```
src/
├── config/
│   └── temporal.config.js          # Temporal configuration
├── temporal/
│   ├── workflows/
│   │   └── index.js                # Workflow definitions
│   ├── activities/
│   │   └── index.js                # Activity implementations
│   └── worker.js                   # Worker process
├── controller/
│   └── Temporal.controller.js      # HTTP endpoints for workflows
├── routes/
│   └── temporal.route.js           # API routes
└── utils/
    └── temporalClient.js           # Client utilities
```

## Configuration

Add these variables to your `.env` file:

```env
# Temporal Configuration
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=partner-platform-queue
TEMPORAL_MAX_CONCURRENT_ACTIVITIES=100
TEMPORAL_MAX_CONCURRENT_WORKFLOWS=100
```

## Running the Worker

The worker processes workflows and activities. You need to run it separately:

```powershell
# Start the Temporal worker
node src/temporal/worker.js
```

Keep this running in a separate terminal while your server is running.

## Using Temporal in Your Application

### 1. Add Routes to Server

Update your `server.js` to include Temporal routes:

```javascript
const temporalRoute = require("./src/routes/temporal.route.js");
app.use(temporalRoute);
```

### 2. Example: Start a Notification Workflow

```javascript
const { startWorkflow } = require('./utils/temporalClient');

async function sendNotification(userId, message) {
    const result = await startWorkflow(
        'sendNotificationWorkflow',
        { userId, message, type: 'info' },
        `notification-${userId}-${Date.now()}`
    );
    
    console.log('Workflow started:', result.workflowId);
}
```

### 3. Example: Execute and Wait for Result

```javascript
const { executeWorkflow } = require('./utils/temporalClient');

async function onboardUser(userData) {
    const result = await executeWorkflow(
        'userOnboardingWorkflow',
        userData,
        `onboarding-${userData.userId}-${Date.now()}`
    );
    
    console.log('Onboarding completed:', result);
    return result;
}
```

## API Endpoints

### Start Notification Workflow
```http
POST /api/temporal/notification/start
Content-Type: application/json

{
  "userId": "user123",
  "message": "Your account has been verified",
  "type": "verification"
}
```

### Execute Onboarding Workflow
```http
POST /api/temporal/onboarding/execute
Content-Type: application/json

{
  "userId": "user123",
  "email": "user@example.com",
  "name": "John Doe"
}
```

### Get Workflow Status
```http
GET /api/temporal/workflow/{workflowId}/status
```

### Cancel Workflow
```http
POST /api/temporal/workflow/{workflowId}/cancel
```

## Creating Custom Workflows

### 1. Define a Workflow

Create a new workflow in `src/temporal/workflows/`:

```javascript
const { proxyActivities } = require('@temporalio/workflow');

const { myActivity } = proxyActivities({
    startToCloseTimeout: '1 minute',
});

async function myCustomWorkflow(data) {
    const result = await myActivity(data);
    return result;
}

module.exports = { myCustomWorkflow };
```

### 2. Create Activities

Add activities in `src/temporal/activities/`:

```javascript
async function myActivity(data) {
    console.log('Processing:', data);
    // Your business logic here
    return { success: true };
}

module.exports = { myActivity };
```

### 3. Use in Your Code

```javascript
const { startWorkflow } = require('./utils/temporalClient');

await startWorkflow('myCustomWorkflow', { foo: 'bar' });
```

## Monitoring

Access the Temporal Web UI to monitor workflows:
- Local: http://localhost:8233
- View running workflows
- Check workflow history
- Debug failed workflows

## Best Practices

1. **Use Activities for External Calls**: Put all database queries, API calls, and side effects in activities
2. **Keep Workflows Deterministic**: Don't use random numbers or Date.now() directly in workflows
3. **Handle Errors**: Use try-catch in activities and implement retry policies
4. **Use Unique Workflow IDs**: Prevent duplicate workflow executions
5. **Set Timeouts**: Always set appropriate timeouts for activities

## Troubleshooting

### Worker Won't Start
- Ensure Temporal server is running: `temporal server start-dev`
- Check connection settings in `.env`
- Verify network connectivity to Temporal server

### Workflows Not Executing
- Ensure worker is running: `node src/temporal/worker.js`
- Check task queue name matches in config
- View logs in Temporal Web UI

### Activities Failing
- Check activity logs in terminal
- Review activity timeout settings
- Verify external dependencies (database, APIs) are accessible

## NPM Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "worker": "node src/temporal/worker.js",
    "worker:dev": "nodemon src/temporal/worker.js"
  }
}
```

Then run:
```powershell
npm run worker
```

## Production Deployment

For production:
1. Use Temporal Cloud or self-hosted Temporal cluster
2. Run multiple workers for redundancy
3. Use PM2 to manage worker processes
4. Monitor workflow metrics
5. Set up alerts for workflow failures

```powershell
# Start worker with PM2
pm2 start src/temporal/worker.js --name temporal-worker
```

## Resources

- [Temporal Documentation](https://docs.temporal.io/)
- [Node.js SDK](https://docs.temporal.io/dev-guide/node)
- [Temporal Web UI](http://localhost:8233) (local)
- [Temporal Community](https://temporal.io/community)

## Support

For issues or questions about Temporal integration, check:
1. Temporal Web UI for workflow execution details
2. Worker logs for activity errors
3. Server logs for client connection issues
