// Test Doctor Application API
const baseUrl = 'http://localhost:3000';

async function testDoctorApplication() {
  console.log('🏥 Testing Doctor Application API...\n');

  // Test data for doctor application
  const applicationData = {
    firstName: 'Dr. John',
    lastName: 'Smith',
    email: 'dr.john.smith@example.com',
    phoneNumber: '+1234567890',
    specialty: 'cardiology',
    licenseNumber: 'MD123456789',
    credentialUrl: 'https://example.com/verify/MD123456789',
    yearsOfExperience: 10,
    education: [
      {
        degree: 'Doctor of Medicine (MD)',
        institution: 'Harvard Medical School',
        graduationYear: 2010
      }
    ],
    certifications: [
      {
        name: 'Board Certified Cardiologist',
        issuingOrganization: 'American Board of Internal Medicine',
        issueDate: '2012-06-15',
        expiryDate: '2025-06-15'
      }
    ],
    bio: 'Experienced cardiologist with 10+ years of practice in interventional cardiology.',
    languages: ['English', 'Spanish'],
    consultationFee: 5,
    additionalNotes: 'Available for emergency consultations and specialized cardiac procedures.'
  };

  // Test 1: Submit Doctor Application
  console.log('Test 1: POST /api/doctors/apply');
  try {
    const response = await fetch(`${baseUrl}/api/doctors/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(applicationData)
    });
    
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
    
    if (data.applicationId) {
      console.log('🎉 Application ID:', data.applicationId);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Try to submit duplicate application (should fail)
  console.log('Test 2: POST /api/doctors/apply (Duplicate)');
  try {
    const response = await fetch(`${baseUrl}/api/doctors/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...applicationData,
        email: 'dr.jane.doe@example.com' // Different email
      })
    });
    
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Submit with invalid data (should fail validation)
  console.log('Test 3: POST /api/doctors/apply (Invalid Data)');
  try {
    const invalidData = {
      firstName: 'A', // Too short
      lastName: 'B', // Too short
      email: 'invalid-email', // Invalid email
      phoneNumber: '123', // Too short
      specialty: 'INVALID_SPECIALTY', // Invalid specialty
      licenseNumber: '123', // Too short
      credentialUrl: 'not-a-url', // Invalid URL
      yearsOfExperience: -5, // Negative
      education: [], // Empty array
      languages: [], // Empty array
      consultationFee: 0 // Too low
    };

    const response = await fetch(`${baseUrl}/api/doctors/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidData)
    });
    
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📋 Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n🎉 Doctor Application API Tests Complete!');
}

testDoctorApplication();
