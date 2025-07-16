import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Next.js server components
global.Request = class MockRequest {
  constructor(url, options = {}) {
    Object.defineProperty(this, 'url', {
      value: url,
      writable: false,
      enumerable: true,
      configurable: true
    })
    this.method = options.method || 'GET'
    this.headers = new Map(Object.entries(options.headers || {}))
    this.body = options.body
  }
}

global.Response = class MockResponse {
  constructor(body, options = {}) {
    this.body = body
    this.status = options.status || 200
    this.statusText = options.statusText || 'OK'
    this.headers = new Map(Object.entries(options.headers || {}))
    this.ok = this.status >= 200 && this.status < 300
  }

  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body)
    }
    return this.body
  }

  async text() {
    if (typeof this.body === 'string') {
      return this.body
    }
    return JSON.stringify(this.body)
  }

  static json(data, options = {}) {
    return new MockResponse(JSON.stringify(data), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
  }
}

// Mock Clerk authentication
jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(() => Promise.resolve({ userId: 'test-user-id' })),
  currentUser: jest.fn(() => Promise.resolve({
    id: 'test-user-id',
    firstName: 'Test',
    lastName: 'User',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  })),
  useAuth: jest.fn(() => ({
    userId: 'test-user-id',
    isSignedIn: true,
    isLoaded: true,
  })),
  useUser: jest.fn(() => ({
    user: {
      id: 'test-user-id',
      firstName: 'Test',
      lastName: 'User',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    },
    isLoaded: true,
  })),
  SignIn: jest.fn(({ children }) => children),
  SignUp: jest.fn(({ children }) => children),
  UserButton: jest.fn(() => <div data-testid="user-button">User Button</div>),
  ClerkProvider: jest.fn(({ children }) => children),
}))

// Mock Clerk server functions
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(() => Promise.resolve({ userId: 'test-user-id' })),
  currentUser: jest.fn(() => Promise.resolve({
    id: 'test-user-id',
    firstName: 'Test',
    lastName: 'User',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
  })),
  clerkMiddleware: jest.fn((handler) => handler),
  createRouteMatcher: jest.fn(() => jest.fn(() => false)),
}))

// Mock User Role and Status enums
jest.mock('@/lib/models/User', () => ({
  UserRole: {
    PATIENT: 'patient',
    DOCTOR: 'doctor',
    ADMIN: 'admin',
  },
  UserStatus: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING_VERIFICATION: 'pending_verification',
  },
  User: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
  },
}))

// Mock Patient model
jest.mock('@/lib/models/Patient', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(() => ({
      exec: jest.fn(() => Promise.resolve([])),
    })),
  },
  Patient: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(() => ({
      exec: jest.fn(() => Promise.resolve([])),
    })),
  },
}))

// Mock Doctor model
jest.mock('@/lib/models/Doctor', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(() => ({
      exec: jest.fn(() => Promise.resolve([])),
    })),
    aggregate: jest.fn(() => Promise.resolve([])),
  },
  Doctor: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(() => ({
      exec: jest.fn(() => Promise.resolve([])),
    })),
    aggregate: jest.fn(() => Promise.resolve([])),
  },
  MedicalSpecialty: {
    CARDIOLOGY: 'cardiology',
    DERMATOLOGY: 'dermatology',
    PEDIATRICS: 'pediatrics',
    ORTHOPEDICS: 'orthopedics',
    NEUROLOGY: 'neurology',
    PSYCHIATRY: 'psychiatry',
    ONCOLOGY: 'oncology',
    RADIOLOGY: 'radiology',
    ANESTHESIOLOGY: 'anesthesiology',
    EMERGENCY_MEDICINE: 'emergency_medicine',
    FAMILY_MEDICINE: 'family_medicine',
    INTERNAL_MEDICINE: 'internal_medicine',
    OBSTETRICS_GYNECOLOGY: 'obstetrics_gynecology',
    OPHTHALMOLOGY: 'ophthalmology',
    OTOLARYNGOLOGY: 'otolaryngology',
    PATHOLOGY: 'pathology',
    PHYSICAL_MEDICINE: 'physical_medicine',
    PLASTIC_SURGERY: 'plastic_surgery',
    SURGERY: 'surgery',
    UROLOGY: 'urology',
  },
  DoctorVerificationStatus: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended',
  },
}))

// Mock DoctorApplication model
jest.mock('@/lib/models/DoctorApplication', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(() => ({
      exec: jest.fn(() => Promise.resolve([])),
    })),
  },
  DoctorApplication: {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    deleteOne: jest.fn(),
    find: jest.fn(() => ({
      exec: jest.fn(() => Promise.resolve([])),
    })),
  },
  ApplicationStatus: {
    PENDING: 'pending',
    UNDER_REVIEW: 'under_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    REQUIRES_ADDITIONAL_INFO: 'requires_additional_info',
  },
  DocumentType: {
    MEDICAL_LICENSE: 'medical_license',
    DEGREE_CERTIFICATE: 'degree_certificate',
    CERTIFICATION: 'certification',
    ADDITIONAL_DOCUMENT: 'additional_document',
  },
}))

// Mock RBAC functions
jest.mock('@/lib/auth/rbac', () => ({
  withRBAC: jest.fn((config, handler) => handler),
  withPatientAuth: jest.fn((handler) => handler),
  withDoctorAuth: jest.fn((handler) => handler),
  withAdminAuth: jest.fn((handler) => handler),
  authenticateUser: jest.fn(() => Promise.resolve({
    userId: 'test-user-id',
    clerkId: 'test-clerk-id',
    role: 'patient',
    status: 'active',
    user: { id: 'test-user-id', role: 'patient' }
  })),
  UserRole: {
    PATIENT: 'patient',
    DOCTOR: 'doctor',
    ADMIN: 'admin',
  },
  RBACError: class RBACError extends Error {
    constructor(message, statusCode = 403) {
      super(message);
      this.statusCode = statusCode;
    }
  },
  AuthenticationError: class AuthenticationError extends Error {
    constructor(message = 'Authentication required') {
      super(message);
      this.statusCode = 401;
    }
  },
  AuthorizationError: class AuthorizationError extends Error {
    constructor(message = 'Insufficient permissions') {
      super(message);
      this.statusCode = 403;
    }
  },
}))

