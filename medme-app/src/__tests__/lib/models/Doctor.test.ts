import mongoose from 'mongoose'
import Doctor, { IDoctor, DoctorVerificationStatus, MedicalSpecialty } from '@/lib/models/Doctor'

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

describe('Doctor Model', () => {
  const validDoctorData = {
    userId: new mongoose.Types.ObjectId(),
    clerkId: 'clerk_test_123',
    verificationStatus: DoctorVerificationStatus.PENDING,
    specialty: MedicalSpecialty.GENERAL_PRACTICE,
    licenseNumber: 'MD123456',
    credentialUrl: 'https://example.com/credentials.pdf',
    yearsOfExperience: 5,
    education: 'Harvard Medical School',
    bio: 'Experienced general practitioner',
    consultationFee: 100,
    availability: {
      monday: { start: '09:00', end: '17:00', available: true },
      tuesday: { start: '09:00', end: '17:00', available: true },
      wednesday: { start: '09:00', end: '17:00', available: true },
      thursday: { start: '09:00', end: '17:00', available: true },
      friday: { start: '09:00', end: '17:00', available: true },
      saturday: { start: '09:00', end: '13:00', available: false },
      sunday: { start: '09:00', end: '13:00', available: false },
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
      expect(schemaDefinition.specialty.required).toBe(true)
      expect(schemaDefinition.licenseNumber.required).toBe(true)
      expect(schemaDefinition.credentialUrl.required).toBe(true)
      expect(schemaDefinition.yearsOfExperience.required).toBe(true)
    })

    it('should have unique constraints', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.userId.unique).toBe(true)
      expect(schemaDefinition.clerkId.unique).toBe(true)
    })

    it('should have indexes', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.userId.index).toBe(true)
      expect(schemaDefinition.clerkId.index).toBe(true)
    })

    it('should have correct field types', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.userId.type).toBe(Schema.Types.ObjectId)
      expect(schemaDefinition.clerkId.type).toBe(String)
      expect(schemaDefinition.licenseNumber.type).toBe(String)
      expect(schemaDefinition.credentialUrl.type).toBe(String)
      expect(schemaDefinition.yearsOfExperience.type).toBe(Number)
      expect(schemaDefinition.consultationFee.type).toBe(Number)
    })

    it('should have default values', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.verificationStatus.default).toBe(DoctorVerificationStatus.PENDING)
      expect(schemaDefinition.consultationFee.default).toBe(100)
      expect(schemaDefinition.rating.default).toBe(0)
      expect(schemaDefinition.totalAppointments.default).toBe(0)
      expect(schemaDefinition.totalEarnings.default).toBe(0)
    })

    it('should have minimum value constraints', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.yearsOfExperience.min).toBe(0)
      expect(schemaDefinition.consultationFee.min).toBe(0)
      expect(schemaDefinition.rating.min).toBe(0)
      expect(schemaDefinition.rating.max).toBe(5)
      expect(schemaDefinition.totalAppointments.min).toBe(0)
      expect(schemaDefinition.totalEarnings.min).toBe(0)
    })

    it('should have string trimming', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.licenseNumber.trim).toBe(true)
      expect(schemaDefinition.credentialUrl.trim).toBe(true)
    })
  })

  describe('Enum Validation', () => {
    it('should validate verification status enum', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.verificationStatus.enum).toEqual(
        Object.values(DoctorVerificationStatus)
      )
    })

    it('should validate medical specialty enum', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.specialty.enum).toEqual(
        Object.values(MedicalSpecialty)
      )
    })

    it('should have correct verification status values', () => {
      expect(DoctorVerificationStatus.PENDING).toBe('pending')
      expect(DoctorVerificationStatus.APPROVED).toBe('approved')
      expect(DoctorVerificationStatus.REJECTED).toBe('rejected')
    })

    it('should have correct medical specialty values', () => {
      expect(MedicalSpecialty.GENERAL_PRACTICE).toBe('general_practice')
      expect(MedicalSpecialty.CARDIOLOGY).toBe('cardiology')
      expect(MedicalSpecialty.DERMATOLOGY).toBe('dermatology')
      expect(MedicalSpecialty.PEDIATRICS).toBe('pediatrics')
      expect(MedicalSpecialty.PSYCHIATRY).toBe('psychiatry')
    })
  })

  describe('Availability Schema', () => {
    it('should validate availability structure', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      const availability = schemaDefinition.availability
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      
      days.forEach(day => {
        expect(availability[day].start.type).toBe(String)
        expect(availability[day].end.type).toBe(String)
        expect(availability[day].available.type).toBe(Boolean)
        expect(availability[day].available.default).toBe(true)
      })
    })

    it('should have default availability times', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      const availability = schemaDefinition.availability
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      const weekends = ['saturday', 'sunday']
      
      weekdays.forEach(day => {
        expect(availability[day].start.default).toBe('09:00')
        expect(availability[day].end.default).toBe('17:00')
      })
      
      weekends.forEach(day => {
        expect(availability[day].start.default).toBe('09:00')
        expect(availability[day].end.default).toBe('13:00')
        expect(availability[day].available.default).toBe(false)
      })
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
      require('@/lib/models/Doctor')

      expect(require('mongoose').model).toHaveBeenCalledWith(
        'Doctor',
        expect.any(Object)
      )
    })

    it('should handle existing model', () => {
      const existingModel = { name: 'Doctor' }
      require('mongoose').models.Doctor = existingModel

      jest.resetModules()
      const DoctorModel = require('@/lib/models/Doctor').default

      expect(DoctorModel).toBe(existingModel)
    })
  })

  describe('Interface Validation', () => {
    it('should match IDoctor interface structure', () => {
      const doctor: IDoctor = {
        userId: new mongoose.Types.ObjectId(),
        clerkId: 'test',
        verificationStatus: DoctorVerificationStatus.PENDING,
        specialty: MedicalSpecialty.GENERAL_PRACTICE,
        licenseNumber: 'MD123456',
        credentialUrl: 'https://example.com/credentials.pdf',
        yearsOfExperience: 5,
        education: 'Medical School',
        bio: 'Doctor bio',
        consultationFee: 100,
        rating: 4.5,
        totalAppointments: 10,
        totalEarnings: 1000,
        availability: {
          monday: { start: '09:00', end: '17:00', available: true },
          tuesday: { start: '09:00', end: '17:00', available: true },
          wednesday: { start: '09:00', end: '17:00', available: true },
          thursday: { start: '09:00', end: '17:00', available: true },
          friday: { start: '09:00', end: '17:00', available: true },
          saturday: { start: '09:00', end: '13:00', available: false },
          sunday: { start: '09:00', end: '13:00', available: false },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as IDoctor

      expect(doctor.userId).toBeDefined()
      expect(doctor.clerkId).toBeDefined()
      expect(doctor.verificationStatus).toBeDefined()
      expect(doctor.specialty).toBeDefined()
    })
  })

  describe('Business Logic Validation', () => {
    it('should validate consultation fee range', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.consultationFee.min).toBe(0)
      expect(schemaDefinition.consultationFee.default).toBe(100)
    })

    it('should validate rating range', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.rating.min).toBe(0)
      expect(schemaDefinition.rating.max).toBe(5)
    })

    it('should validate years of experience', () => {
      const Schema = require('mongoose').Schema
      const schemaCall = Schema.mock.calls[0]
      const schemaDefinition = schemaCall[0]

      expect(schemaDefinition.yearsOfExperience.min).toBe(0)
    })
  })
})
