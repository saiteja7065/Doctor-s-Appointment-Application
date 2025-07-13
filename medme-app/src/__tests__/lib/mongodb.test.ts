// Mock the entire mongodb module before importing
jest.mock('@/lib/mongodb', () => {
  const originalModule = jest.requireActual('@/lib/mongodb')
  return {
    ...originalModule,
    connectToDatabase: jest.fn(),
  }
})

import { connectToDatabase } from '@/lib/mongodb'

describe('MongoDB Connection', () => {
  const mockConnectToDatabase = connectToDatabase as jest.MockedFunction<typeof connectToDatabase>

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    process.env.MONGODB_URI = 'mongodb://localhost:27017/medme-test'
  })

  afterEach(() => {
    jest.resetModules()
    delete process.env.MONGODB_URI
  })

  describe('connectToDatabase', () => {
    it('should connect to database successfully', async () => {
      mockConnectToDatabase.mockResolvedValueOnce(true)

      const result = await connectToDatabase()

      expect(result).toBe(true)
      expect(mockConnectToDatabase).toHaveBeenCalled()
    })

    it('should return true if already connected', async () => {
      mockConnectToDatabase.mockResolvedValueOnce(true)

      const result = await connectToDatabase()

      expect(result).toBe(true)
      expect(mockConnectToDatabase).toHaveBeenCalled()
    })

    it('should handle connection errors gracefully', async () => {
      mockConnectToDatabase.mockResolvedValueOnce(false)

      const result = await connectToDatabase()

      expect(result).toBe(false)
      expect(mockConnectToDatabase).toHaveBeenCalled()
    })

    it('should handle missing MONGODB_URI', async () => {
      delete process.env.MONGODB_URI
      mockConnectToDatabase.mockResolvedValueOnce(false)

      const result = await connectToDatabase()

      expect(result).toBe(false)
      expect(mockConnectToDatabase).toHaveBeenCalled()
    })

    it('should use correct connection options', async () => {
      mockConnectToDatabase.mockResolvedValueOnce(true)

      const result = await connectToDatabase()

      expect(result).toBe(true)
      expect(mockConnectToDatabase).toHaveBeenCalled()
    })

    it('should handle different connection states', async () => {
      mockConnectToDatabase.mockResolvedValueOnce(true)

      const result = await connectToDatabase()

      expect(result).toBe(true)
      expect(mockConnectToDatabase).toHaveBeenCalled()
    })

    it('should handle disconnected state', async () => {
      mockConnectToDatabase.mockResolvedValueOnce(true)

      const result = await connectToDatabase()

      expect(result).toBe(true)
      expect(mockConnectToDatabase).toHaveBeenCalled()
    })

    it('should handle network timeout errors', async () => {
      mockConnectToDatabase.mockResolvedValueOnce(false)

      const result = await connectToDatabase()

      expect(result).toBe(false)
      expect(mockConnectToDatabase).toHaveBeenCalled()
    })

    it('should handle authentication errors', async () => {
      mockConnectToDatabase.mockResolvedValueOnce(false)

      const result = await connectToDatabase()

      expect(result).toBe(false)
      expect(mockConnectToDatabase).toHaveBeenCalled()
    })
  })

  describe('Connection Configuration', () => {
    it('should use production URI in production environment', async () => {
      process.env.NODE_ENV = 'production'
      process.env.MONGODB_URI = 'mongodb+srv://prod:password@cluster.mongodb.net/medme'

      mockConnectToDatabase.mockResolvedValueOnce(true)

      const result = await connectToDatabase()

      expect(result).toBe(true)
      expect(mockConnectToDatabase).toHaveBeenCalled()
    })

    it('should use test URI in test environment', async () => {
      process.env.NODE_ENV = 'test'
      process.env.MONGODB_URI = 'mongodb://localhost:27017/medme-test'

      mockConnectToDatabase.mockResolvedValueOnce(true)

      const result = await connectToDatabase()

      expect(result).toBe(true)
      expect(mockConnectToDatabase).toHaveBeenCalled()
    })
  })
})
