import mongoose from 'mongoose'
import Patient, { IPatient } from '@/lib/models/Patient'

// Mock mongoose
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose')
  return {
    ...actualMongoose,
    model: jest.fn(),
    Schema: jest.fn().mockImplementation(() => ({
      pre: jest.fn(),
      post: jest.fn(),
      virtual: jest.fn(() => ({ get: jest.fn() })),
      index: jest.fn(),
    })),
    models: {},
    Types: {
      ObjectId: actualMongoose.Types.ObjectId,
    },
  }
})

describe('Patient Model', () => {
  const validPatientData = {
    userId: new mongoose.Types.ObjectId(),
    clerkId: 'clerk_test_123',
    creditBalance: 2,
    subscriptionPlan: 'free',
    subscriptionStatus: 'inactive' as const,
    totalAppointments: 0,
    totalSpent: 0,
    emergencyContact: {
      name: 'Jane Doe',
      relationship: 'spouse',
      phoneNumber: '+1234567891',
    },
    medicalHistory: {
      allergies: ['peanuts'],
      medications: ['aspirin'],
      conditions: ['hypertension'],
      notes: 'No significant medical history',
    },
    preferences: {
      preferredLanguage: 'en',
      timeZone: 'UTC',
      notificationSettings: {
        email: true,
        sms: false,
        push: true,
      },
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Schema Validation', () => {
    it('should validate required fields', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.userId.required).toBe(true)
      expect(schemaDefinition.clerkId.required).toBe(true)
      expect(schemaDefinition.userId.unique).toBe(true)
      expect(schemaDefinition.clerkId.unique).toBe(true)
    })

    it('should have correct field types', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.userId.type).toBe(Schema.Types.ObjectId)
      expect(schemaDefinition.clerkId.type).toBe(String)
      expect(schemaDefinition.creditBalance.type).toBe(Number)
      expect(schemaDefinition.totalAppointments.type).toBe(Number)
      expect(schemaDefinition.totalSpent.type).toBe(Number)
    })

    it('should have correct default values', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.creditBalance.default).toBe(2)
      expect(schemaDefinition.subscriptionPlan.default).toBe('free')
      expect(schemaDefinition.subscriptionStatus.default).toBe('inactive')
      expect(schemaDefinition.totalAppointments.default).toBe(0)
      expect(schemaDefinition.totalSpent.default).toBe(0)
    })

    it('should have minimum value constraints', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.creditBalance.min).toBe(0)
      expect(schemaDefinition.totalAppointments.min).toBe(0)
      expect(schemaDefinition.totalSpent.min).toBe(0)
    })

    it('should have enum validation for subscription fields', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.subscriptionPlan.enum).toEqual([
        'free', 'basic', 'standard', 'premium'
      ])
      expect(schemaDefinition.subscriptionStatus.enum).toEqual([
        'active', 'inactive', 'cancelled', 'expired'
      ])
    })

    it('should have reference to User model', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.userId.ref).toBe('User')
    })
  })

  describe('Nested Schema Validation', () => {
    it('should validate emergency contact structure', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      const emergencyContact = schemaDefinition.emergencyContact
      expect(emergencyContact.name.type).toBe(String)
      expect(emergencyContact.relationship.type).toBe(String)
      expect(emergencyContact.phoneNumber.type).toBe(String)
    })

    it('should validate medical history structure', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      const medicalHistory = schemaDefinition.medicalHistory
      expect(medicalHistory.allergies.type).toEqual([String])
      expect(medicalHistory.medications.type).toEqual([String])
      expect(medicalHistory.conditions.type).toEqual([String])
      expect(medicalHistory.notes.type).toBe(String)
    })

    it('should validate preferences structure', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      const preferences = schemaDefinition.preferences
      expect(preferences.preferredLanguage.type).toBe(String)
      expect(preferences.timeZone.type).toBe(String)
      
      const notificationSettings = preferences.notificationSettings
      expect(notificationSettings.email.type).toBe(Boolean)
      expect(notificationSettings.sms.type).toBe(Boolean)
      expect(notificationSettings.push.type).toBe(Boolean)
    })

    it('should have default values for notification settings', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      const notificationSettings = schemaDefinition.preferences.notificationSettings
      expect(notificationSettings.email.default).toBe(true)
      expect(notificationSettings.sms.default).toBe(false)
      expect(notificationSettings.push.default).toBe(true)
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

      jest.resetModules()
      require('@/lib/models/Patient')

      expect(require('mongoose').model).toHaveBeenCalledWith(
        'Patient',
        expect.any(Object)
      )
    })

    it('should handle existing model', () => {
      const existingModel = { name: 'Patient' }
      require('mongoose').models.Patient = existingModel

      jest.resetModules()
      const PatientModel = require('@/lib/models/Patient').default

      expect(PatientModel).toBe(existingModel)
    })
  })

  describe('Interface Validation', () => {
    it('should match IPatient interface structure', () => {
      const patient: IPatient = {
        userId: new mongoose.Types.ObjectId(),
        clerkId: 'test',
        creditBalance: 2,
        subscriptionPlan: 'free',
        subscriptionStatus: 'inactive',
        totalAppointments: 0,
        totalSpent: 0,
        emergencyContact: {
          name: 'Test',
          relationship: 'spouse',
          phoneNumber: '+1234567890',
        },
        medicalHistory: {
          allergies: [],
          medications: [],
          conditions: [],
          notes: '',
        },
        preferences: {
          preferredLanguage: 'en',
          timeZone: 'UTC',
          notificationSettings: {
            email: true,
            sms: false,
            push: true,
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as IPatient

      expect(patient.userId).toBeDefined()
      expect(patient.clerkId).toBeDefined()
      expect(patient.creditBalance).toBeDefined()
      expect(patient.subscriptionStatus).toBeDefined()
    })
  })

  describe('Business Logic Validation', () => {
    it('should validate subscription plan options', () => {
      const validPlans = ['free', 'basic', 'standard', 'premium']
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.subscriptionPlan.enum).toEqual(validPlans)
    })

    it('should validate subscription status options', () => {
      const validStatuses = ['active', 'inactive', 'cancelled', 'expired']
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.subscriptionStatus.enum).toEqual(validStatuses)
    })

    it('should ensure credit balance cannot be negative', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.creditBalance.min).toBe(0)
    })

    it('should ensure appointment counts cannot be negative', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.totalAppointments.min).toBe(0)
      expect(schemaDefinition.totalSpent.min).toBe(0)
    })
  })
})
