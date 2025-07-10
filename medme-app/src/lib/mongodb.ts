import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  console.warn('Warning: MONGODB_URI environment variable is not set. Database features will be disabled.');
}

const uri = process.env.MONGODB_URI || '';
const options = {};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// Only initialize MongoDB if URI is provided
if (uri) {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect().catch(err => {
        console.error('MongoDB connection error:', err);
        throw err;
      });
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect().catch(err => {
      console.error('MongoDB connection error:', err);
      throw err;
    });
  }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

// Database helper functions
export async function connectToDatabase(): Promise<boolean> {
  if (!clientPromise) {
    console.warn('MongoDB is not configured. Database operations will be skipped.');
    return false;
  }

  try {
    await clientPromise;
    return true;
  } catch (error) {
    console.error('Failed to connect to database:', error);
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
