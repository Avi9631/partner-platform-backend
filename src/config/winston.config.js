const winston = require('winston');
const { trace, context } = require('@opentelemetry/api');

/**
 * Custom Winston format that automatically injects OpenTelemetry trace context
 * This extracts traceId and spanId from the active span without manual passing
 */
const traceFormat = winston.format((info) => {
  // Get the active span from OpenTelemetry context
  const span = trace.getActiveSpan();
  
  if (span) {
    const spanContext = span.spanContext();
    if (spanContext) {
      info.traceId = spanContext.traceId;
      info.spanId = spanContext.spanId;
      info.traceFlags = spanContext.traceFlags;
    }
  }
  
  return info;
});

/**
 * JSON log format with trace context
 * Includes: timestamp, level, message, traceId, spanId
 */
const jsonLogFormat = winston.format.printf((info) => {
  const { timestamp, level, message, traceId, spanId, ...meta } = info;
  
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...(traceId && { traceId }),
    ...(spanId && { spanId }),
    ...(Object.keys(meta).length > 0 && { meta }),
  };
  
  return JSON.stringify(logEntry);
});

/**
 * Human-readable log format with trace context (for console)
 */
const consoleLogFormat = winston.format.printf((info) => {
  const { timestamp, level, message, traceId, spanId } = info;
  const traceInfo = traceId ? ` [trace:${traceId.slice(-8)} span:${spanId?.slice(-8)}]` : '';
  return `${timestamp} [${level}] ${traceInfo}: ${message}`;
});

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    traceFormat(), // Inject trace context
    winston.format.errors({ stack: true })
  ),
  transports: [
    // Console transport with human-readable format
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        traceFormat(),
        consoleLogFormat
      ),
    }),
    // File transport with JSON format
    new winston.transports.File({
      filename: 'app.log',
      format: jsonLogFormat,
    }),
    // Error log file
    new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      format: jsonLogFormat,
    }),
  ],
});

module.exports = logger;