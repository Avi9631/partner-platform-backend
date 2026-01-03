# Express Actuator - Health Monitoring Guide

## Overview

The application now uses **express-actuator** for health checks and monitoring, providing Spring Boot Actuator-like endpoints with enhanced features.

## Available Endpoints

### Core Endpoints

| Endpoint | Description | Response |
|----------|-------------|----------|
| `GET /health` | Overall application health with all components | Health status + components |
| `GET /health/info` | Application information (name, version, etc.) | Build metadata |
| `GET /health/metrics` | Application metrics | Memory, requests, uptime |

### Custom Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health/temporal` | Temporal-specific health check with detailed status |

## Health Response Format

### Main Health Endpoint (`/health`)

```json
{
  "status": "UP",
  "timestamp": "2026-01-03T10:30:00.000Z",
  "components": {
    "temporal": {
      "status": "UP",
      "details": {
        "enabled": true,
        "address": "localhost:7233",
        "namespace": "default",
        "message": "Temporal server is reachable"
      }
    }
  }
}
```

**Status Values:**
- `UP` - All components healthy
- `DOWN` - One or more components unhealthy

### Temporal Health Endpoint (`/health/temporal`)

```json
{
  "status": "UP",
  "service": "temporal",
  "timestamp": "2026-01-03T10:30:00.000Z",
  "enabled": true,
  "address": "localhost:7233",
  "namespace": "default",
  "message": "Temporal server is reachable"
}
```

### Info Endpoint (`/health/info`)

```json
{
  "build": {
    "name": "partner-platform-backend",
    "version": "1.0.0",
    "description": "Partner Platform Backend API"
  },
  "node": {
    "version": "v20.x.x"
  }
}
```

### Metrics Endpoint (`/health/metrics`)

```json
{
  "mem": {
    "rss": 123456789,
    "heapTotal": 98765432,
    "heapUsed": 87654321,
    "external": 1234567
  },
  "uptime": 3600.123,
  "requests": {
    "total": 12345,
    "active": 5
  }
}
```

## Benefits Over Custom Implementation

### ✅ Standardization
- Industry-standard endpoint structure (Spring Boot Actuator format)
- Familiar to teams coming from Java/Spring background
- Consistent API across different services

### ✅ Built-in Features
- **Metrics**: Memory usage, uptime, request counters
- **Info**: Build information, git details
- **Extensible**: Easy to add custom health indicators

### ✅ Production Ready
- Well-tested library with active maintenance
- Handles edge cases and error scenarios
- Proper HTTP status codes (200 for UP, 503 for DOWN)

### ✅ Easy Integration
- Single middleware instead of multiple route handlers
- Less boilerplate code
- Automatic endpoint discovery

## Custom Health Indicators

The Temporal health indicator is implemented as a custom health check:

```javascript
const temporalHealthIndicator = async () => {
    const enabled = isTemporalEnabled();
    
    if (!enabled) {
        return {
            status: 'UP',
            details: {
                enabled: false,
                message: 'Temporal is disabled'
            }
        };
    }
    
    const isHealthy = await checkTemporalHealth();
    
    return {
        status: isHealthy ? 'UP' : 'DOWN',
        details: {
            enabled: true,
            address: process.env.TEMPORAL_ADDRESS,
            namespace: process.env.TEMPORAL_NAMESPACE,
            message: isHealthy ? 'Connected' : 'Connection failed'
        }
    };
};
```

## Adding More Health Indicators

To add additional health checks (e.g., database, Redis):

```javascript
const actuatorOptions = {
    customHealthChecks: async () => {
        const health = {
            status: 'UP',
            components: {}
        };
        
        // Temporal health
        health.components.temporal = await temporalHealthIndicator();
        
        // Add database health
        health.components.database = await databaseHealthIndicator();
        
        // Add Redis health
        health.components.redis = await redisHealthIndicator();
        
        // Overall status is DOWN if any component is DOWN
        const hasFailures = Object.values(health.components)
            .some(c => c.status === 'DOWN');
        health.status = hasFailures ? 'DOWN' : 'UP';
        
        return health;
    }
};
```

## Monitoring in Production

### 1. Kubernetes Liveness & Readiness Probes

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/temporal
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
```

### 2. Prometheus Metrics

The `/health/metrics` endpoint can be scraped by Prometheus:

```yaml
scrape_configs:
  - job_name: 'partner-platform'
    metrics_path: '/health/metrics'
    static_configs:
      - targets: ['localhost:3000']
```

### 3. Alerting

Set up alerts based on health status:

```bash
# Example: Alert if Temporal is down
curl http://localhost:3000/health/temporal | jq -e '.status == "UP"' || send_alert
```

### 4. Uptime Monitoring

Services like Uptime Robot, Pingdom, or Datadog can monitor:
- `/health` - Overall application health
- `/health/temporal` - Specific service health

## Testing

### Manual Testing

```bash
# Check overall health
curl http://localhost:3000/health

# Check Temporal specifically
curl http://localhost:3000/health/temporal

# Get application info
curl http://localhost:3000/health/info

# Get metrics
curl http://localhost:3000/health/metrics
```

### Automated Testing

```javascript
const request = require('supertest');
const app = require('./server');

describe('Health Endpoints', () => {
    it('should return UP status', async () => {
        const response = await request(app)
            .get('/health')
            .expect(200);
        
        expect(response.body.status).toBe('UP');
    });
    
    it('should check Temporal health', async () => {
        const response = await request(app)
            .get('/health/temporal')
            .expect(200);
        
        expect(response.body.service).toBe('temporal');
    });
});
```

## Configuration Options

Available options for express-actuator:

```javascript
const actuatorOptions = {
    basePath: '/health',              // Base path for all endpoints
    infoGitMode: 'simple',            // Git info detail level
    infoBuildOptions: { /* ... */ },  // Build information
    customEndpoints: [ /* ... */ ],   // Custom endpoints
    customHealthChecks: async () => {}, // Custom health logic
};
```

## Troubleshooting

### Health Endpoint Returns 503

**Cause:** One or more components are DOWN

**Check:**
```bash
# See which component is failing
curl http://localhost:3000/health | jq '.components'
```

### Temporal Shows DOWN

**Solution:** See [TEMPORAL_TROUBLESHOOTING.md](TEMPORAL_TROUBLESHOOTING.md)

### Metrics Not Showing

**Cause:** express-actuator not initialized properly

**Check:**
```bash
# Verify actuator is loaded
curl http://localhost:3000/health/info
```

## Best Practices

1. **Monitor Regularly**: Set up automated monitoring for `/health`
2. **Separate Concerns**: Use `/health/temporal` for Temporal-specific checks
3. **Alert on Status Changes**: Alert when status changes from UP to DOWN
4. **Log Health Checks**: Health check failures are logged for debugging
5. **Graceful Degradation**: Disabled services show UP with details

## References

- [express-actuator GitHub](https://github.com/rcruzper/express-actuator)
- [Spring Boot Actuator](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [Health Check Response Format](https://tools.ietf.org/id/draft-inadarei-api-health-check-01.html)
