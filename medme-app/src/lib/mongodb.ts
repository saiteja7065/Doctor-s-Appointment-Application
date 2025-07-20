import { MongoClient, Db, MongoClientOptions } from 'mongodb';
import mongoose from 'mongoose';
import { createAuditLog } from './audit';

// Check for MongoDB URI
if (!process.env.MONGODB_URI) {
  console.warn('⚠️ Warning: MONGODB_URI environment variable is not set. Database features will be disabled.');
}

const uri = process.env.MONGODB_URI || '';
const dbName = process.env.MONGODB_DB_NAME || 'medme';

// MongoDB client options with connection pooling
const options: MongoClientOptions = {
  maxPoolSize: 20, // Increased pool size for better concurrency
  minPoolSize: 5, // Maintain minimum connections in the pool
  serverSelectionTimeoutMS: 15000, // Increased timeout for Atlas
  socketTimeoutMS: 45000, // Socket timeout
  maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
  family: 4, // Use IPv4, skip trying IPv6
  retryWrites: true, // Enable retryable writes
  retryReads: true, // Enable retryable reads
  connectTimeoutMS: 15000, // Connection timeout
  heartbeatFrequencyMS: 10000, // Heartbeat frequency
  directConnection: false, // Use load balancing
  compressors: ['zlib'], // Enable compression for better performance
};

// Connection state tracking
let isConnecting = false;
let connectionError: Error | null = null;
let lastConnectionAttempt = 0;
const CONNECTION_RETRY_INTERVAL = 10000; // 10 seconds

