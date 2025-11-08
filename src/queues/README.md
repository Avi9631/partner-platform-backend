# Email Queue System with BullMQ and Redis

## Overview

This email queue system uses **BullMQ** and **Redis Cloud** to handle email operations asynchronously. This provides several benefits:

- **Improved Performance**: API responses are faster as emails are queued instead of sent synchronously
- **Reliability**: Failed emails are automatically retried with exponential backoff
- **Scalability**: Multiple workers can process emails concurrently
- **Monitoring**: Track job status, failures, and queue metrics
- **Rate Limiting**: Control email sending rate to avoid spam filters

## Architecture

```
┌─────────────────┐
│   API Request   │
└────────┬────────┘
         │
         v
┌─────────────────┐      ┌──────────────┐
│ Email Service   │─────>│ Redis Queue  │
└─────────────────┘      └──────┬───────┘
                                │
                                v
                         ┌──────────────┐
                         │ Email Worker │
                         └──────┬───────┘
                                │
                                v
                         ┌──────────────┐
                         │  SMTP Server │
                         └──────────────┘
```

## Components

### 1. Redis Configuration (`src/config/redis.config.js`)
- Manages Redis Cloud connection
- Handles reconnection logic
- Provides connection pooling

### 2. Email Queue (`src/queues/emailQueue.js`)
- Defines the email queue
- Provides methods to add jobs
- Manages queue configuration and options

### 3. Email Worker (`src/workers/emailWorker.js`)
- Processes email jobs from the queue
- Handles different email types
- Implements retry logic and error handling

### 4. Email Service (`src/utils/emailService.js`)
- High-level API for sending emails
- Queues emails instead of sending directly
- Maintains backward compatibility

## Configuration

### Environment Variables

Add these to your `.env` or `prod.env` file:

```env
# Redis Configuration
REDIS_HOST=redis-10000.c212.ap-south-1-1.ec2.redns.redis-cloud.com
REDIS_PORT=10000
REDIS_PASSWORD=S98jxhf0t3j8nwwt1jfl8i24kvc9df5lzzl1iurekil5d7wojk
REDIS_TLS=false

# SMTP Configuration (existing)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password

# Worker Configuration
START_EMAIL_WORKER=true  # Set to false to disable worker on specific instances
```

## Usage

### Sending a Course Invite Email

```javascript
const emailService = require('./src/utils/emailService');

// Queue a course invitation email
const result = await emailService.sendCourseInviteEmail({
    courseName: 'Introduction to JavaScript',
    courseDescription: 'Learn JavaScript from scratch',
    inviterName: 'John Doe',
    inviterEmail: 'john@example.com',
    inviteeEmail: 'student@example.com',
    accessLevel: 'SHARED',
    acceptUrl: 'https://acad.feedaq.com/accept-invite?token=xyz',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    message: 'Looking forward to learning with you!'
});

// Result contains job information
console.log(result);
// {
//   success: true,
//   jobId: '12345',
//   message: 'Course invitation email queued for delivery',
//   recipient: 'student@example.com'
// }
```

### Sending a Generic Email

```javascript
const result = await emailService.sendEmail({
    to: 'user@example.com',
    subject: 'Welcome to FeedAQ Academy',
    html: '<h1>Welcome!</h1><p>We\'re excited to have you.</p>',
    text: 'Welcome! We\'re excited to have you.',
    replyTo: 'support@feedaq.com'
}, {
    priority: 1,  // Higher priority (1-10, lower is higher priority)
    delay: 5000   // Delay 5 seconds before processing
});
```

### Sending a Test Email

```javascript
const result = await emailService.sendTestEmail(
    'test@example.com',
    'Test Email Subject'
);
```

## Queue Management

### Get Queue Statistics

```javascript
const { getQueueStats } = require('./src/queues/emailQueue');

const stats = await getQueueStats();
console.log(stats);
// {
//   waiting: 5,
//   active: 2,
//   completed: 1234,
//   failed: 12,
//   delayed: 0,
//   total: 1253
// }
```

### Clean Old Jobs

```javascript
const { cleanQueue } = require('./src/queues/emailQueue');

// Clean completed jobs older than 24 hours
await cleanQueue(24 * 3600 * 1000);
```

## Job Types

### 1. Course Invite (`course-invite`)
- Priority: 1 (high)
- Retries: 3 times with exponential backoff
- Includes formatted HTML template
- Contains course details and accept link

