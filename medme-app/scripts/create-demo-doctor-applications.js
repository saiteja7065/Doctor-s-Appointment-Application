/**
 * Demo script to create sample doctor applications for testing admin verification
 * Run with: node scripts/create-demo-doctor-applications.js
 */

const { MongoClient } = require('mongodb');

// MongoDB connection string (update with your actual connection string)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://saitejagarlapati5695:LcOBSoRqiF0L3FG1@cluster0.ocnjj70.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const demoApplications = [
  {
    clerkId: 'demo_doctor_1',
    firstName: 'Dr. Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@medme.com',
    specialty: 'cardiology',
    licenseNumber: 'MD-12345-CA',
    credentialUrl: 'https://medical-board.ca.gov/verify/MD-12345-CA',
    yearsOfExperience: 8,
    education: [
      {
        degree: 'Doctor of Medicine (MD)',
        institution: 'Stanford University School of Medicine',
        graduationYear: 2015
      },
      {
        degree: 'Bachelor of Science in Biology',
        institution: 'University of California, Berkeley',
        graduationYear: 2011
      }
    ],
    certifications: [
      {
        name: 'Board Certified in Cardiology',
        issuingOrganization: 'American Board of Internal Medicine',
        issueDate: '2018-06-15',
        expiryDate: '2028-06-15'
      }
    ],
    bio: 'Experienced cardiologist specializing in preventive cardiology and heart disease management.',
    languages: ['English', 'Spanish'],
    verificationStatus: 'pending',
    consultationFee: 4,
    availability: [],
    timeZone: 'America/Los_Angeles',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    clerkId: 'demo_doctor_2',
    firstName: 'Dr. Michael',
    lastName: 'Chen',
    email: 'michael.chen@medme.com',
    specialty: 'dermatology',
    licenseNumber: 'MD-67890-NY',
    credentialUrl: 'https://health.ny.gov/verify/MD-67890-NY',
    yearsOfExperience: 12,
    education: [
      {
        degree: 'Doctor of Medicine (MD)',
        institution: 'Harvard Medical School',
        graduationYear: 2012
      }
    ],
    certifications: [
      {
        name: 'Board Certified in Dermatology',
        issuingOrganization: 'American Board of Dermatology',
        issueDate: '2016-08-20',
        expiryDate: '2026-08-20'
      }
    ],
    bio: 'Dermatologist with expertise in skin cancer detection and cosmetic dermatology.',
    languages: ['English', 'Mandarin'],
    verificationStatus: 'pending',
    consultationFee: 3,
    availability: [],
    timeZone: 'America/New_York',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    clerkId: 'demo_doctor_3',
    firstName: 'Dr. Emily',
    lastName: 'Rodriguez',
    email: 'emily.rodriguez@medme.com',
    specialty: 'pediatrics',
    licenseNumber: 'MD-11111-TX',
    credentialUrl: 'https://tmb.state.tx.us/verify/MD-11111-TX',
    yearsOfExperience: 6,
    education: [
      {
        degree: 'Doctor of Medicine (MD)',
        institution: 'Baylor College of Medicine',
        graduationYear: 2018
      }
    ],
    certifications: [
      {
        name: 'Board Certified in Pediatrics',
        issuingOrganization: 'American Board of Pediatrics',
        issueDate: '2021-07-10',
        expiryDate: '2031-07-10'
      }
    ],
    bio: 'Pediatrician focused on child development and preventive care.',
    languages: ['English', 'Spanish'],
    verificationStatus: 'pending',
    consultationFee: 3,
    availability: [],
    timeZone: 'America/Chicago',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function createDemoApplications() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const doctorsCollection = db.collection('doctors');
    const usersCollection = db.collection('users');
    
    // Create demo users for the doctors
    for (const app of demoApplications) {
      // Create user record
      const userDoc = {
        clerkId: app.clerkId,
        email: app.email,
        firstName: app.firstName,
        lastName: app.lastName,
        role: 'doctor',
        status: 'pending_verification',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert user if doesn't exist
      const existingUser = await usersCollection.findOne({ clerkId: app.clerkId });
      if (!existingUser) {
        const userResult = await usersCollection.insertOne(userDoc);
        console.log(`Created user for ${app.firstName} ${app.lastName}`);
        
        // Add userId to doctor application
        app.userId = userResult.insertedId;
      } else {
        app.userId = existingUser._id;
      }
      
      // Insert doctor application if doesn't exist
      const existingDoctor = await doctorsCollection.findOne({ clerkId: app.clerkId });
      if (!existingDoctor) {
        await doctorsCollection.insertOne(app);
        console.log(`Created doctor application for ${app.firstName} ${app.lastName}`);
      } else {
        console.log(`Doctor application already exists for ${app.firstName} ${app.lastName}`);
      }
    }
    
    console.log('\n✅ Demo doctor applications created successfully!');
    console.log('You can now test the admin verification process at: http://localhost:3001/dashboard/admin/doctors');
    
  } catch (error) {
    console.error('Error creating demo applications:', error);
  } finally {
    await client.close();
  }
}

// Run the script
createDemoApplications();
