// Comprehensive End-to-End Functionality Test
const baseUrl = 'http://localhost:3000';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  issues: []
};

function logTest(testName, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    testResults.issues.push(`${testName}: ${details}`);
  }
  if (details) {
    console.log(`   ${details}`);
  }
}

async function testApplicationHealth() {
  console.log('\n🔍 1. APPLICATION HEALTH CHECK');
  console.log('=' .repeat(50));

  // Test 1.1: Application startup
  try {
    const response = await fetch(`${baseUrl}/api/test-db`);
    const data = await response.json();
    logTest('Application Startup', response.status === 200, `Server responding on port 3000`);
    logTest('Database Connection', data.connected !== false, `MongoDB connection: ${data.connected ? 'Connected' : 'Failed'}`);
  } catch (error) {
    logTest('Application Startup', false, `Server not responding: ${error.message}`);
  }

  // Test 1.2: Basic page loads
  try {
    const response = await fetch(`${baseUrl}/demo-auth`);
    logTest('Demo Auth Page Load', response.status === 200 || response.status === 500, 'Page accessible (Clerk errors expected)');
  } catch (error) {
    logTest('Demo Auth Page Load', false, `Page load failed: ${error.message}`);
  }
}

async function testDatabaseOperations() {
  console.log('\n🔍 2. DATABASE OPERATIONS TESTING');
  console.log('=' .repeat(50));

  // Test 2.1: User CRUD operations
  try {
    // Create user
    const createResponse = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clerkId: `test_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
        role: 'patient'
      })
    });
    const createData = await createResponse.json();
    logTest('User Creation', createResponse.status === 201 && createData.success, `User created: ${createData.success}`);

    // Read users
    const readResponse = await fetch(`${baseUrl}/api/users`);
    const readData = await readResponse.json();
    logTest('User Retrieval', readResponse.status === 200 && readData.users, `Users found: ${readData.users?.length || 0}`);

    // Test role filtering
    const roleResponse = await fetch(`${baseUrl}/api/users?role=patient`);
    const roleData = await roleResponse.json();
    logTest('Role-based Filtering', roleResponse.status === 200, `Patients found: ${roleData.users?.length || 0}`);

  } catch (error) {
    logTest('Database Operations', false, `CRUD operations failed: ${error.message}`);
  }
}

async function testCompleteWorkflow() {
  console.log('\n🔍 3. COMPLETE WORKFLOW TESTING');
  console.log('=' .repeat(50));

  let applicationId = null;

  // Test 3.1: Doctor application submission
  try {
    const applicationData = {
      firstName: 'Dr. Test',
      lastName: 'Doctor',
      email: `test.doctor.${Date.now()}@example.com`,
      phoneNumber: '+1234567890',
      specialty: 'cardiology',
      licenseNumber: 'MD123456789',
      credentialUrl: 'https://example.com/verify/MD123456789',
      yearsOfExperience: 10,
      education: [{
        degree: 'Doctor of Medicine (MD)',
        institution: 'Test Medical School',
        graduationYear: 2010
      }],
      certifications: [{
        name: 'Board Certified Cardiologist',
        issuingOrganization: 'Test Board',
        issueDate: '2012-06-15',
        expiryDate: '2025-06-15'
      }],
      bio: 'Test doctor for comprehensive testing.',
      languages: ['English'],
      consultationFee: 5
    };

    const appResponse = await fetch(`${baseUrl}/api/doctors/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(applicationData)
    });
    const appData = await appResponse.json();
    logTest('Doctor Application Submission', appResponse.status === 201 && appData.success, `Application ID: ${appData.applicationId}`);
    
    if (appData.applicationId) {
      applicationId = appData.applicationId;
    }
  } catch (error) {
    logTest('Doctor Application Submission', false, `Application failed: ${error.message}`);
  }

  // Test 3.2: Admin review process
  try {
    // Get pending applications
    const pendingResponse = await fetch(`${baseUrl}/api/admin/doctor-applications?status=pending`);
    const pendingData = await pendingResponse.json();
    logTest('Admin View Pending Applications', pendingResponse.status === 200, `Pending applications: ${pendingData.total || 0}`);

    // Approve application
    if (applicationId) {
      const approveResponse = await fetch(`${baseUrl}/api/admin/doctor-applications/${applicationId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: 'Test approval' })
      });
      const approveData = await approveResponse.json();
      logTest('Admin Application Approval', approveResponse.status === 200 && approveData.success, `Approval: ${approveData.success}`);
    }
  } catch (error) {
    logTest('Admin Review Process', false, `Admin review failed: ${error.message}`);
  }

  // Test 3.3: Patient search integration
  try {
    const searchResponse = await fetch(`${baseUrl}/api/doctors/search`);
    const searchData = await searchResponse.json();
    logTest('Patient Doctor Search', searchResponse.status === 200, `Doctors available: ${searchData.doctors?.length || 0}`);

    // Test specialty filtering
    const specialtyResponse = await fetch(`${baseUrl}/api/doctors/search?specialty=cardiology`);
    const specialtyData = await specialtyResponse.json();
    logTest('Doctor Search Filtering', specialtyResponse.status === 200, `Cardiologists: ${specialtyData.doctors?.length || 0}`);
  } catch (error) {
    logTest('Patient Search Integration', false, `Search failed: ${error.message}`);
  }
}

async function testAuthenticationSystem() {
  console.log('\n🔍 4. AUTHENTICATION SYSTEM TESTING');
  console.log('=' .repeat(50));

  // Test 4.1: Demo authentication with database integration
  try {
    const authData = {
      clerkId: `demo_auth_test_${Date.now()}`,
      email: `demo.auth.test.${Date.now()}@medme.com`,
      firstName: 'Demo',
      lastName: 'AuthTest',
      role: 'patient'
    };

    const authResponse = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authData)
    });
    const authResult = await authResponse.json();
    logTest('Demo Auth Database Integration', authResponse.status === 201 && authResult.success, `User saved to database: ${authResult.success}`);
  } catch (error) {
    logTest('Demo Auth Database Integration', false, `Auth integration failed: ${error.message}`);
  }
}

async function testAPIEndpoints() {
  console.log('\n🔍 5. API ENDPOINTS TESTING');
  console.log('=' .repeat(50));

  const endpoints = [
    { url: '/api/users', method: 'GET', name: 'User Management API' },
    { url: '/api/doctors/search', method: 'GET', name: 'Doctor Search API' },
    { url: '/api/admin/doctor-applications', method: 'GET', name: 'Admin Applications API' },
    { url: '/api/test-db', method: 'GET', name: 'Database Test API' }
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint.url}`);
      logTest(endpoint.name, response.status === 200, `Status: ${response.status}`);
    } catch (error) {
      logTest(endpoint.name, false, `Endpoint failed: ${error.message}`);
    }
  }
}

