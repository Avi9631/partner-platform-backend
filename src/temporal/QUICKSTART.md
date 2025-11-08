# Temporal Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Start Temporal Server

```bash
# Install Temporal CLI (Windows with Scoop)
scoop bucket add temporalio https://github.com/temporalio/scoop-bucket.git
scoop install temporal-cli

# Start Temporal server
temporal server start-dev
```

Server will start on:
- **Temporal Server**: `localhost:7233`
- **Web UI**: `http://localhost:8233`

### 2. Configure Environment

Add to your `.env` file:

```env
# Temporal Configuration
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=partner-platform-queue
TEMPORAL_MAX_CONCURRENT_ACTIVITIES=100
TEMPORAL_MAX_CONCURRENT_WORKFLOWS=100

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@partner-platform.com
```

### 3. Start the Worker

```bash
# Start worker in development mode (auto-restart on changes)
npm run worker:dev

# Or start worker normally
node src/temporal/worker.js
```

### 4. Start Your Application Server

```bash
# In a separate terminal
npm start
# or
npm run dev
```

---

## 📚 Available Workflows

### User Workflows

#### Send Notification
```javascript
POST /api/temporal/notification/start
{
  "userId": "user@example.com",
  "message": "Your listing has been approved!",
  "type": "success"
}
```

#### User Onboarding
```javascript
POST /api/temporal/onboarding/execute
{
  "userId": "user123",
  "email": "newuser@example.com",
  "name": "John Doe"
}
```

### Payment Workflows

#### Process Payment
```javascript
const { startWorkflow } = require('./src/utils/temporalClient');

await startWorkflow('processPaymentWorkflow', {
  orderId: 'ORD123456',
  userId: 'user@example.com',
  amount: 999.99,
  currency: 'USD',
  paymentMethod: 'card'
});
```

#### Subscription Payment
```javascript
await startWorkflow('subscriptionPaymentWorkflow', {
  subscriptionId: 'SUB789',
  userId: 'user@example.com',
  amount: 29.99,
  currency: 'USD',
  billingPeriod: 'monthly'
});
```

### Listing Workflows

#### Listing Approval (with signals)
```javascript
// Start approval workflow
const { handle } = await startWorkflow('listingApprovalWorkflow', {
  listingId: 'LST001',
  userId: 'agent@example.com',
  propertyData: {
    title: 'Beautiful 3BR Apartment',
    description: 'Spacious apartment...',
    price: 350000,
    location: { address: '123 Main St', city: 'NYC', state: 'NY' },
    images: ['img1.jpg', 'img2.jpg']
  }
});

// Later: approve or reject
await handle.signal('approve', 'Looks great!');
// or
await handle.signal('reject', 'Missing documentation');
```

#### Listing Expiration
```javascript
await startWorkflow('listingExpirationWorkflow', {
  listingId: 'LST001',
  userId: 'agent@example.com',
  expirationDate: '2025-12-31T23:59:59Z'
});
```

### Analytics Workflows

#### Daily Report
```javascript
await startWorkflow('dailyReportWorkflow', {
  reportType: 'sales',
  recipients: ['admin@example.com', 'manager@example.com'],
  scheduleTime: new Date().toISOString()
});
```

#### Data Cleanup
```javascript
await startWorkflow('dataCleanupWorkflow', {
  cleanupType: 'logs',
  retentionDays: 90
});
```

#### Reminder
```javascript
await startWorkflow('reminderWorkflow', {
  userId: 'user@example.com',
  reminderType: 'payment_due',
  message: 'Your subscription payment is due in 3 days',
  scheduledTime: '2025-11-12T10:00:00Z',
  metadata: { subscriptionId: 'SUB123', amount: 29.99 }
});
```

---

## 🛠️ Common Operations

### Check Workflow Status

```javascript
GET /api/temporal/workflow/:workflowId/status
```

Or programmatically:

```javascript
const { getWorkflowHandle } = require('./src/utils/temporalClient');

const handle = await getWorkflowHandle('workflow-id');
const description = await handle.describe();
console.log('Status:', description.status);
```

### Cancel Workflow

```javascript
POST /api/temporal/workflow/:workflowId/cancel
```

Or programmatically:

```javascript
const { cancelWorkflow } = require('./src/utils/temporalClient');
await cancelWorkflow('workflow-id');
```

### Send Signal to Workflow

```javascript
const { signalWorkflow } = require('./src/utils/temporalClient');
await signalWorkflow('workflow-id', 'signalName', 'data');
```

---

## 🔍 Monitoring & Debugging

### Temporal Web UI
Open http://localhost:8233 to:
- View running workflows
- Check workflow history
- Debug failed workflows
- Replay workflows
- View activity details

### Logs
- **Worker logs**: Console output where worker is running
- **Activity logs**: `logs/` directory (winston logs)
- **Temporal server logs**: Temporal CLI output

---

## 📁 Project Structure

```
src/temporal/
├── config/
│   └── constants.js          # Timeouts, retry policies
├── types.js                  # Type definitions
├── worker.js                 # Worker entry point
│
├── workflows/                # Workflow definitions
│   ├── user/                 # User workflows
│   ├── payment/              # Payment workflows
│   ├── listing/              # Listing workflows
│   └── analytics/            # Analytics workflows
│
└── activities/               # Activity implementations
    ├── user/                 # User activities
    ├── payment/              # Payment activities
    ├── listing/              # Listing activities
    └── analytics/            # Analytics activities
```

---

## 🎯 Next Steps

1. **Read the Architecture**: [ARCHITECTURE.md](./ARCHITECTURE.md)
2. **Check Workflows Reference**: [WORKFLOWS_REFERENCE.md](./WORKFLOWS_REFERENCE.md)
3. **Add Your Own Workflow**: See "Adding a New Workflow" in ARCHITECTURE.md
4. **Deploy to Production**: See "Production Deployment" section in README.md

---

## ⚡ Quick Commands

```bash
# Start Temporal server
temporal server start-dev

# Start worker (development)
npm run worker:dev

# Start worker (production)
npm run worker

# Start with PM2
pm2 start src/temporal/worker.js --name temporal-worker

# View worker logs
pm2 logs temporal-worker

# Restart worker
pm2 restart temporal-worker
```

---

## 🆘 Troubleshooting

### Worker won't start
- ✅ Ensure Temporal server is running: `temporal server start-dev`
- ✅ Check `.env` configuration
- ✅ Verify network connectivity to `localhost:7233`

### Workflows not executing
- ✅ Ensure worker is running
- ✅ Check task queue name matches in config
- ✅ View logs in Temporal Web UI

### Activities failing
- ✅ Check activity logs for errors
- ✅ Review timeout settings in `config/constants.js`
- ✅ Verify external dependencies (database, APIs) are accessible

---

## 📖 More Resources

- [Temporal Documentation](https://docs.temporal.io/)
- [Node.js SDK Guide](https://docs.temporal.io/dev-guide/node)
- [Architecture Documentation](./ARCHITECTURE.md)
- [Workflows Reference](./WORKFLOWS_REFERENCE.md)