// Client instances
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// Connection retry logic with exponential backoff
async function createConnection(): Promise<MongoClient> {
  const maxRetries = 5;
  let lastError: Error | null = null;
  let retryCount = 0;

  // Set connection state
  isConnecting = true;
  lastConnectionAttempt = Date.now();

  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔌 MongoDB connection attempt ${attempt}/${maxRetries}...`);
        const newClient = new MongoClient(uri, options);
        await newClient.connect();

        // Test the connection
        await newClient.db('admin').command({ ping: 1 });
        console.log('✅ MongoDB connected successfully');
        
        // Reset connection state
        isConnecting = false;
        connectionError = null;
        
        // Log successful connection
        try {
          await createAuditLog({
            action: 'database.connected',
            entityType: 'system',
            data: { 
              timestamp: new Date().toISOString(),
              attempt
            }
          });
        } catch (logError) {
          // Ignore audit log errors during initial connection
        }
        
        return newClient;
      } catch (error) {
        lastError = error as Error;
        retryCount = attempt;
        console.error(`❌ MongoDB connection attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Exponential backoff with 30s max
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    throw new Error(`Failed to connect to MongoDB after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  } finally {
    // Update connection state
    isConnecting = false;
    if (lastError) {
      connectionError = lastError;
      
      // Log connection failure
      try {
        await createAuditLog({
          action: 'database.connection_failed',
          entityType: 'system',
          data: { 
            timestamp: new Date().toISOString(),
            error: lastError.message,
            retryCount
          }
        });
      } catch (logError) {
        // Ignore audit log errors during failed connection
      }
    }
  }
}

// Initialize MongoDB client if URI is provided
if (uri) {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable to preserve connection across HMR
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      globalWithMongo._mongoClientPromise = createConnection();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, create a new client for each instance
    clientPromise = createConnection();
  }
}

// Export a module-scoped MongoClient promise
export default clientPromise;

// Database connection helper with status monitoring
export async function connectToDatabase(): Promise<{ connected: boolean; client?: MongoClient; db?: Db }> {
  if (!clientPromise) {
    console.warn('⚠️ MongoDB is not configured. Database operations will be skipped.');
    return { connected: false };
  }

  // Check if we should retry connection
  if (connectionError && !isConnecting && (Date.now() - lastConnectionAttempt) > CONNECTION_RETRY_INTERVAL) {
    console.log('🔄 Retrying MongoDB connection after previous failure...');
    clientPromise = createConnection();
  }

  try {
    const client = await clientPromise;
    // Test the connection with a ping
    await client.db('admin').command({ ping: 1 });
    const db = client.db(dbName);
    return { connected: true, client, db };
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    return { connected: false };
  }
}

// Get database instance
export async function getDatabase(): Promise<Db | null> {
  const { connected, db } = await connectToDatabase();
  return connected && db ? db : null;
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
  maxPoolSize: 20, // Increased pool size
  minPoolSize: 5, // Maintain minimum connections
  serverSelectionTimeoutMS: 30000, // Increased timeout for Atlas
  socketTimeoutMS: 60000, // Increased timeout for Atlas
  maxIdleTimeMS: 30000,
  retryWrites: true,
  connectTimeoutMS: 30000, // Increased timeout for Atlas
  heartbeatFrequencyMS: 10000,
  bufferCommands: true, // Enable buffering for better reliability
  family: 4, // Use IPv4
  autoIndex: process.env.NODE_ENV !== 'production', // Disable auto-indexing in production
  autoCreate: process.env.NODE_ENV !== 'production', // Disable auto-creation in production
};

// Mongoose connection state tracking
let mongooseIsConnecting = false;
let mongooseConnectionError: Error | null = null;
let mongooseLastConnectionAttempt = 0;

// Mongoose connection function with retry logic
export async function connectToMongoose(): Promise<boolean> {
  if (!uri) {
    console.warn('⚠️ MongoDB URI not configured. Database operations will be skipped.');
    return false;
  }

  // Check if already connected
  if (mongoose.connections[0].readyState === 1) {
    return true;
  }

  // Check if we should retry connection
  if (mongooseConnectionError && !mongooseIsConnecting && 
      (Date.now() - mongooseLastConnectionAttempt) > CONNECTION_RETRY_INTERVAL) {
    console.log('🔄 Retrying Mongoose connection after previous failure...');
    // Reset state for retry
    mongooseConnectionError = null;
  }

  // If already connecting, wait for the connection
  if (mongooseIsConnecting) {
    try {
      // Wait for connection to complete (max 5 seconds)
      for (let i = 0; i < 50; i++) {
        if (mongoose.connections[0].readyState === 1) {
          return true;
        }
        if (!mongooseIsConnecting) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // If still connecting after timeout, return current state
      return mongoose.connections[0].readyState === 1;
    } catch (error) {
      console.error('❌ Error waiting for Mongoose connection:', error);
      return false;
    }
  }

  // Set connection state
  mongooseIsConnecting = true;
  mongooseLastConnectionAttempt = Date.now();

  const maxRetries = 5;
  let lastError: Error | null = null;
  let retryCount = 0;

  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔌 Mongoose connection attempt ${attempt}/${maxRetries}...`);

        // Disconnect if in connecting state
        if (mongoose.connections[0].readyState === 2) {
          await mongoose.disconnect();
        }

        await mongoose.connect(uri, mongooseOptions);
        console.log('✅ Mongoose connected successfully');
        
        // Reset connection state
        mongooseIsConnecting = false;
        mongooseConnectionError = null;
        
        // Log successful connection
        try {
          await createAuditLog({
            action: 'database.mongoose_connected',
            entityType: 'system',
            data: { 
              timestamp: new Date().toISOString(),
              attempt
            }
          });
        } catch (logError) {
          // Ignore audit log errors during initial connection
        }
        
        return true;
      } catch (error) {
        lastError = error as Error;
        retryCount = attempt;
        console.error(`❌ Mongoose connection attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`❌ Failed to connect to MongoDB with Mongoose after ${maxRetries} attempts. Last error: ${lastError?.message}`);
    return false;
  } finally {
    // Update connection state
    mongooseIsConnecting = false;
    if (lastError) {
      mongooseConnectionError = lastError;
      
      // Log connection failure
      try {
        await createAuditLog({
          action: 'database.mongoose_connection_failed',
          entityType: 'system',
          data: { 
            timestamp: new Date().toISOString(),
            error: lastError.message,
            retryCount
          }
        });
      } catch (logError) {
        // Ignore audit log errors during failed connection
      }
    }
  }
}

// Helper function to check mongoose connection status
export function isMongooseConnected(): boolean {
  return mongoose.connections[0].readyState === 1;
}

// Helper function to get mongoose connection
export function getMongooseConnection() {
  return mongoose.connection;
}

// Database health check function
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'unavailable';
  mongoClient: boolean;
  mongoose: boolean;
  responseTime: number;
  details?: any;
}> {
  const startTime = Date.now();
  let mongoClientConnected = false;
  let mongooseConnected = false;
  let details = {};

  try {
    // Check MongoDB client connection
    if (clientPromise) {
      try {
        const client = await Promise.race([
          clientPromise,
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
          )
        ]);
        
        if (client) {
          await client.db('admin').command({ ping: 1 });
          mongoClientConnected = true;
        }
      } catch (error) {
        details = { ...details, mongoClientError: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // Check Mongoose connection
    if (uri) {
      try {
        if (mongoose.connections[0].readyState === 1) {
          mongooseConnected = true;
        } else {
          const connected = await connectToMongoose();
          mongooseConnected = connected;
        }
      } catch (error) {
        details = { ...details, mongooseError: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    const responseTime = Date.now() - startTime;
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unavailable' = 'healthy';
    
    if (!mongoClientConnected && !mongooseConnected) {
      status = 'unavailable';
    } else if (!mongoClientConnected || !mongooseConnected) {
      status = 'degraded';
    }

    return {
      status,
      mongoClient: mongoClientConnected,
      mongoose: mongooseConnected,
      responseTime,
      details
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unavailable',
      mongoClient: false,
      mongoose: false,
      responseTime,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}

// Export all functions directly to fix import issues
export { connectToMongoose };