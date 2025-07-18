// Test Patient Search Integration
const baseUrl = 'http://localhost:3000';

async function testPatientSearch() {
  console.log('🔍 Testing Patient Search Integration...\n');

  // Test 1: Get all available doctors
  console.log('Test 1: GET /api/doctors/search (All doctors)');
  try {
    const response = await fetch(`${baseUrl}/api/doctors/search`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📊 Doctors found:', data.doctors?.length || 0);
    console.log('🧪 Is demo mode:', data.isDemo);
    console.log('📋 First doctor:', JSON.stringify(data.doctors?.[0], null, 2));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Search by specialty (cardiology)
  console.log('Test 2: GET /api/doctors/search?specialty=cardiology');
  try {
    const response = await fetch(`${baseUrl}/api/doctors/search?specialty=cardiology`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📊 Cardiologists found:', data.doctors?.length || 0);
    console.log('📋 Cardiologists:', data.doctors?.map(d => d.name).join(', '));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Search by specialty (dermatology)
  console.log('Test 3: GET /api/doctors/search?specialty=dermatology');
  try {
    const response = await fetch(`${baseUrl}/api/doctors/search?specialty=dermatology`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📊 Dermatologists found:', data.doctors?.length || 0);
    console.log('📋 Dermatologists:', data.doctors?.map(d => d.name).join(', '));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Search by name
  console.log('Test 4: GET /api/doctors/search?search=John');
  try {
    const response = await fetch(`${baseUrl}/api/doctors/search?search=John`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📊 Doctors named John found:', data.doctors?.length || 0);
    console.log('📋 Results:', data.doctors?.map(d => d.name).join(', '));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 5: Filter by max fee
  console.log('Test 5: GET /api/doctors/search?maxFee=5');
  try {
    const response = await fetch(`${baseUrl}/api/doctors/search?maxFee=5`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📊 Doctors with fee ≤ $5:', data.doctors?.length || 0);
    console.log('📋 Doctors and fees:', data.doctors?.map(d => `${d.name} ($${d.consultationFee})`).join(', '));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 6: Filter by minimum rating
  console.log('Test 6: GET /api/doctors/search?minRating=4.8');
  try {
    const response = await fetch(`${baseUrl}/api/doctors/search?minRating=4.8`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📊 Doctors with rating ≥ 4.8:', data.doctors?.length || 0);
    console.log('📋 High-rated doctors:', data.doctors?.map(d => `${d.name} (${d.rating}⭐)`).join(', '));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 7: Sort by experience
  console.log('Test 7: GET /api/doctors/search?sortBy=experience&sortOrder=desc');
  try {
    const response = await fetch(`${baseUrl}/api/doctors/search?sortBy=experience&sortOrder=desc`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📊 Doctors sorted by experience:', data.doctors?.length || 0);
    console.log('📋 Experience ranking:', data.doctors?.slice(0, 3).map(d => `${d.name} (${d.experience} years)`).join(', '));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 8: Sort by fee (lowest first)
  console.log('Test 8: GET /api/doctors/search?sortBy=fee&sortOrder=asc');
  try {
    const response = await fetch(`${baseUrl}/api/doctors/search?sortBy=fee&sortOrder=asc`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📊 Doctors sorted by fee (lowest first):', data.doctors?.length || 0);
    console.log('📋 Fee ranking:', data.doctors?.slice(0, 3).map(d => `${d.name} ($${d.consultationFee})`).join(', '));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  console.log('\n' + '='.repeat(50) + '\n');

  // Test 9: Complex filter (cardiology + high rating + low fee)
  console.log('Test 9: GET /api/doctors/search?specialty=cardiology&minRating=4.5&maxFee=6');
  try {
    const response = await fetch(`${baseUrl}/api/doctors/search?specialty=cardiology&minRating=4.5&maxFee=6`);
    const data = await response.json();
    console.log('✅ Status:', response.status);
    console.log('📊 Cardiologists (rating ≥ 4.5, fee ≤ $6):', data.doctors?.length || 0);
    console.log('📋 Filtered results:', data.doctors?.map(d => `${d.name} (${d.rating}⭐, $${d.consultationFee})`).join(', '));
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n🎉 Patient Search Integration Tests Complete!');
}

testPatientSearch();
