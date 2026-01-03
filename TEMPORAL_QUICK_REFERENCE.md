# Temporal Connection - Quick Reference

## ✅ What Was Fixed

Temporal connections to port 7233 are now more reliable with:
- Automatic retry logic (3 attempts for client, 5 for worker)
- Connection health checks
- Auto-reconnection for stale connections
- Better error messages

## 🚀 Quick Start

### 1. Test Your Connection
```bash
node test-temporal-connection.js
```

### 2. Check Health
```bash
# After starting your server
curl http://localhost:3000/health/temporal
```

### 3. Start Temporal Server
```bash
temporal server start-dev
```

## 🔧 Configuration (.env)

**Required:**
```env
TEMPORAL_ENABLED=true
TEMPORAL_ADDRESS=localhost:7233
```

**Optional (with defaults):**
```env
TEMPORAL_CONNECTION_TIMEOUT=10000
TEMPORAL_RETRY_MAX_ATTEMPTS=3
TEMPORAL_NAMESPACE=default
```

## 📊 Health Endpoints (express-actuator)

| Endpoint | Purpose |
|----------|---------|
| `/health` | Complete health check with all components |
| `/health/temporal` | Temporal connection status |
| `/health/info` | Application build & version info |
| `/health/metrics` | Application metrics |

## 🐛 Common Issues

### "ECONNREFUSED"
**Fix:** Start Temporal server
```bash
temporal server start-dev
```

### "Connection timeout"
**Fix:** Increase timeout in `.env`
```env
TEMPORAL_CONNECTION_TIMEOUT=30000
```

### "Port already in use"
**Find process:**
```bash
# Windows
netstat -ano | findstr :7233

# PowerShell
Get-NetTCPConnection -LocalPort 7233
```

## 📚 Documentation

- **Troubleshooting:** See `TEMPORAL_TROUBLESHOOTING.md`
- **All Changes:** See `TEMPORAL_CONNECTION_FIXES.md`

## 🔍 Monitoring

Watch logs for these messages:
- ✅ `✓ Temporal Client initialized successfully`
- ⚠️ `Retrying in Xms...` (automatic retry in progress)
- ❌ `Failed to initialize Temporal Client` (needs attention)

## 💡 Tips

1. **Start Temporal first** before starting your app
2. **Use health endpoints** to monitor in production
3. **Enable debug logging** if issues persist:
   ```env
   LOG_LEVEL=debug
   ```
4. **Set `TEMPORAL_ENABLED=false`** if not using workflows

## 📞 Need Help?

1. Run: `node test-temporal-connection.js`
2. Check: `TEMPORAL_TROUBLESHOOTING.md`
3. Review server logs for detailed error messages
