# Temporal Production Setup Guide

## 🔒 Why Workflows Are Already Persistent

**Temporal workflows are inherently persistent!** This is Temporal's core value proposition:

1. ✅ **Workflows stored in Temporal's database** - NOT in your application memory
2. ✅ **Survives application crashes** - When your app restarts, workflows continue
3. ✅ **Durable execution** - Workflow state is persisted after every step
4. ✅ **No data loss** - Even if your server crashes mid-workflow, it resumes exactly where it left off

### How It Works

```
User Request → Your API → Temporal Server (Persists in DB)
                              ↓
                         Task Queue (Durable)
                              ↓
                         Your Worker (Can crash and restart)
```

**Key Point:** The workflow lives in Temporal's storage, not your app!

---

## 🚀 Production Setup Requirements

### 1. **Production Temporal Server** (Critical!)

Your current setup uses `localhost:7233` which is fine for development, but for production you need:

#### Option A: Temporal Cloud (Recommended)
**Fully managed, no infrastructure to maintain**

```env
# Production .env
TEMPORAL_ENABLED=true
TEMPORAL_ADDRESS=your-namespace.tmprl.cloud:7233
TEMPORAL_NAMESPACE=your-namespace
TEMPORAL_API_KEY=your-cloud-api-key
TEMPORAL_TLS=true
TEMPORAL_TASK_QUEUE=partner-platform-queue
```

