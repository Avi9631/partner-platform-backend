/**
 * OpenTelemetry Tracing Configuration
 * 
 * This module initializes distributed tracing using OpenTelemetry.
 * It must be imported FIRST in the application entry point (before any other modules).
 * 
 * Features:
 * - Automatic instrumentation of Express, HTTP, and other Node.js libraries
 * - Context propagation across async boundaries
 * - OTLP HTTP export to configurable collector
 * - Graceful shutdown handling
 */

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

// Service name from environment or default
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'partner-platform-backend';

// OTLP collector endpoint (defaults to standard local Jaeger/Tempo endpoint)
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

// Create OTLP trace exporter
const traceExporter = new OTLPTraceExporter({
  url: OTLP_ENDPOINT,
  // Optional: Add headers for authentication if needed
  headers: {
    // 'Authorization': 'Bearer your-token'
  },
});

// Initialize OpenTelemetry SDK
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
  }),
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Automatically instrument Express, HTTP, DNS, Net, etc.
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        // Include request headers in spans (optional)
        requestHook: (span, request) => {
          // You can enrich spans with custom attributes here
          if (request.headers['x-user-id']) {
            span.setAttribute('user.id', request.headers['x-user-id']);
          }
        },
      },
      '@opentelemetry/instrumentation-winston': {
        enabled: true,
      },
    }),
  ],
});

// Start the SDK
try {
  sdk.start();
  console.log(`OpenTelemetry tracing initialized for service: ${SERVICE_NAME}`);
  console.log(`Exporting traces to: ${OTLP_ENDPOINT}`);
} catch (error) {
  console.error('Error initializing OpenTelemetry SDK:', error);
}

// Graceful shutdown
const shutdown = async () => {
  try {
    console.log('Shutting down OpenTelemetry SDK...');
    await sdk.shutdown();
    console.log('OpenTelemetry SDK shut down successfully');
  } catch (error) {
    console.error('Error shutting down OpenTelemetry SDK:', error);
  }
};

// Register shutdown handlers
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = { sdk, shutdown };