### 2. Generic Email (`send-email`)
- Priority: 5 (normal)
- Retries: 3 times
- Supports all standard email features (cc, bcc, attachments)

### 3. Test Email (`test-email`)
- Priority: 10 (low)
- Simple test email for verification

## Retry Strategy

Failed emails are automatically retried with exponential backoff:

```
Attempt 1: Immediate
Attempt 2: After 2 seconds
Attempt 3: After 4 seconds
```

After 3 failed attempts, the job is marked as failed and kept for 7 days for debugging.

## Worker Configuration

### Concurrency
The worker processes up to **5 emails concurrently** to balance speed and resource usage.

### Rate Limiting
Maximum **10 emails per second** to avoid triggering spam filters.

### Job Retention
- **Completed jobs**: Kept for 24 hours
- **Failed jobs**: Kept for 7 days

## Monitoring

### Worker Events

The worker emits events that are logged:

```javascript
// Job completed successfully
emailWorker.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed`);
});

// Job failed
emailWorker.on('failed', (job, error) => {
    console.error(`Job ${job.id} failed:`, error);
});

// Job stalled (taking too long)
emailWorker.on('stalled', (jobId) => {
    console.warn(`Job ${jobId} stalled`);
});
```

### Queue Health Check

```javascript
const { getRedisConnection } = require('./src/config/redis.config');

const redis = getRedisConnection();
const ping = await redis.ping();
console.log('Redis connection:', ping === 'PONG' ? 'OK' : 'FAILED');
```

## Error Handling

### Email Service Errors
If queueing fails, the service throws an error that should be caught:

```javascript
try {
    await emailService.sendEmail({ /* ... */ });
} catch (error) {
    console.error('Failed to queue email:', error);
    // Handle error (notify user, log, etc.)
}
```

### Worker Errors
Worker errors are automatically logged and jobs are retried according to the retry strategy.

## Best Practices

1. **Always use the queue**: Never send emails synchronously in production
2. **Set appropriate priorities**: Use priority 1 for critical emails, 5 for normal, 10 for low priority
3. **Monitor failed jobs**: Regularly check failed jobs to identify issues
4. **Clean old jobs**: Schedule periodic cleanup to prevent Redis from growing too large
5. **Use delays for scheduled emails**: Set delay option to schedule emails for specific times

## Troubleshooting

### Emails Not Being Sent

1. **Check Redis connection**:
   ```javascript
   const redis = getRedisConnection();
   await redis.ping(); // Should return 'PONG'
   ```

2. **Check worker is running**:
   - Look for "Email worker started successfully" in logs
   - Check if `START_EMAIL_WORKER=true` in environment

3. **Check SMTP credentials**:
   - Verify `SMTP_USER` and `SMTP_PASS` are set
   - Test SMTP connection manually

4. **Check queue stats**:
   ```javascript
   const stats = await getQueueStats();
   console.log(stats);
   ```

### Jobs Stuck in Queue

1. **Restart the worker**:
   ```javascript
   const { stopEmailWorker, startEmailWorker } = require('./src/workers/emailWorker');
   await stopEmailWorker();
   await startEmailWorker();
   ```

2. **Check for stalled jobs** in the logs

3. **Increase worker concurrency** if needed (in `emailWorker.js`)

### Redis Connection Issues

1. **Verify credentials**: Check `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
2. **Check network connectivity**: Ensure your server can reach Redis Cloud
3. **Review connection logs**: Look for connection errors in Winston logs

## Migration from Old System

The old email system is still compatible. The service automatically uses the queue:

```javascript
// Old way (still works, now uses queue internally)
await emailService.sendEmail({
    to: 'user@example.com',
    subject: 'Test',
    html: '<p>Test</p>'
});
```

## Performance Metrics

Expected performance improvements:

- **API Response Time**: 50-100ms faster (no SMTP wait)
- **Throughput**: Up to 10 emails/second with rate limiting
- **Reliability**: 95%+ delivery rate with retries
- **Failure Recovery**: Automatic retry of failed emails

## Future Enhancements

Potential improvements:

1. **Dashboard**: Build a web UI to monitor queue status
2. **Email Templates**: Store templates in database
3. **Analytics**: Track email open rates and clicks
4. **Priority Lanes**: Separate queues for different priorities
5. **Batch Processing**: Send bulk emails efficiently
6. **Schedule Support**: Built-in email scheduling

## Support

For issues or questions:
1. Check the logs in `winston.config.js` output
2. Review failed jobs in Redis
3. Verify environment configuration
4. Check SMTP server status