**Setup Steps:**
1. Sign up at [cloud.temporal.io](https://cloud.temporal.io)
2. Create a namespace
3. Get connection credentials
4. Update your `.env` with the values above

**Pros:**
- ✅ Zero maintenance
- ✅ Built-in monitoring and observability
- ✅ Automatic backups
- ✅ High availability
- ✅ Global deployment

**Cost:** Pay-as-you-go based on workflow executions

#### Option B: Self-Hosted Temporal (For full control)
**Deploy your own Temporal cluster**

```yaml
# docker-compose.yml for production Temporal
version: '3.8'
services:
  postgresql:
    image: postgres:13
    environment:
      POSTGRES_PASSWORD: your-secure-password
      POSTGRES_USER: temporal
      POSTGRES_DB: temporal
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: always

  temporal:
    image: temporalio/auto-setup:latest
    depends_on:
      - postgresql
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=your-secure-password
      - POSTGRES_SEEDS=postgresql
    ports:
      - 7233:7233
    volumes:
      - temporal-data:/etc/temporal
    restart: always

  temporal-admin-tools:
    image: temporalio/admin-tools:latest
    depends_on:
      - temporal
    environment:
      - TEMPORAL_CLI_ADDRESS=temporal:7233
    stdin_open: true
    tty: true

  temporal-ui:
    image: temporalio/ui:latest
    depends_on:
      - temporal
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
      - TEMPORAL_CORS_ORIGINS=http://localhost:3000
    ports:
      - 8080:8080
    restart: always

volumes:
  postgres-data:
  temporal-data:
```

```env
# Production .env
TEMPORAL_ENABLED=true
TEMPORAL_ADDRESS=your-production-server:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=partner-platform-queue
```

**Pros:**
- ✅ Full control
- ✅ Data stays on your infrastructure
- ✅ No per-execution costs

**Cons:**
- ❌ You manage infrastructure
- ❌ Need to handle backups
- ❌ Need to monitor and scale

---

### 2. **Run Worker as a Separate Process** (Critical!)

Your worker must run **continuously** and **independently** from your API server.

#### Development (Current Setup)
```bash
# Terminal 1: API Server
npm run dev

# Terminal 2: Worker
npm run worker:dev
```

#### Production Deployment Options

**Option A: PM2 (Simple, Single Server)**

```bash
# Install PM2 globally
npm install -g pm2

# Start API server
pm2 start server.js --name partner-api

# Start Temporal worker
pm2 start src/temporal/worker.js --name partner-worker

# Save PM2 configuration
pm2 save

# Set PM2 to start on system boot
pm2 startup
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'partner-api',
      script: './server.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'partner-worker',
      script: './src/temporal/worker.js',
      instances: 1, // Start with 1, scale as needed
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

Then deploy:
```bash
pm2 start ecosystem.config.js --env production
```

**Option B: Docker Compose**

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - TEMPORAL_ENABLED=true
      - TEMPORAL_ADDRESS=temporal:7233
    env_file:
      - .env.production
    restart: always
    depends_on:
      - temporal

  worker:
    build: .
    command: node src/temporal/worker.js
    environment:
      - NODE_ENV=production
      - TEMPORAL_ENABLED=true
      - TEMPORAL_ADDRESS=temporal:7233
    env_file:
      - .env.production
    restart: always
    deploy:
      replicas: 2  # Scale workers based on load
    depends_on:
      - temporal
```

**Option C: Kubernetes (Enterprise)**

```yaml
# worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: partner-worker
spec:
  replicas: 3  # Scale based on workflow volume
  selector:
    matchLabels:
      app: partner-worker
  template:
    metadata:
      labels:
        app: partner-worker
    spec:
      containers:
      - name: worker
        image: your-registry/partner-platform-backend:latest
        command: ["node", "src/temporal/worker.js"]
        env:
        - name: NODE_ENV
          value: "production"
        - name: TEMPORAL_ENABLED
          value: "true"
        - name: TEMPORAL_ADDRESS
          valueFrom:
            configMapKeyRef:
              name: temporal-config
              key: address
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

### 3. **Worker Scaling**

Workers can be scaled horizontally based on load:

```bash
# PM2: Scale workers
pm2 scale partner-worker 3

# Docker Compose: Scale workers
docker-compose up --scale worker=3

# Kubernetes: Scale workers
kubectl scale deployment partner-worker --replicas=5
```

**Scaling Guidelines:**
- Start with 1-2 workers
- Monitor workflow queue depth
- Scale up if tasks are waiting too long
- Each worker can handle 100 concurrent activities/workflows (configurable)

---

### 4. **Monitoring & Observability**

#### Temporal UI
Access Temporal's built-in web UI:

**Temporal Cloud:** Available at your cloud dashboard

**Self-Hosted:**
```bash
# Already included in docker-compose
# Access at http://localhost:8080
```

Features:
- View all workflows
- See workflow history
- Retry failed workflows
- Query workflow state

#### Custom Health Checks
Your existing health check is good! Access:
```bash
# Check Temporal health
curl http://localhost:3000/health/temporal

# Overall health
curl http://localhost:3000/health
```

#### Application Logs
```bash
# PM2 logs
pm2 logs partner-worker

# Docker logs
docker-compose logs -f worker
```

---

### 5. **Production Checklist**

- [ ] **Temporal Server Setup**
  - [ ] Choose Temporal Cloud or self-hosted
  - [ ] Configure production connection
  - [ ] Test connectivity from your app server
  - [ ] Set up TLS/SSL if required

- [ ] **Worker Deployment**
  - [ ] Deploy worker as separate process
  - [ ] Configure auto-restart (PM2/Docker/K8s)
  - [ ] Set up log aggregation
  - [ ] Configure worker scaling

- [ ] **Environment Variables**
  - [ ] `TEMPORAL_ENABLED=true`
  - [ ] `TEMPORAL_ADDRESS` set to production server
  - [ ] `TEMPORAL_NAMESPACE` configured
  - [ ] `TEMPORAL_API_KEY` for Temporal Cloud
  - [ ] `TEMPORAL_TLS=true` for secure connections

- [ ] **Monitoring**
  - [ ] Set up Temporal UI access
  - [ ] Configure health check alerts
  - [ ] Set up log monitoring (CloudWatch, DataDog, etc.)
  - [ ] Monitor workflow queue depth

- [ ] **Testing**
  - [ ] Test workflow submission in production
  - [ ] Test application crash recovery
  - [ ] Test worker crash recovery
  - [ ] Load test with expected workflow volume

---

## 🔄 How Persistence Actually Works

### Example: Property Listing Workflow

```javascript
// Your API submits a workflow
const { workflowId } = await startWorkflow('processPropertyListing', {
  propertyId: 123,
  userId: 456
});
// ✅ Workflow is now in Temporal's database
// ✅ Returns immediately to user
```

**What happens if your app crashes now?**

1. ✅ **Workflow continues to exist** in Temporal's database
2. ✅ **When worker restarts**, it picks up from last completed step
3. ✅ **No data loss** - all workflow state is preserved
4. ✅ **Activities resume** exactly where they left off

```
Timeline:
─────────────────────────────────────────────────────────
User submits → Workflow saved to Temporal DB
                     ↓
                Worker picks up task
                     ↓
                Activity 1 completes ✅ (saved)
                     ↓
                Activity 2 starts
                     ↓
             🔥 YOUR APP CRASHES 🔥
                     ↓
             Worker disconnects
                     ↓
         ⏰ Temporal waits (workflow still exists)
                     ↓
             🔄 YOUR APP RESTARTS 🔄
                     ↓
                Worker reconnects
                     ↓
                Activity 2 retries (from saved state)
                     ↓
                Activity 2 completes ✅
                     ↓
                Workflow completes ✅
```

### Retention
By default, Temporal retains completed workflow history for **30 days**. Configure as needed:

```javascript
// In workflow options
const handle = await client.workflow.start(workflowName, {
  // ... other options
  workflowExecutionTimeout: '24h',    // Max workflow duration
  workflowRunTimeout: '1h',            // Max single run duration
  workflowTaskTimeout: '10s',          // Max decision task timeout
});
```

---

## 📊 Production Recommendations

### For Small-Medium Traffic (< 1000 workflows/day)
- **Temporal:** Temporal Cloud (Basic tier)
- **Workers:** 1-2 workers via PM2
- **Infrastructure:** Single server with PM2

### For High Traffic (1000-10000 workflows/day)
- **Temporal:** Temporal Cloud (Standard tier)
- **Workers:** 3-5 workers in Docker/K8s
- **Infrastructure:** Container orchestration

### For Enterprise (> 10000 workflows/day)
- **Temporal:** Temporal Cloud (Enterprise) or self-hosted cluster
- **Workers:** 10+ workers in Kubernetes
- **Infrastructure:** Full K8s deployment with auto-scaling

---

## 🆘 Troubleshooting

### Worker won't connect
```bash
# Check if Temporal server is reachable
curl http://your-temporal-server:7233

# Test with temporal CLI
npm install -g @temporalio/cli
temporal server start-dev  # Test locally
```

### Workflows not being processed
1. Check worker is running: `pm2 status`
2. Check worker logs: `pm2 logs partner-worker`
3. Verify task queue matches: Check `TEMPORAL_TASK_QUEUE` in both API and worker
4. Check Temporal UI for queued tasks

### Connection timeouts
- Increase `connectionTimeout` in temporal.config.js
- Check network connectivity
- Verify firewall rules allow port 7233

---

## 📚 Additional Resources

- [Temporal Cloud Documentation](https://docs.temporal.io/cloud)
- [Self-Hosting Temporal](https://docs.temporal.io/self-hosted)
- [Worker Performance Tuning](https://docs.temporal.io/dev-guide/worker-performance)
- [Production Best Practices](https://docs.temporal.io/production-readiness)

---

## Summary

✅ **Your workflows are ALREADY persistent** - they survive crashes  
✅ **For production:** Use Temporal Cloud or self-hosted cluster  
✅ **Deploy worker separately** from your API server  
✅ **Scale workers** based on workflow volume  
✅ **Monitor** via Temporal UI and health endpoints  

Your current setup is production-ready for the worker code - you just need to:
1. Set up production Temporal server
2. Deploy worker as a separate service
3. Update connection strings in `.env`
