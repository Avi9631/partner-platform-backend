# OpenTelemetry Distributed Tracing

This application includes OpenTelemetry-based distributed tracing with automatic Winston log enrichment. Every HTTP request generates a unique trace, and all logs automatically include `traceId` and `spanId`.

## Features

- Automatic HTTP/Express tracing (no code changes needed)
- All Winston logs include traceId/spanId automatically
- Context propagation across async/await boundaries
- Custom spans for business operations
- Production ready with minimal overhead

## Quick Setup

**1. Install dependencies:**
```bash
npm install
```

**2. Start Jaeger (local development):**
```bash
docker run -d --name jaeger -e COLLECTOR_OTLP_ENABLED=true -p 16686:16686 -p 4318:4318 jaegertracing/all-in-one:latest
```

**3. Configure `.env` file:**
```env
OTEL_SERVICE_NAME=partner-platform-backend
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
LOG_LEVEL=info
```

**4. Start application:**
```bash
npm run dev
```

**5. View traces:** Open http://localhost:16686

## Log Output Examples

**Console:**
```
2026-01-04 10:31:00 [INFO] [trace:a1b2c3d4 span:e5f6g7h8]: Deducted 100 funds from user 42
```

**File (app.log):**
```json
{"timestamp":"2026-01-04 10:31:00","level":"INFO","message":"Deducted 100 funds","traceId":"a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6","spanId":"e5f6g7h8i9j0k1l2"}
```

**Correlating logs to traces:**
1. Copy `traceId` from logs
2. Search in Jaeger (http://localhost:16686)
3. View the exact request trace

## What's Automatic (No Code Changes Needed)

- HTTP request/response tracing
- Database query tracing (Sequelize)
- TraceId + SpanId in all logs
- Context propagation across async/await

## Custom Spans (Optional)

For critical operations, add custom spans:

```javascript
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('my-service', '1.0.0');

async function criticalOp(userId) {
  return tracer.startActiveSpan('operation.name', async (span) => {
    try {
      span.setAttribute('user.id', userId);
      const result = await doWork();
      span.setStatus({ code: 0 });
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: 1, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

**See example:** [src/service/WalletService.service.js](src/service/WalletService.service.js) - `deductFunds()`

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OTEL_SERVICE_NAME` | `partner-platform-backend` | Service name |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318/v1/traces` | Collector endpoint |
| `LOG_LEVEL` | `info` | Log level |

### Production (Grafana Cloud)

```env
OTEL_SERVICE_NAME=partner-platform-backend-prod
OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod.grafana.net/otlp/v1/traces
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic YOUR_CREDENTIALS
```

### Enable Sampling (High Traffic)

Edit [src/config/tracing.js](src/config/tracing.js):
```javascript
const { TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-trace-base');
const sdk = new NodeSDK({
  sampler: new TraceIdRatioBasedSampler(0.1), // 10% sampling
  // ... rest of config
});
```

## Troubleshooting

**Traces not in Jaeger?**
- Check Jaeger: `docker ps | grep jaeger`
- Test endpoint: `curl http://localhost:4318/v1/traces -v`
- Verify logs show "OpenTelemetry tracing initialized"

**Logs missing traceId?**
- Normal for startup logs (outside HTTP requests)
- Only logs within request handlers include traceId

---

## Files Modified

- `server.js` - Added tracing import as first line
- `src/config/winston.config.js` - Auto-inject trace context
- `src/service/WalletService.service.js` - Custom span example

## Files Created

- `src/config/tracing.js` - OpenTelemetry configuration
- `.env.tracing.example` - Environment template