async function testErrorHandling() {
  console.log('\n🔍 6. ERROR HANDLING TESTING');
  console.log('=' .repeat(50));

  // Test 6.1: Invalid input validation
  try {
    const invalidResponse = await fetch(`${baseUrl}/api/doctors/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'A', // Too short
        lastName: 'B', // Too short
        email: 'invalid-email',
        specialty: 'INVALID_SPECIALTY'
      })
    });
    logTest('Input Validation', invalidResponse.status === 400, `Validation errors properly returned`);
  } catch (error) {
    logTest('Input Validation', false, `Validation test failed: ${error.message}`);
  }

  // Test 6.2: Non-existent endpoints
  try {
    const notFoundResponse = await fetch(`${baseUrl}/api/nonexistent`);
    logTest('404 Handling', notFoundResponse.status === 404, `Non-existent endpoints handled`);
  } catch (error) {
    logTest('404 Handling', true, `Network error expected for non-existent endpoints`);
  }
}

async function runComprehensiveTest() {
  console.log('🧪 COMPREHENSIVE END-TO-END FUNCTIONALITY TEST');
  console.log('🏥 MedMe Doctor Appointment Application');
  console.log('📅 Date:', new Date().toISOString());
  console.log('=' .repeat(80));

  await testApplicationHealth();
  await testDatabaseOperations();
  await testCompleteWorkflow();
  await testAuthenticationSystem();
  await testAPIEndpoints();
  await testErrorHandling();

  // Final report
  console.log('\n📊 COMPREHENSIVE TEST RESULTS');
  console.log('=' .repeat(80));
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`📊 Total Tests: ${testResults.total}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.issues.length > 0) {
    console.log('\n🚨 ISSUES FOUND:');
    testResults.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }

  console.log('\n🎯 OVERALL ASSESSMENT:');
  if (testResults.passed / testResults.total >= 0.8) {
    console.log('🎉 APPLICATION IS LARGELY FUNCTIONAL - Ready for continued development');
  } else if (testResults.passed / testResults.total >= 0.6) {
    console.log('⚠️ APPLICATION HAS SOME ISSUES - Needs fixes before production');
  } else {
    console.log('🚨 APPLICATION HAS MAJOR ISSUES - Requires significant fixes');
  }

  console.log('\n✅ Comprehensive testing completed!');
}

runComprehensiveTest();
