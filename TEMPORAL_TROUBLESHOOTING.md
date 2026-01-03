# Temporal Connection Troubleshooting Guide

## Common Connection Issues to Port 7233

### Issue: "ECONNREFUSED" Error

**Symptoms:**
- Error message: "Cannot connect to Temporal server at localhost:7233"
- Connection refused errors in logs
- Worker fails to start

**Solutions:**

1. **Check if Temporal Server is Running**
   ```bash
   # Check if port 7233 is listening
   netstat -an | findstr "7233"
   
   # Or use PowerShell
   Get-NetTCPConnection -LocalPort 7233 -ErrorAction SilentlyContinue
   ```

2. **Start Temporal Server**
   ```bash
   # Start Temporal development server
   temporal server start-dev
   
   # Or with custom options
   temporal server start-dev --port 7233
   ```

3. **Verify Temporal CLI Installation**
   ```bash
   temporal --version
   
   # If not installed, install it:
   # On Windows with Scoop:
   scoop install temporal
   
   # Or download from: https://github.com/temporalio/cli/releases
   ```

### Issue: Connection Timeout

**Symptoms:**
- Connection hangs and times out after 10 seconds
- "Connection timeout" errors

**Solutions:**

1. **Increase Connection Timeout**
   Add to your `.env`:
   ```env
   TEMPORAL_CONNECTION_TIMEOUT=30000  # 30 seconds
   ```

2. **Check Network/Firewall**
   - Ensure port 7233 is not blocked by firewall
   - Check if localhost resolves correctly
   - Try using explicit IP: `127.0.0.1:7233`

3. **Verify Temporal Server Status**
   ```bash
   # Check Temporal server health
   curl http://localhost:7233/health
   
   # Or in PowerShell
   Invoke-WebRequest -Uri http://localhost:7233/health
   ```

### Issue: Connection Works Initially But Fails Later

**Symptoms:**
- Connection works on startup but fails after some time
- Intermittent connection errors
- "Connection lost" errors

**Solutions:**

1. **Connection Health Check**
   The updated code now includes automatic health checks and reconnection logic.

2. **Monitor Connection Health**
   ```bash
   # Check application health endpoint
   curl http://localhost:YOUR_PORT/health/temporal
   ```

3. **Review Temporal Server Logs**
   ```bash
   # Temporal server logs location (dev mode)
   # Usually in: ~/.temporalio/
   ```

### Issue: Multiple Services Competing for Port 7233

**Symptoms:**
- Port already in use
- Cannot bind to port 7233

**Solutions:**

1. **Find Process Using Port**
   ```bash
   # Windows
   netstat -ano | findstr :7233
   
   # PowerShell
   Get-NetTCPConnection -LocalPort 7233 | Select-Object OwningProcess
   Get-Process -Id <PID>
   ```

2. **Use Different Port**
   Add to your `.env`:
   ```env
   TEMPORAL_ADDRESS=localhost:7234
   ```
   
   Start Temporal on custom port:
   ```bash
   temporal server start-dev --port 7234
   ```

3. **Kill Conflicting Process**
   ```bash
   # Windows
   taskkill /PID <PID> /F
   
   # PowerShell
   Stop-Process -Id <PID> -Force
   ```

## Configuration

### Environment Variables

```env
# Enable/disable Temporal
TEMPORAL_ENABLED=true

# Server address
TEMPORAL_ADDRESS=localhost:7233

# Namespace (default: default)
TEMPORAL_NAMESPACE=default

# Task queue name
TEMPORAL_TASK_QUEUE=partner-platform-queue

# Connection settings
TEMPORAL_CONNECTION_TIMEOUT=10000
TEMPORAL_RETRY_MAX_ATTEMPTS=3
TEMPORAL_RETRY_INITIAL_DELAY=2000

# Worker concurrency
TEMPORAL_MAX_CONCURRENT_ACTIVITIES=100
TEMPORAL_MAX_CONCURRENT_WORKFLOWS=100

# For Temporal Cloud (optional)
TEMPORAL_TLS=false
TEMPORAL_API_KEY=your-api-key
TEMPORAL_SERVER_NAME=your-namespace.tmprl.cloud
```

