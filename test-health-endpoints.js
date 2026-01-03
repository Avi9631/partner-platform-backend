/**
 * Test Express Actuator Health Endpoints
 * 
 * Simple script to test all health endpoints
 * Run with: node test-health-endpoints.js (after starting the server)
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

async function testEndpoint(path) {
    return new Promise((resolve) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: path,
            method: 'GET',
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    resolve({
                        success: true,
                        status: res.statusCode,
                        data: JSON.parse(data),
                    });
                } catch (error) {
                    resolve({
                        success: false,
                        status: res.statusCode,
                        error: 'Failed to parse JSON response',
                        rawData: data,
                    });
                }
            });
        });

        req.on('error', (error) => {
            resolve({
                success: false,
                error: error.message,
            });
        });

        req.setTimeout(5000, () => {
            req.destroy();
            resolve({
                success: false,
                error: 'Request timeout',
            });
        });

        req.end();
    });
}

function printResult(endpoint, result) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${endpoint}`);
    console.log('='.repeat(60));

    if (result.success) {
        console.log(`✓ Status: ${result.status}`);
        console.log(`Response:`);
        console.log(JSON.stringify(result.data, null, 2));
    } else {
        console.log(`✗ Failed`);
        console.log(`Error: ${result.error}`);
        if (result.rawData) {
            console.log(`Raw response: ${result.rawData}`);
        }
    }
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('Express Actuator Health Endpoints Test');
    console.log('='.repeat(60));
    console.log(`Server: http://${HOST}:${PORT}`);

    const endpoints = [
        '/health',
        '/health/temporal',
        '/health/info',
        '/health/metrics',
    ];

    console.log(`\nTesting ${endpoints.length} endpoints...\n`);

    let successCount = 0;
    let failureCount = 0;

    for (const endpoint of endpoints) {
        const result = await testEndpoint(endpoint);
        printResult(endpoint, result);

        if (result.success) {
            successCount++;
        } else {
            failureCount++;
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(60));
    console.log('Test Summary');
    console.log('='.repeat(60));
    console.log(`✓ Passed: ${successCount}/${endpoints.length}`);
    console.log(`✗ Failed: ${failureCount}/${endpoints.length}`);
    console.log('='.repeat(60));

    if (failureCount > 0) {
        console.log('\n⚠️  Some endpoints failed.');
        console.log('Make sure the server is running on port', PORT);
        process.exit(1);
    } else {
        console.log('\n✓ All health endpoints are working correctly!\n');
        process.exit(0);
    }
}

// Handle errors
process.on('unhandledRejection', (error) => {
    console.error('\n✗ Unhandled error:', error);
    process.exit(1);
});

// Run tests
main();
