// Mock MongoDB driver for Jest tests

const mockCollection = {
  findOne: jest.fn(),
  find: jest.fn(() => ({
    toArray: jest.fn(() => Promise.resolve([])),
    limit: jest.fn(() => mockCollection),
    skip: jest.fn(() => mockCollection),
    sort: jest.fn(() => mockCollection),
  })),
  insertOne: jest.fn(() => Promise.resolve({ insertedId: 'mock-id' })),
  insertMany: jest.fn(() => Promise.resolve({ insertedIds: ['mock-id-1', 'mock-id-2'] })),
  updateOne: jest.fn(() => Promise.resolve({ modifiedCount: 1 })),
  updateMany: jest.fn(() => Promise.resolve({ modifiedCount: 1 })),
  deleteOne: jest.fn(() => Promise.resolve({ deletedCount: 1 })),
  deleteMany: jest.fn(() => Promise.resolve({ deletedCount: 1 })),
  countDocuments: jest.fn(() => Promise.resolve(0)),
  aggregate: jest.fn(() => ({
    toArray: jest.fn(() => Promise.resolve([])),
  })),
  createIndex: jest.fn(() => Promise.resolve()),
  listCollections: jest.fn(() => ({
    toArray: jest.fn(() => Promise.resolve([])),
  })),
};

const mockDb = {
  collection: jest.fn(() => mockCollection),
  command: jest.fn(() => Promise.resolve({ ok: 1 })),
  listCollections: jest.fn(() => ({
    toArray: jest.fn(() => Promise.resolve([])),
  })),
  admin: jest.fn(() => ({
    command: jest.fn(() => Promise.resolve({ ok: 1 })),
  })),
};

const mockClient = {
  connect: jest.fn(() => Promise.resolve()),
  close: jest.fn(() => Promise.resolve()),
  db: jest.fn(() => mockDb),
  isConnected: jest.fn(() => true),
};

const MongoClient = jest.fn(() => mockClient);
MongoClient.connect = jest.fn(() => Promise.resolve(mockClient));

const ObjectId = jest.fn((id) => ({
  toString: () => id || 'mock-object-id',
  toHexString: () => id || 'mock-object-id',
  equals: jest.fn(() => true),
}));

ObjectId.isValid = jest.fn(() => true);
ObjectId.createFromHexString = jest.fn((id) => new ObjectId(id));

module.exports = {
  MongoClient,
  ObjectId,
  Db: jest.fn(() => mockDb),
  Collection: jest.fn(() => mockCollection),
};
