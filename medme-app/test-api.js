// Simple API test script
const baseUrl = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Starting API Tests...\n');

  // Test 1: GET /api/users
  console.log('Test 1: GET /api/users');
  try {
    const response = await fetch(`${baseUrl}/api/users`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📊 Users found:', data.total);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: POST /api/users
  console.log('Test 2: POST /api/users');
  try {
    const userData = {
      clerkId: `test_clerk_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      role: 'patient'
    };

    const response = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: GET /api/users/demo_patient_1
  console.log('Test 3: GET /api/users/demo_patient_1');
  try {
    const response = await fetch(`${baseUrl}/api/users/demo_patient_1`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Database Connection
  console.log('Test 4: Database Connection');
  try {
    const response = await fetch(`${baseUrl}/api/test-db`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('🔌 Connected:', data.connected);
    console.log('📊 Collections:', data.collections?.length || 0);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n🎉 API Tests Complete!');
}

testAPI();
