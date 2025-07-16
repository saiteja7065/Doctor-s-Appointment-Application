// Mock for MongoDB connection functions

const mockDatabase = {
  collection: jest.fn(() => ({
    find: jest.fn(() => ({
      toArray: jest.fn(() => Promise.resolve([])),
      limit: jest.fn(() => ({
        toArray: jest.fn(() => Promise.resolve([])),
      })),
    })),
    findOne: jest.fn(() => Promise.resolve(null)),
    insertOne: jest.fn(() => Promise.resolve({ insertedId: 'mock-id' })),
    updateOne: jest.fn(() => Promise.resolve({ modifiedCount: 1 })),
    deleteOne: jest.fn(() => Promise.resolve({ deletedCount: 1 })),
    countDocuments: jest.fn(() => Promise.resolve(0)),
    aggregate: jest.fn(() => ({
      toArray: jest.fn(() => Promise.resolve([])),
    })),
  })),
  admin: jest.fn(() => ({
    ping: jest.fn(() => Promise.resolve()),
  })),
};

const mockClient = {
  db: jest.fn(() => mockDatabase),
  close: jest.fn(() => Promise.resolve()),
  connect: jest.fn(() => Promise.resolve()),
};

// Mock functions
export const connectToDatabase = jest.fn(() => Promise.resolve(mockClient));
export const connectToMongoose = jest.fn(() => Promise.resolve(true));
export const getDatabase = jest.fn(() => Promise.resolve(mockDatabase));
export const getCollection = jest.fn(() => Promise.resolve(mockDatabase.collection()));

// Default export
const mongodb = {
  connectToDatabase,
  connectToMongoose,
  getDatabase,
  getCollection,
};

module.exports = mongodb;
