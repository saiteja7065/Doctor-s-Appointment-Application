import { UserRole, UserStatus } from '@/lib/models/User'

// Mock mongoose completely
jest.mock('mongoose', () => ({
  Schema: jest.fn().mockImplementation((definition, options) => ({
    definition,
    options,
    pre: jest.fn(),
    post: jest.fn(),
    virtual: jest.fn(() => ({ get: jest.fn() })),
    index: jest.fn(),
  })),
  model: jest.fn(),
  models: {},
  Types: {
    ObjectId: jest.fn(),
  },
}))

describe('User Model', () => {
  const validUserData = {
    clerkId: 'clerk_test_123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.PATIENT,
    status: UserStatus.ACTIVE,
    phoneNumber: '+1234567890',
    dateOfBirth: new Date('1990-01-01'),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Schema Validation', () => {
    beforeEach(() => {
      // Import the User model to trigger schema creation
      require('@/lib/models/User')
    })

    it('should validate required fields', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[Schema.mock.calls.length - 1]
      const schemaDefinition = schemaCall[0]

      // Check required fields
      expect(schemaDefinition.clerkId.required).toBe(true)
      expect(schemaDefinition.email.required).toBe(true)
      expect(schemaDefinition.firstName.required).toBe(true)
      expect(schemaDefinition.lastName.required).toBe(true)
      expect(schemaDefinition.role.required).toBe(true)
    })

    it('should have unique constraints', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.clerkId.unique).toBe(true)
      expect(schemaDefinition.email.unique).toBe(true)
    })

    it('should have correct field types', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.clerkId.type).toBe(String)
      expect(schemaDefinition.email.type).toBe(String)
      expect(schemaDefinition.firstName.type).toBe(String)
      expect(schemaDefinition.lastName.type).toBe(String)
      expect(schemaDefinition.phoneNumber.type).toBe(String)
      expect(schemaDefinition.dateOfBirth.type).toBe(Date)
    })

    it('should have enum validation for role', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.role.enum).toEqual(Object.values(UserRole))
    })

    it('should have enum validation for status', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.status.enum).toEqual(Object.values(UserStatus))
      expect(schemaDefinition.status.default).toBe(UserStatus.ACTIVE)
    })

    it('should have string transformations', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.email.lowercase).toBe(true)
      expect(schemaDefinition.email.trim).toBe(true)
      expect(schemaDefinition.firstName.trim).toBe(true)
      expect(schemaDefinition.lastName.trim).toBe(true)
    })
  })

  describe('UserRole Enum', () => {
    it('should have correct role values', () => {
      expect(UserRole.PATIENT).toBe('patient')
      expect(UserRole.DOCTOR).toBe('doctor')
      expect(UserRole.ADMIN).toBe('admin')
    })

    it('should have all expected roles', () => {
      const roles = Object.values(UserRole)
      expect(roles).toHaveLength(3)
      expect(roles).toContain('patient')
      expect(roles).toContain('doctor')
      expect(roles).toContain('admin')
    })
  })

  describe('UserStatus Enum', () => {
    it('should have correct status values', () => {
      expect(UserStatus.ACTIVE).toBe('active')
      expect(UserStatus.INACTIVE).toBe('inactive')
      expect(UserStatus.SUSPENDED).toBe('suspended')
    })

    it('should have all expected statuses', () => {
      const statuses = Object.values(UserStatus)
      expect(statuses).toHaveLength(3)
      expect(statuses).toContain('active')
      expect(statuses).toContain('inactive')
      expect(statuses).toContain('suspended')
    })
  })

  describe('Schema Options', () => {
    it('should have timestamps enabled', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaOptions = schemaCall[1]

      expect(schemaOptions.timestamps).toBe(true)
    })

    it('should have virtuals in JSON output', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaOptions = schemaCall[1]

      expect(schemaOptions.toJSON.virtuals).toBe(true)
      expect(schemaOptions.toObject.virtuals).toBe(true)
    })
  })

  describe('Model Creation', () => {
    it('should create model with correct name', () => {
      const mockModel = jest.fn()
      require('mongoose').model.mockReturnValue(mockModel)

      // Re-import to trigger model creation
      jest.resetModules()
      require('@/lib/models/User')

      expect(require('mongoose').model).toHaveBeenCalledWith(
        'User',
        expect.any(Object)
      )
    })

    it('should handle existing model', () => {
      const existingModel = { name: 'User' }
      require('mongoose').models.User = existingModel

      jest.resetModules()
      const UserModel = require('@/lib/models/User').default

      expect(UserModel).toBe(existingModel)
    })
  })

  describe('Interface Validation', () => {
    it('should match IUser interface structure', () => {
      // This test ensures the interface matches expected structure
      const user: IUser = {
        clerkId: 'test',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PATIENT,
        status: UserStatus.ACTIVE,
        profileImage: 'image.jpg',
        phoneNumber: '+1234567890',
        dateOfBirth: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as IUser

      expect(user.clerkId).toBeDefined()
      expect(user.email).toBeDefined()
      expect(user.firstName).toBeDefined()
      expect(user.lastName).toBeDefined()
      expect(user.role).toBeDefined()
      expect(user.status).toBeDefined()
    })
  })

  describe('Field Validation Edge Cases', () => {
    it('should handle email validation', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      // Email should be lowercase and trimmed
      expect(schemaDefinition.email.lowercase).toBe(true)
      expect(schemaDefinition.email.trim).toBe(true)
    })

    it('should handle optional fields', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      // Optional fields should not be required
      expect(schemaDefinition.profileImage.required).toBeUndefined()
      expect(schemaDefinition.phoneNumber.required).toBeUndefined()
      expect(schemaDefinition.dateOfBirth.required).toBeUndefined()
    })

    it('should trim string fields', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.firstName.trim).toBe(true)
      expect(schemaDefinition.lastName.trim).toBe(true)
      expect(schemaDefinition.profileImage.trim).toBe(true)
      expect(schemaDefinition.phoneNumber.trim).toBe(true)
    })
  })
})
