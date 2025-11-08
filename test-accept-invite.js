/**
 * Test script for Accept Invite API
 * 
 * This script demonstrates how to test the acceptInvite endpoint
 * You can run this with Node.js after setting up your environment
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'your_test_token_here';

// Test Cases
async function testAcceptInvite() {
    console.log('🧪 Testing Accept Invite API\n');

    // Test 1: Valid invite token
    await testCase1();
    
    // Test 2: Invalid token
    await testCase2();
    
    // Test 3: Missing token
    await testCase3();
    
    // Test 4: Expired token (if you have one)
    // await testCase4();
}

async function testCase1() {
    console.log('Test 1: Accept valid invitation');
    console.log('─'.repeat(50));
    
    try {
        const response = await axios.post(
            `${API_BASE_URL}/api/courseAccess/acceptInvite`,
            {
                inviteToken: 'your_valid_token_here'  // Replace with actual token
            },
            {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Status:', response.data.status);
        console.log('✅ Message:', response.data.message);
        console.log('✅ Course ID:', response.data.data.access.courseId);
        console.log('✅ Access Level:', response.data.data.access.accessLevel);
        console.log('✅ Course Title:', response.data.data.course.courseTitle);
        
    } catch (error) {
        if (error.response) {
            console.log('❌ Status:', error.response.data.status);
            console.log('❌ Message:', error.response.data.message);
        } else {
            console.log('❌ Error:', error.message);
        }
    }
    console.log('\n');
}

async function testCase2() {
    console.log('Test 2: Invalid or used token');
    console.log('─'.repeat(50));
    
    try {
        const response = await axios.post(
            `${API_BASE_URL}/api/courseAccess/acceptInvite`,
            {
                inviteToken: 'invalid_token_123'
            },
            {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('❌ Should have failed but got:', response.data);
        
    } catch (error) {
        if (error.response) {
            console.log('✅ Expected Error - Status:', error.response.data.status);
            console.log('✅ Expected Error - Message:', error.response.data.message);
            if (error.response.data.status === 404) {
                console.log('✅ Correct status code for invalid token');
            }
        } else {
            console.log('❌ Unexpected error:', error.message);
        }
    }
    console.log('\n');
}

async function testCase3() {
    console.log('Test 3: Missing token in request');
    console.log('─'.repeat(50));
    
    try {
        const response = await axios.post(
            `${API_BASE_URL}/api/courseAccess/acceptInvite`,
            {},  // Empty body
            {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('❌ Should have failed but got:', response.data);
        
    } catch (error) {
        if (error.response) {
            console.log('✅ Expected Error - Status:', error.response.data.status);
            console.log('✅ Expected Error - Message:', error.response.data.message);
            if (error.response.data.status === 400) {
                console.log('✅ Correct status code for missing token');
            }
        } else {
            console.log('❌ Unexpected error:', error.message);
        }
    }
    console.log('\n');
}

// Helper function to create a test invitation (optional)
async function createTestInvitation(courseId, email) {
    console.log('📧 Creating test invitation...\n');
    
    try {
        const response = await axios.post(
            `${API_BASE_URL}/api/courseAccess/inviteUser`,
            {
                courseId: courseId,
                invites: [
                    {
                        email: email,
                        accessLevel: 'SHARED',
                        message: 'Test invitation'
                    }
                ]
            },
            {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.data.data.successful.length > 0) {
            const token = response.data.data.successful[0].token;
            console.log('✅ Test invitation created');
            console.log('✅ Token:', token);
            console.log('✅ Copy this token to test acceptInvite\n');
            return token;
        } else {
            console.log('❌ Failed to create invitation:', response.data.data.failed);
        }
        
    } catch (error) {
        if (error.response) {
            console.log('❌ Error:', error.response.data.message);
        } else {
            console.log('❌ Error:', error.message);
        }
    }
}

// Manual test with cURL command examples
function printCurlExamples() {
    console.log('\n📝 cURL Test Examples');
    console.log('='.repeat(70));
    console.log('\n1. Accept valid invitation:');
    console.log(`
curl -X POST ${API_BASE_URL}/api/courseAccess/acceptInvite \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{"inviteToken": "your_invite_token_here"}'
    `.trim());
    
    console.log('\n\n2. Test with invalid token:');
    console.log(`
curl -X POST ${API_BASE_URL}/api/courseAccess/acceptInvite \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{"inviteToken": "invalid_token"}'
    `.trim());
    
    console.log('\n\n3. Test with missing token:');
    console.log(`
curl -X POST ${API_BASE_URL}/api/courseAccess/acceptInvite \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -d '{}'
    `.trim());
    
    console.log('\n');
}

// Run tests
if (require.main === module) {
    console.log('\n🚀 Accept Invite API Test Suite');
    console.log('='.repeat(70));
    console.log(`API URL: ${API_BASE_URL}`);
    console.log('='.repeat(70) + '\n');
    
    // Uncomment to run automated tests
    // testAcceptInvite().then(() => {
    //     console.log('✨ All tests completed\n');
    // });
    
    // Print cURL examples for manual testing
    printCurlExamples();
    
    console.log('\n💡 To run automated tests:');
    console.log('1. Set environment variables:');
    console.log('   export API_URL=http://localhost:3000');
    console.log('   export TEST_AUTH_TOKEN=your_auth_token');
    console.log('2. Uncomment the testAcceptInvite() call above');
    console.log('3. Run: node test-accept-invite.js\n');
}

module.exports = {
    testAcceptInvite,
    createTestInvitation
};
