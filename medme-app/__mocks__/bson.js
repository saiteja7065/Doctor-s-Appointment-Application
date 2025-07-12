// Mock BSON for Jest tests

const ObjectId = jest.fn((id) => ({
  toString: () => id || 'mock-object-id',
  toHexString: () => id || 'mock-object-id',
  equals: jest.fn(() => true),
  getTimestamp: jest.fn(() => new Date()),
  _bsontype: 'ObjectId',
}));

ObjectId.isValid = jest.fn(() => true);
ObjectId.createFromHexString = jest.fn((id) => new ObjectId(id));
ObjectId.createFromTime = jest.fn((time) => new ObjectId());

const Binary = jest.fn((buffer, subType) => ({
  buffer: buffer || Buffer.alloc(0),
  sub_type: subType || 0,
  _bsontype: 'Binary',
}));

const Code = jest.fn((code, scope) => ({
  code: code || '',
  scope: scope || {},
  _bsontype: 'Code',
}));

const DBRef = jest.fn((collection, oid, db) => ({
  collection: collection || '',
  oid: oid || new ObjectId(),
  db: db || null,
  _bsontype: 'DBRef',
}));

const Decimal128 = jest.fn((bytes) => ({
  bytes: bytes || Buffer.alloc(16),
  _bsontype: 'Decimal128',
  toString: jest.fn(() => '0'),
}));

const Double = jest.fn((value) => ({
  value: value || 0,
  _bsontype: 'Double',
  valueOf: jest.fn(() => value || 0),
}));

const Int32 = jest.fn((value) => ({
  value: value || 0,
  _bsontype: 'Int32',
  valueOf: jest.fn(() => value || 0),
}));

const Long = jest.fn((low, high, unsigned) => ({
  low: low || 0,
  high: high || 0,
  unsigned: unsigned || false,
  _bsontype: 'Long',
  toString: jest.fn(() => '0'),
  toNumber: jest.fn(() => 0),
}));

const MaxKey = jest.fn(() => ({
  _bsontype: 'MaxKey',
}));

const MinKey = jest.fn(() => ({
  _bsontype: 'MinKey',
}));

const BSONRegExp = jest.fn((pattern, options) => ({
  pattern: pattern || '',
  options: options || '',
  _bsontype: 'BSONRegExp',
}));

const BSONSymbol = jest.fn((value) => ({
  value: value || '',
  _bsontype: 'BSONSymbol',
}));

const Timestamp = jest.fn((low, high) => ({
  low: low || 0,
  high: high || 0,
  _bsontype: 'Timestamp',
}));

const UUID = jest.fn((id) => ({
  id: id || Buffer.alloc(16),
  _bsontype: 'Binary',
  sub_type: 4,
}));

module.exports = {
  ObjectId,
  Binary,
  Code,
  DBRef,
  Decimal128,
  Double,
  Int32,
  Long,
  MaxKey,
  MinKey,
  BSONRegExp,
  BSONSymbol,
  Timestamp,
  UUID,
  serialize: jest.fn(() => Buffer.alloc(0)),
  deserialize: jest.fn(() => ({})),
  calculateObjectSize: jest.fn(() => 0),
  EJSON: {
    parse: jest.fn((text) => JSON.parse(text)),
    stringify: jest.fn((value) => JSON.stringify(value)),
  },
};
