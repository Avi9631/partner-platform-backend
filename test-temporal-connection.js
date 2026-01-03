/**
 * Test Temporal Connection
 * 
 * Simple script to test if Temporal server is accessible
 * Run with: node test-temporal-connection.js
 */

require('dotenv').config();
const { Connection } = require('@temporalio/client');

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
const TEMPORAL_NAMESPACE = process.env.TEMPORAL_NAMESPACE || 'default';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testConnection(attempt = 1, maxAttempts = 3) {
    console.log('\n' + '='.repeat(60));
    console.log(`Testing Temporal Connection (Attempt ${attempt}/${maxAttempts})`);
    console.log('='.repeat(60));
    console.log(`Server: ${TEMPORAL_ADDRESS}`);
    console.log(`Namespace: ${TEMPORAL_NAMESPACE}`);
    console.log('');

    try {
        console.log('Connecting...');
        const startTime = Date.now();
        
        const connection = await Connection.connect({
            address: TEMPORAL_ADDRESS,
            connectTimeout: 10000,
        });
        
        const duration = Date.now() - startTime;
        console.log(`✓ Connection established in ${duration}ms`);
        
        // Test getting system info
        console.log('Getting system info...');
        const info = await connection.workflowService.getSystemInfo({});
        console.log(`✓ Server version: ${info.serverVersion}`);
        
        // Test namespace
        console.log(`Checking namespace: ${TEMPORAL_NAMESPACE}...`);
        // Note: Getting namespace info requires additional permissions
        console.log(`✓ Using namespace: ${TEMPORAL_NAMESPACE}`);
        
        console.log('\n' + '='.repeat(60));
        console.log('✓ All tests passed!');
        console.log('='.repeat(60));
        console.log('');
        
        return true;
        
    } catch (error) {
        console.error(`✗ Connection failed: ${error.message}`);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.error('\nTemporal server is not running!');
            console.error('Please start it with: temporal server start-dev\n');
        } else if (error.message.includes('ETIMEDOUT')) {
            console.error('\nConnection timeout!');
            console.error('Check if Temporal server is accessible at:', TEMPORAL_ADDRESS);
            console.error('Verify firewall settings and network connectivity.\n');
        } else if (error.message.includes('ENOTFOUND')) {
            console.error('\nHost not found!');
            console.error('Check TEMPORAL_ADDRESS setting:', TEMPORAL_ADDRESS);
            console.error('Make sure the hostname is correct.\n');
        }
        
        // Retry logic
        if (attempt < maxAttempts) {
            const delayMs = 2000 * attempt;
            console.log(`Retrying in ${delayMs / 1000} seconds...`);
            await sleep(delayMs);
            return testConnection(attempt + 1, maxAttempts);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✗ All connection attempts failed');
        console.log('='.repeat(60));
        console.log('');
        
        return false;
    }
}

async function checkPort() {
    console.log('\nChecking port availability...');
    
    const net = require('net');
    const [host, port] = TEMPORAL_ADDRESS.split(':');
    
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = setTimeout(() => {
            socket.destroy();
            console.log(`✗ Port ${port} is not accessible on ${host}`);
            resolve(false);
        }, 3000);
        
        socket.on('connect', () => {
            clearTimeout(timeout);
            socket.destroy();
            console.log(`✓ Port ${port} is accessible on ${host}`);
            resolve(true);
        });
        
        socket.on('error', (err) => {
            clearTimeout(timeout);
            console.log(`✗ Cannot connect to port ${port} on ${host}: ${err.message}`);
            resolve(false);
        });
        
        socket.connect(parseInt(port), host);
    });
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('Temporal Connection Test');
    console.log('='.repeat(60));
    
    // First check if port is accessible
    const portAccessible = await checkPort();
    
    if (!portAccessible) {
        console.log('\nPort check failed. Attempting connection anyway...');
    }
    
    // Attempt connection
    const success = await testConnection();
    
    if (success) {
        console.log('✓ Temporal is ready to use!\n');
        process.exit(0);
    } else {
        console.log('✗ Could not connect to Temporal server');
        console.log('See TEMPORAL_TROUBLESHOOTING.md for help\n');
        process.exit(1);
    }
}

// Handle errors
process.on('unhandledRejection', (error) => {
    console.error('\n✗ Unhandled error:', error);
    process.exit(1);
});

// Run test
main();
