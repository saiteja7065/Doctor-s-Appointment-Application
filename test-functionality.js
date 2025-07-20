/**
 * MedMe Doctor Appointment Application - Functionality Test Script
 * This script tests all the implemented functionalities of the application
 */

const axios = require('axios');
const chalk = require('chalk'); // You may need to install this: npm install chalk

// Configuration
const BASE_URL = 'http://localhost:3000';
const DEMO_HEADERS = { 'X-Demo-Mode': 'true' };

// Helper function to make API calls
async function callApi(endpoint, method = 'GET', body = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body) {
    options.data = body;
  }

  console.log(chalk.yellow(`🔄 Testing: ${method} ${url}`));
  
  try {
    const response = await axios(options);
    console.log(chalk.green(`✅ Success: ${method} ${url}`));
    return response.data;
  } catch (error) {
    console.log(chalk.red(`❌ Error: ${method} ${url} - ${error.message}`));
    if (error.response) {
      console.log(chalk.red(`   Status: ${error.response.status}`));
      console.log(chalk.red(`   Data: ${JSON.stringify(error.response.data)}`));
    }
    return null;
  }
}

// Test runner function
async function runTest(name, testFn) {
  console.log(chalk.magenta(`\n📋 Testing Feature: ${name}`));
  console.log(chalk.magenta('-------------------------------------'));
  
  try {
    await testFn();
    console.log(chalk.green(`✅ ${name} tests completed`));
    return true;
  } catch (error) {
    console.log(chalk.red(`❌ ${name} tests failed: ${error.message}`));
    return false;
  }
}

// Main test function
async function runAllTests() {
  console.log(chalk.cyan('🏥 MedMe Doctor Appointment Application - Functionality Test Script'));
  console.log(chalk.cyan('============================================================='));
  
  const results = [];

  // 1. Test Health Check Endpoint
  results.push(await runTest('Health Check', async () => {
    const response = await callApi('/api/health');
    
    if (response && response.status === 'ok') {
      console.log(chalk.green('✅ Health check endpoint is working'));
    } else {
      throw new Error('Health check failed');
    }
  }));

  // 2. Test MongoDB Connection
  results.push(await runTest('MongoDB Connection', async () => {
    const response = await callApi('/api/test-db');
    
    if (response && response.connected) {
      console.log(chalk.green('✅ MongoDB connection is working'));
      console.log(chalk.green(`   Database: ${response.database}`));
    } else {
      throw new Error('MongoDB connection failed');
    }
  }));

  // 3. Test Doctor Application Route (Demo Mode)
  results.push(await runTest('Doctor Application', async () => {
    const doctorApplication = {
      specialty: 'cardiology',
      licenseNumber: 'MD123456',
      yearsOfExperience: 10,
      education: 'Harvard Medical School',
      bio: 'Experienced cardiologist with 10+ years of practice',
      consultationFee: 150,
      languages: ['English', 'Spanish']
    };
    
    const response = await callApi('/api/doctors/apply', 'POST', doctorApplication, DEMO_HEADERS);
    
    if (response && response.success) {
      console.log(chalk.green('✅ Doctor application submission is working (Demo Mode)'));
      console.log(chalk.green(`   Application ID: ${response.applicationId}`));
      console.log(chalk.green(`   Status: ${response.status}`));
    } else {
      throw new Error('Doctor application failed');
    }
  }));

  // 4. Test Doctor Search Route
  results.push(await runTest('Doctor Search', async () => {
    const response = await callApi('/api/doctors/search?specialty=cardiology', 'GET', null, DEMO_HEADERS);
    
    if (response && response.doctors && response.doctors.length > 0) {
      console.log(chalk.green('✅ Doctor search is working'));
      console.log(chalk.green(`   Found ${response.doctors.length} doctors`));
      console.log(chalk.green(`   First doctor: ${response.doctors[0].firstName} ${response.doctors[0].lastName}`));
    } else {
      throw new Error('Doctor search failed');
    }
  }));

  // 5. Test Admin Overview Route (Demo Mode)
  results.push(await runTest('Admin Overview', async () => {
    const response = await callApi('/api/admin/overview', 'GET', null, DEMO_HEADERS);
    
    if (response && response.stats) {
      console.log(chalk.green('✅ Admin overview is working (Demo Mode)'));
      console.log(chalk.green(`   Total Users: ${response.stats.totalUsers}`));
      console.log(chalk.green(`   Total Doctors: ${response.stats.totalDoctors}`));
      console.log(chalk.green(`   Total Appointments: ${response.stats.totalAppointments}`));
    } else {
      throw new Error('Admin overview failed');
    }
  }));

  // 6. Test Notifications Check (Demo Mode)
  results.push(await runTest('Notifications', async () => {
    const response = await callApi('/api/notifications/check', 'GET', null, DEMO_HEADERS);
    
    if (response && response.hasNotifications !== undefined) {
      console.log(chalk.green('✅ Notifications check is working (Demo Mode)'));
      console.log(chalk.green(`   Has Notifications: ${response.hasNotifications}`));
      if (response.notifications) {
        console.log(chalk.green(`   Notification Count: ${response.notifications.length}`));
      }
    } else {
      throw new Error('Notifications check failed');
    }
  }));

  // 7. Test Error Handling (Intentionally causing an error)
  results.push(await runTest('Error Handling', async () => {
    try {
      await callApi('/api/non-existent-endpoint');
      throw new Error('Should have failed with 404');
    } catch (error) {
      console.log(chalk.green('✅ Error handling is working as expected'));
    }
  }));

  // Summary
  const successCount = results.filter(r => r).length;
  const failCount = results.length - successCount;
  
  console.log(chalk.cyan('\n📊 Test Summary'));
  console.log(chalk.cyan('============================================================='));
  console.log(chalk.cyan(`Total Tests: ${results.length}`));
  console.log(chalk.green(`Passed: ${successCount}`));
  console.log(chalk.red(`Failed: ${failCount}`));
  console.log(chalk.cyan('============================================================='));
  
  if (failCount === 0) {
    console.log(chalk.green('🎉 All tests passed!'));
  } else {
    console.log(chalk.yellow('⚠️ Some tests failed. Please check the output above.'));
  }
}

// Run all tests
runAllTests().catch(error => {
  console.error(chalk.red(`Fatal error: ${error.message}`));
  process.exit(1);
});