### Retry Configuration

The system now includes automatic retry logic:
- **Client**: 3 retry attempts with exponential backoff (2s, 4s, 6s)
- **Worker**: 5 retry attempts with exponential backoff (3s, 6s, 9s, 12s, 15s)

### Connection Improvements

1. **Health Check**: Connections are tested before reuse
2. **Auto-Reconnect**: Stale connections are automatically refreshed
3. **Exponential Backoff**: Retry delays increase with each attempt
4. **Detailed Logging**: All connection attempts and failures are logged

## Testing Connection

### 1. Test Temporal Server

```bash
# Using Temporal CLI
temporal operator namespace list

# Check server info
temporal operator cluster system
```

### 2. Test Application Connection

```bash
# Health check endpoints (express-actuator)
curl http://localhost:YOUR_PORT/health          # Complete health with all components
curl http://localhost:YOUR_PORT/health/temporal  # Temporal-specific health
curl http://localhost:YOUR_PORT/health/info      # Application info
curl http://localhost:YOUR_PORT/health/metrics   # Application metrics
```

### 3. Manual Connection Test

Create a test script `test-temporal.js`:

```javascript
const { Connection } = require('@temporalio/client');

async function testConnection() {
  try {
    console.log('Connecting to Temporal...');
    const connection = await Connection.connect({
      address: 'localhost:7233',
      connectTimeout: 10000,
    });
    console.log('✓ Connected successfully!');
    
    // Test system info
    const info = await connection.workflowService.getSystemInfo({});
    console.log('Server version:', info.serverVersion);
    
    return true;
  } catch (error) {
    console.error('✗ Connection failed:', error.message);
    return false;
  }
}

testConnection();
```

Run it:
```bash
node test-temporal.js
```

## Best Practices

1. **Always Use Environment Variables**
   - Don't hardcode connection strings
   - Use different configs for dev/staging/prod

2. **Enable Temporal Only When Needed**
   - Set `TEMPORAL_ENABLED=false` during local development if not using workflows
   - Implement graceful fallbacks in your application

3. **Monitor Connection Health**
   - Use the `/health/temporal` endpoint
   - Set up alerts for connection failures
   - Monitor logs for retry patterns

4. **Development Workflow**
   ```bash
   # 1. Start Temporal first
   temporal server start-dev
   
   # 2. Wait for it to be ready (check port)
   netstat -an | findstr "7233"
   
   # 3. Start your worker
   npm run worker
   
   # 4. Start your application
   npm start
   ```

5. **Production Considerations**
   - Use Temporal Cloud or managed Temporal cluster
   - Enable TLS for secure connections
   - Set up proper monitoring and alerting
   - Configure appropriate retry limits
   - Implement circuit breaker patterns

## Debugging

### Enable Debug Logging

Add to your `.env`:
```env
LOG_LEVEL=debug
TEMPORAL_LOG_LEVEL=DEBUG
```

### Check Temporal Server Logs

```bash
# Development server logs
temporal server start-dev --log-level debug
```

### Application Logs

Look for these log messages:
- `Initializing Temporal Client (attempt X/Y)...`
- `✓ Temporal Client initialized successfully`
- `Failed to initialize Temporal Client (attempt X/Y):`
- `Existing Temporal connection is unhealthy, reconnecting...`

## Getting Help

1. **Check Temporal Documentation**
   - https://docs.temporal.io/
   - https://docs.temporal.io/dev-guide/node/

2. **Temporal Community**
   - https://community.temporal.io/
   - Temporal Slack: https://temporal.io/slack

3. **Application Logs**
   - Check `logs/` directory
   - Review Winston logs for detailed errors

4. **GitHub Issues**
   - Temporal Node SDK: https://github.com/temporalio/sdk-typescript/issues
