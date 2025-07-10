import { NextRequest } from 'next/server'
import { GET, PUT } from '@/app/api/patients/profile/route'

// Mock dependencies
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/mongodb', () => ({
  connectToDatabase: jest.fn(),
}))

jest.mock('@/lib/models/User', () => ({
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}))

jest.mock('@/lib/models/Patient', () => ({
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  create: jest.fn(),
}))

describe('/api/patients/profile', () => {
  const mockAuth = require('@clerk/nextjs/server').auth
  const mockConnectToDatabase = require('@/lib/mongodb').connectToDatabase
  const mockUser = require('@/lib/models/User')
  const mockPatient = require('@/lib/models/Patient')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/patients/profile', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const request = new NextRequest('http://localhost:3000/api/patients/profile')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return default data when database is not available', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/patients/profile')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.creditBalance).toBe(2)
      expect(data.subscriptionPlan).toBe('free')
      expect(data.message).toContain('Database not configured')
    })

    it('should return 404 if user not found', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(true)
      mockUser.findOne.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/patients/profile')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 404 if patient profile not found', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(true)
      mockUser.findOne.mockResolvedValue({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      })
      mockPatient.findOne.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/patients/profile')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Patient profile not found')
    })

    it('should return patient profile successfully', async () => {
      const mockUserData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        dateOfBirth: new Date('1990-01-01'),
      }

      const mockPatientData = {
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'spouse',
          phoneNumber: '+1234567891',
        },
        medicalHistory: {
          allergies: ['peanuts'],
          medications: ['aspirin'],
          conditions: ['hypertension'],
          notes: 'No significant issues',
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

      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(true)
      mockUser.findOne.mockResolvedValue(mockUserData)
      mockPatient.findOne.mockResolvedValue(mockPatientData)

      const request = new NextRequest('http://localhost:3000/api/patients/profile')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.firstName).toBe('John')
      expect(data.lastName).toBe('Doe')
      expect(data.email).toBe('john@example.com')
      expect(data.emergencyContact.name).toBe('Jane Doe')
      expect(data.medicalHistory.allergies).toContain('peanuts')
      expect(data.preferences.preferredLanguage).toBe('en')
    })

    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(true)
      mockUser.findOne.mockRejectedValue(new Error('Database error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const request = new NextRequest('http://localhost:3000/api/patients/profile')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching patient profile:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('PUT /api/patients/profile', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const request = new NextRequest('http://localhost:3000/api/patients/profile', {
        method: 'PUT',
        body: JSON.stringify({}),
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid request body', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })

      const request = new NextRequest('http://localhost:3000/api/patients/profile', {
        method: 'PUT',
        body: 'invalid json',
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request body')
    })

    it('should update patient profile successfully', async () => {
      const updateData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'spouse',
          phoneNumber: '+1234567891',
        },
      }

      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(true)
      mockUser.findByIdAndUpdate.mockResolvedValue({ _id: 'user-id' })
      mockPatient.findByIdAndUpdate.mockResolvedValue({ _id: 'patient-id' })

      const request = new NextRequest('http://localhost:3000/api/patients/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Profile updated successfully')
    })

    it('should handle database connection failure', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/patients/profile', {
        method: 'PUT',
        body: JSON.stringify({}),
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('Database not available')
    })

    it('should handle update errors gracefully', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(true)
      mockUser.findByIdAndUpdate.mockRejectedValue(new Error('Update failed'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const request = new NextRequest('http://localhost:3000/api/patients/profile', {
        method: 'PUT',
        body: JSON.stringify({}),
      })
      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error updating patient profile:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })
})
