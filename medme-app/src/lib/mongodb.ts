import { MongoClient, Db } from 'mongodb';
import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  console.warn('Warning: MONGODB_URI environment variable is not set. Database features will be disabled.');
}

const uri = process.env.MONGODB_URI || '';
const options = {
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 15000, // Increased timeout for Atlas
  socketTimeoutMS: 45000, // Socket timeout
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true, // Enable retryable writes
  retryReads: true, // Enable retryable reads
  connectTimeoutMS: 15000, // Connection timeout
  heartbeatFrequencyMS: 10000, // Heartbeat frequency
  // Remove explicit SSL/TLS settings to let MongoDB driver handle it
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// Connection retry logic
async function createConnection(): Promise<MongoClient> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔌 MongoDB connection attempt ${attempt}/${maxRetries}...`);
      const client = new MongoClient(uri, options);
      await client.connect();

      // Test the connection
      await client.db('admin').command({ ping: 1 });
      console.log('✅ MongoDB connected successfully');
      return client;
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ MongoDB connection attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts. Last error: ${lastError?.message}`);
}

// Only initialize MongoDB if URI is provided
if (uri) {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      globalWithMongo._mongoClientPromise = createConnection();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    clientPromise = createConnection();
  }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

// Database helper functions
export async function connectToDatabase(): Promise<boolean> {
  if (!clientPromise) {
    console.warn('🔌 MongoDB is not configured. Database operations will be skipped.');
    return false;
  }

  try {
    const client = await clientPromise;
    // Test the connection with a ping
    await client.db('admin').command({ ping: 1 });
    console.log('✅ Database connection verified');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    return false;
  }
}

export async function getDatabase(): Promise<Db | null> {
  if (!clientPromise) {
    console.warn('MongoDB is not configured. Database operations will be skipped.');
    return null;
  }

  try {
    const client = await clientPromise;
    return client.db('medme'); // MedMe database name
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return null;
  }
}

// Collection names constants
export const COLLECTIONS = {
  USERS: 'users',
  DOCTORS: 'doctors',
  PATIENTS: 'patients',
  APPOINTMENTS: 'appointments',
  SUBSCRIPTIONS: 'subscriptions',
  TRANSACTIONS: 'transactions',
  WITHDRAWAL_REQUESTS: 'withdrawal_requests',
  AUDIT_LOGS: 'audit_logs',
} as const;

// Helper function to get a specific collection
export async function getCollection(collectionName: string) {
  const db = await getDatabase();
  if (!db) {
    throw new Error('Database not available');
  }
  return db.collection(collectionName);
}

// Mongoose connection configuration
const mongooseOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000, // Reduced timeout for faster fallback
  socketTimeoutMS: 10000, // Reduced timeout for faster fallback
  maxIdleTimeMS: 30000,
  retryWrites: true,
  connectTimeoutMS: 5000, // Reduced timeout for faster fallback
  heartbeatFrequencyMS: 10000,
  bufferCommands: false, // Disable buffering to fail fast
  bufferMaxEntries: 0, // Disable buffering to fail fast
  family: 4, // Use IPv4
  // Let MongoDB driver handle SSL/TLS automatically for Atlas
};

// Mongoose connection function with retry logic
export async function connectToMongoose(): Promise<boolean> {
  if (!uri) {
    console.warn('🔌 MongoDB URI not configured. Database operations will be skipped.');
    return false;
  }

  // Check if already connected
  if (mongoose.connections[0].readyState === 1) {
    console.log('✅ Mongoose already connected');
    return true;
  }

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔌 Mongoose connection attempt ${attempt}/${maxRetries}...`);

      // Disconnect if in connecting state
      if (mongoose.connections[0].readyState === 2) {
        await mongoose.disconnect();
      }

      await mongoose.connect(uri, mongooseOptions);
      console.log('✅ Mongoose connected successfully');
      return true;
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Mongoose connection attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error(`❌ Failed to connect to MongoDB with Mongoose after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  return false;
}
