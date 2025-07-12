const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    return;
  }

  console.log('🔌 Testing MongoDB connection...');
  console.log('📍 URI:', uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    maxIdleTimeMS: 30000,
    connectTimeoutMS: 15000,
    heartbeatFrequencyMS: 10000,
    family: 4,
    // TLS options are already in the URI, don't duplicate them here
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB successfully!');
    
    // Test ping
    await client.db('admin').command({ ping: 1 });
    console.log('✅ Ping successful!');
    
    // Test database access
    const db = client.db('medme');
    const collections = await db.listCollections().toArray();
    console.log('✅ Database access successful!');
    console.log('📊 Collections found:', collections.length);
    
    await client.close();
    console.log('✅ Connection closed successfully!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('🔍 Error details:', error);
  }
}

testConnection();
