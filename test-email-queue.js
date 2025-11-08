/**
 * Email Queue Test Script
 * Run this to verify your email queue setup is working correctly
 */

require('dotenv').config();
const { getRedisConnection, closeRedisConnection } = require('./src/config/redis.config');
const { getQueueStats, addTestEmailJob } = require('./src/queues/emailQueue');
const logger = require('./src/config/winston.config');

async function testEmailQueue() {
    console.log('🚀 Starting Email Queue System Test...\n');

    try {
        // Test 1: Redis Connection
        console.log('1️⃣ Testing Redis Connection...');
        const redis = await getRedisConnection();
        const ping = await redis.ping();
        
        if (ping === 'PONG') {
            console.log('   ✅ Redis connection successful!\n');
        } else {
            console.log('   ❌ Redis connection failed!\n');
            return;
        }

        // Test 2: Queue Stats
        console.log('2️⃣ Getting Queue Statistics...');
        const stats = await getQueueStats();
        console.log('   Queue Stats:');
        console.log(`   - Waiting: ${stats.waiting}`);
        console.log(`   - Active: ${stats.active}`);
        console.log(`   - Completed: ${stats.completed}`);
        console.log(`   - Failed: ${stats.failed}`);
        console.log(`   - Delayed: ${stats.delayed}`);
        console.log(`   - Total: ${stats.total}`);
        console.log('   ✅ Queue stats retrieved!\n');

        // Test 3: SMTP Configuration
        console.log('3️⃣ Checking SMTP Configuration...');
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            console.log(`   ✅ SMTP configured for: ${process.env.SMTP_USER}\n`);
        } else {
            console.log('   ⚠️  SMTP credentials not configured!\n');
            console.log('   Set SMTP_USER and SMTP_PASS in your .env file\n');
        }

        // Test 4: Add Test Job (optional - uncomment to test)
        // console.log('4️⃣ Adding Test Email Job...');
        // const testEmail = process.env.TEST_EMAIL || 'test@example.com';
        // const job = await addTestEmailJob(testEmail, 'Queue Test Email');
        // console.log(`   ✅ Test job added with ID: ${job.id}`);
        // console.log(`   📧 Test email queued for: ${testEmail}\n`);

        console.log('✅ All tests passed! Your email queue system is ready.\n');
        console.log('📝 Next steps:');
        console.log('   1. Start your server: npm run dev');
        console.log('   2. Check health: GET /email-queue/health');
        console.log('   3. Send test email: POST /email-queue/test');
        console.log('\n📖 See EMAIL_QUEUE_SETUP.md for more details\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Check Redis credentials in .env file');
        console.error('2. Ensure Redis Cloud is accessible from your network');
        console.error('3. Verify REDIS_HOST, REDIS_PORT, and REDIS_PASSWORD');
        console.error('\nFull error:', error);
    } finally {
        // Clean up
        await closeRedisConnection();
        console.log('🔌 Redis connection closed');
        process.exit(0);
    }
}

// Run the test
testEmailQueue();
