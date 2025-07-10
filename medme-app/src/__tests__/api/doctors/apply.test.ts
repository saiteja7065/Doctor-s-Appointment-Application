import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/doctors/apply/route'

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

jest.mock('@/lib/models/Doctor', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}))

describe('/api/doctors/apply', () => {
  const mockAuth = require('@clerk/nextjs/server').auth
  const mockConnectToDatabase = require('@/lib/mongodb').connectToDatabase
  const mockUser = require('@/lib/models/User')
  const mockDoctor = require('@/lib/models/Doctor')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/doctors/apply', () => {
    const validApplicationData = {
      specialty: 'general_practice',
      licenseNumber: 'MD123456',
      credentialUrl: 'https://example.com/credentials.pdf',
      yearsOfExperience: 5,
      education: 'Harvard Medical School',
      bio: 'Experienced general practitioner',
    }

    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: JSON.stringify(validApplicationData),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for invalid request body', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })

      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: 'invalid json',
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request body')
    })

    it('should return 400 for missing required fields', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })

      const incompleteData = {
        specialty: 'general_practice',
        // Missing other required fields
      }

      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: JSON.stringify(incompleteData),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields')
    })

    it('should return demo response when database is not available', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: JSON.stringify(validApplicationData),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toContain('demo mode')
      expect(data.applicationId).toContain('demo_')
      expect(data.status).toBe('pending')
      expect(data.estimatedReviewTime).toBe('2-5 business days')
    })

    it('should return 404 if user not found', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(true)
      mockUser.findOne.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: JSON.stringify(validApplicationData),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('User not found')
    })

    it('should return 409 if doctor application already exists', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(true)
      mockUser.findOne.mockResolvedValue({ _id: 'user-id' })
      mockDoctor.findOne.mockResolvedValue({ _id: 'doctor-id' })

      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: JSON.stringify(validApplicationData),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toBe('Doctor application already exists')
    })

    it('should create doctor application successfully', async () => {
      const mockUserData = { _id: 'user-id', role: 'patient' }
      const mockDoctorData = { _id: 'doctor-id', verificationStatus: 'pending' }

      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(true)
      mockUser.findOne.mockResolvedValue(mockUserData)
      mockDoctor.findOne.mockResolvedValue(null)
      mockDoctor.create.mockResolvedValue(mockDoctorData)
      mockUser.findByIdAndUpdate.mockResolvedValue(mockUserData)

      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: JSON.stringify(validApplicationData),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe('Doctor application submitted successfully')
      expect(data.applicationId).toBe('doctor-id')
      expect(data.status).toBe('pending')
    })

    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(true)
      mockUser.findOne.mockRejectedValue(new Error('Database error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const request = new NextRequest('http://localhost:3000/api/doctors/apply', {
        method: 'POST',
        body: JSON.stringify(validApplicationData),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error submitting doctor application:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('GET /api/doctors/apply', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })

      const request = new NextRequest('http://localhost:3000/api/doctors/apply')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 503 when database is not available', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/doctors/apply')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('Database not available')
    })

    it('should return 404 if no application found', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(true)
      mockDoctor.findOne.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/doctors/apply')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('No application found')
    })

    it('should return application status successfully', async () => {
      const mockDoctorData = {
        _id: 'doctor-id',
        verificationStatus: 'pending',
        specialty: 'general_practice',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(true)
      mockDoctor.findOne.mockResolvedValue(mockDoctorData)

      const request = new NextRequest('http://localhost:3000/api/doctors/apply')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.applicationId).toBe('doctor-id')
      expect(data.status).toBe('pending')
      expect(data.specialty).toBe('general_practice')
      expect(data.submittedAt).toBeDefined()
      expect(data.lastUpdated).toBeDefined()
    })

    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValue({ userId: 'test-user-id' })
      mockConnectToDatabase.mockResolvedValue(true)
      mockDoctor.findOne.mockRejectedValue(new Error('Database error'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const request = new NextRequest('http://localhost:3000/api/doctors/apply')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error fetching doctor application:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })
})
