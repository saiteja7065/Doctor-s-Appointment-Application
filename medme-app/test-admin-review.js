// Test Admin Review System
const baseUrl = 'http://localhost:3000';

async function testAdminReview() {
  console.log('👨‍💼 Testing Admin Review System...\n');

  // Test 1: Get all doctor applications
  console.log('Test 1: GET /api/admin/doctor-applications');
  try {
    const response = await fetch(`${baseUrl}/api/admin/doctor-applications`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📊 Applications found:', data.total);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Get applications by status
  console.log('Test 2: GET /api/admin/doctor-applications?status=pending');
  try {
    const response = await fetch(`${baseUrl}/api/admin/doctor-applications?status=pending`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📊 Pending applications:', data.total);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Approve an application
  console.log('Test 3: POST /api/admin/doctor-applications/demo_app_1/approve');
  try {
    const approvalData = {
      comments: 'Application meets all requirements. Credentials verified.'
    };

    const response = await fetch(`${baseUrl}/api/admin/doctor-applications/demo_app_1/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(approvalData)
    });
    
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Reject an application
  console.log('Test 4: POST /api/admin/doctor-applications/demo_app_2/reject');
  try {
    const rejectionData = {
      comments: 'License verification failed. Please provide updated credentials.',
      requestedChanges: [
        'Update medical license',
        'Provide additional certification',
        'Clarify years of experience'
      ]
    };

    const response = await fetch(`${baseUrl}/api/admin/doctor-applications/demo_app_2/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rejectionData)
    });
    
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: Get approved applications
  console.log('Test 5: GET /api/admin/doctor-applications?status=approved');
  try {
    const response = await fetch(`${baseUrl}/api/admin/doctor-applications?status=approved`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📊 Approved applications:', data.total);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 6: Get rejected applications
  console.log('Test 6: GET /api/admin/doctor-applications?status=rejected');
  try {
    const response = await fetch(`${baseUrl}/api/admin/doctor-applications?status=rejected`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📊 Rejected applications:', data.total);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n🎉 Admin Review System Tests Complete!');
}

testAdminReview();
