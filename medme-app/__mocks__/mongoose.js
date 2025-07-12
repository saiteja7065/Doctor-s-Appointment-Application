// Mock Mongoose for Jest tests

const mockDocument = {
  save: jest.fn(() => Promise.resolve(mockDocument)),
  remove: jest.fn(() => Promise.resolve()),
  deleteOne: jest.fn(() => Promise.resolve()),
  populate: jest.fn(() => Promise.resolve(mockDocument)),
  toObject: jest.fn(() => ({})),
  toJSON: jest.fn(() => ({})),
  _id: 'mock-id',
  id: 'mock-id',
};

const mockQuery = {
  exec: jest.fn(() => Promise.resolve([])),
  then: jest.fn((resolve) => resolve([])),
  catch: jest.fn(),
  populate: jest.fn(() => mockQuery),
  select: jest.fn(() => mockQuery),
  sort: jest.fn(() => mockQuery),
  limit: jest.fn(() => mockQuery),
  skip: jest.fn(() => mockQuery),
  lean: jest.fn(() => mockQuery),
  where: jest.fn(() => mockQuery),
  equals: jest.fn(() => mockQuery),
  in: jest.fn(() => mockQuery),
  nin: jest.fn(() => mockQuery),
  gt: jest.fn(() => mockQuery),
  gte: jest.fn(() => mockQuery),
  lt: jest.fn(() => mockQuery),
  lte: jest.fn(() => mockQuery),
  ne: jest.fn(() => mockQuery),
  regex: jest.fn(() => mockQuery),
};

const mockModel = {
  find: jest.fn(() => mockQuery),
  findOne: jest.fn(() => mockQuery),
  findById: jest.fn(() => mockQuery),
  findByIdAndUpdate: jest.fn(() => mockQuery),
  findByIdAndDelete: jest.fn(() => mockQuery),
  findOneAndUpdate: jest.fn(() => mockQuery),
  findOneAndDelete: jest.fn(() => mockQuery),
  create: jest.fn(() => Promise.resolve(mockDocument)),
  insertMany: jest.fn(() => Promise.resolve([mockDocument])),
  updateOne: jest.fn(() => Promise.resolve({ modifiedCount: 1 })),
  updateMany: jest.fn(() => Promise.resolve({ modifiedCount: 1 })),
  deleteOne: jest.fn(() => Promise.resolve({ deletedCount: 1 })),
  deleteMany: jest.fn(() => Promise.resolve({ deletedCount: 1 })),
  countDocuments: jest.fn(() => Promise.resolve(0)),
  aggregate: jest.fn(() => mockQuery),
  distinct: jest.fn(() => Promise.resolve([])),
  exists: jest.fn(() => Promise.resolve(true)),
  estimatedDocumentCount: jest.fn(() => Promise.resolve(0)),
  watch: jest.fn(() => ({})),
  createIndexes: jest.fn(() => Promise.resolve()),
  ensureIndexes: jest.fn(() => Promise.resolve()),
  syncIndexes: jest.fn(() => Promise.resolve()),
};

const createMockSchema = () => ({
  add: jest.fn(),
  pre: jest.fn(),
  post: jest.fn(),
  methods: {},
  statics: {},
  virtual: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
  })),
  index: jest.fn(),
  plugin: jest.fn(),
  set: jest.fn(),
  path: jest.fn(() => ({
    validate: jest.fn(),
    default: jest.fn(),
    required: jest.fn(),
    unique: jest.fn(),
    index: jest.fn(),
  })),
});

const Schema = jest.fn((definition, options) => {
  const schema = createMockSchema();
  // Store the definition and options for test access
  Schema.lastCall = { definition, options };
  return schema;
});
Schema.Types = {
  ObjectId: jest.fn((id) => ({
    toString: () => id || 'mock-object-id',
    toHexString: () => id || 'mock-object-id',
    equals: jest.fn(() => true),
  })),
  String: String,
  Number: Number,
  Date: Date,
  Boolean: Boolean,
  Array: Array,
  Mixed: jest.fn(),
  Decimal128: jest.fn(),
  Map: Map,
  Buffer: Buffer,
};

const mongoose = {
  connect: jest.fn(() => Promise.resolve()),
  disconnect: jest.fn(() => Promise.resolve()),
  connection: {
    readyState: 1,
    on: jest.fn(),
    once: jest.fn(),
    off: jest.fn(),
    removeListener: jest.fn(),
    db: {
      admin: jest.fn(() => ({
        ping: jest.fn(() => Promise.resolve()),
      })),
    },
  },
  model: jest.fn(() => mockModel),
  Schema,
  Types: Schema.Types,
  isValidObjectId: jest.fn(() => true),
  startSession: jest.fn(() => Promise.resolve({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(() => Promise.resolve()),
    abortTransaction: jest.fn(() => Promise.resolve()),
    endSession: jest.fn(() => Promise.resolve()),
  })),
  set: jest.fn(),
  get: jest.fn(),
};

module.exports = mongoose;
module.exports.default = mongoose;