// MongoDB mocks
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve({
    db: jest.fn(() => ({
      collection: jest.fn(() => ({
        find: jest.fn(() => ({
          toArray: jest.fn(() => Promise.resolve([])),
        })),
        findOne: jest.fn(() => Promise.resolve(null)),
        insertOne: jest.fn(() => Promise.resolve({ insertedId: 'mock-id' })),
        updateOne: jest.fn(() => Promise.resolve({ modifiedCount: 1 })),
      })),
    })),
  })),
  connectToDatabase: jest.fn(() => Promise.resolve(true)),
  connectToMongoose: jest.fn(() => Promise.resolve(true)),
  isMongooseConnected: jest.fn(() => true),
  getMongooseConnection: jest.fn(() => ({
    readyState: 1,
  })),
  getDatabase: jest.fn(() => Promise.resolve({
    collection: jest.fn(() => ({
      find: jest.fn(() => ({
        toArray: jest.fn(() => Promise.resolve([])),
      })),
      findOne: jest.fn(() => Promise.resolve(null)),
      insertOne: jest.fn(() => Promise.resolve({ insertedId: 'mock-id' })),
      updateOne: jest.fn(() => Promise.resolve({ modifiedCount: 1 })),
    })),
  })),
  getCollection: jest.fn(() => Promise.resolve({
    find: jest.fn(() => ({
      toArray: jest.fn(() => Promise.resolve([])),
    })),
    findOne: jest.fn(() => Promise.resolve(null)),
  })),
  COLLECTIONS: {
    USERS: 'users',
    DOCTORS: 'doctors',
    PATIENTS: 'patients',
    APPOINTMENTS: 'appointments',
    SUBSCRIPTIONS: 'subscriptions',
    TRANSACTIONS: 'transactions',
    WITHDRAWAL_REQUESTS: 'withdrawal_requests',
    AUDIT_LOGS: 'audit_logs',
  },
}))

// Mock Mongoose
const mockObjectId = jest.fn();
const mockSchemaTypes = {
  ObjectId: mockObjectId,
  String: String,
  Number: Number,
  Boolean: Boolean,
  Date: Date,
  Array: Array,
  Mixed: Object,
};

const mockSchema = jest.fn().mockImplementation((definition, options) => {
  const schema = {
    definition,
    options,
    pre: jest.fn(),
    post: jest.fn(),
    virtual: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
    })),
    index: jest.fn(),
    methods: {},
    statics: {},
    Types: mockSchemaTypes,
  };

  // Store the call for test verification
  mockSchema.mock.calls.push([definition, options]);

  return schema;
});

mockSchema.Types = mockSchemaTypes;

const mockModel = jest.fn(() => ({
  find: jest.fn(() => ({
    exec: jest.fn(() => Promise.resolve([])),
  })),
  findOne: jest.fn(() => ({
    exec: jest.fn(() => Promise.resolve(null)),
  })),
  findById: jest.fn(() => ({
    exec: jest.fn(() => Promise.resolve(null)),
  })),
  create: jest.fn(() => Promise.resolve({ _id: 'mock-id' })),
  updateOne: jest.fn(() => Promise.resolve({ modifiedCount: 1 })),
  deleteOne: jest.fn(() => Promise.resolve({ deletedCount: 1 })),
  aggregate: jest.fn(() => Promise.resolve([])),
}));

jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(() => Promise.resolve()),
    disconnect: jest.fn(() => Promise.resolve()),
    connection: {
      readyState: 1,
      close: jest.fn(() => Promise.resolve()),
    },
    connections: [{ readyState: 1 }],
    model: mockModel,
    models: {},
    Schema: mockSchema,
  },
  Schema: mockSchema,
  connect: jest.fn(() => Promise.resolve()),
  disconnect: jest.fn(() => Promise.resolve()),
  connection: {
    readyState: 1,
    close: jest.fn(() => Promise.resolve()),
  },
  connections: [{ readyState: 1 }],
  model: mockModel,
  models: {},
}))

// Mock Vonage SDK
jest.mock('@vonage/server-sdk', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    video: {
      createSession: jest.fn(() => Promise.resolve({ sessionId: 'test-session-id' })),
      generateToken: jest.fn(() => 'test-token'),
    },
  })),
}))

// Framer-motion removed - using CSS animations for better performance

// Global test cleanup to prevent hanging
beforeEach(() => {
  jest.clearAllTimers()
})

afterEach(() => {
  jest.clearAllTimers()
  jest.clearAllMocks()
})

// Global cleanup for MongoDB connections
afterAll(async () => {
  // Close any open MongoDB connections
  const mongoose = require('mongoose')
  try {
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close()
    }
  } catch (error) {
    // Ignore connection close errors in tests
    console.warn('Warning: Could not close mongoose connection:', error.message)
  }

  // Clear all timers
  jest.clearAllTimers()

  // Force garbage collection if available
  if (global.gc) {
    global.gc()
  }
})

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock window.matchMedia (only in jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Mock scrollTo (only in jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: jest.fn(),
  })
}

// Suppress console errors in tests unless explicitly testing them
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: An update to') ||
       args[0].includes('act(...)'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
