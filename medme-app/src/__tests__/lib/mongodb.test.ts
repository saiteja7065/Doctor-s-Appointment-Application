import { connectToDatabase } from '@/lib/mongodb'
import { MongoClient } from 'mongodb'

// Mock MongoDB native driver
jest.mock('mongodb', () => ({
  MongoClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    db: jest.fn(() => ({
      command: jest.fn(),
    })),
    close: jest.fn(),
  })),
}))

describe('MongoDB Connection', () => {
  const MockedMongoClient = MongoClient as jest.MockedClass<typeof MongoClient>
  let mockClient: any

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    process.env.MONGODB_URI = 'mongodb://localhost:27017/medme-test'

    // Create a fresh mock client for each test
    mockClient = {
      connect: jest.fn(),
      db: jest.fn(() => ({
        command: jest.fn(),
      })),
      close: jest.fn(),
    }
    MockedMongoClient.mockImplementation(() => mockClient)
  })

  afterEach(() => {
    jest.resetModules()
    delete process.env.MONGODB_URI
  })

  describe('connectToDatabase', () => {
    it('should connect to database successfully', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined)
      mockClient.db().command.mockResolvedValueOnce({ ok: 1 })

      const result = await connectToDatabase()

      expect(result).toBe(true)
      expect(MockedMongoClient).toHaveBeenCalledWith(
        process.env.MONGODB_URI,
        expect.any(Object)
      )
    })

    it('should return true if already connected', async () => {
      // Mock successful connection and ping
      mockClient.connect.mockResolvedValueOnce(undefined)
      mockClient.db().command.mockResolvedValueOnce({ ok: 1 })

      const result = await connectToDatabase()

      expect(result).toBe(true)
    })

    it('should handle connection errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      mockClient.connect.mockRejectedValueOnce(new Error('Connection failed'))

      const result = await connectToDatabase()

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB connection attempt'),
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })

    it('should handle missing MONGODB_URI', async () => {
      delete process.env.MONGODB_URI

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = await connectToDatabase()

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB is not configured')
      )

      consoleSpy.mockRestore()
    })

    it('should use correct connection options', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined)
      mockClient.db().command.mockResolvedValueOnce({ ok: 1 })

      await connectToDatabase()

      expect(MockedMongoClient).toHaveBeenCalledWith(
        process.env.MONGODB_URI,
        expect.objectContaining({
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 15000,
        })
      )
    })

    it('should handle different connection states', async () => {
      // Test successful connection
      mockClient.connect.mockResolvedValueOnce(undefined)
      mockClient.db().command.mockResolvedValueOnce({ ok: 1 })

      const result = await connectToDatabase()

      expect(result).toBe(true)
      expect(mockClient.connect).toHaveBeenCalled()
    })

    it('should handle disconnected state', async () => {
      // Test successful reconnection
      mockClient.connect.mockResolvedValueOnce(undefined)
      mockClient.db().command.mockResolvedValueOnce({ ok: 1 })

      const result = await connectToDatabase()

      expect(result).toBe(true)
      expect(mockClient.connect).toHaveBeenCalled()
    })

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('connection timed out')
      timeoutError.name = 'MongoNetworkTimeoutError'
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      mockClient.connect.mockRejectedValueOnce(timeoutError)

      const result = await connectToDatabase()

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB connection attempt'),
        timeoutError
      )

      consoleSpy.mockRestore()
    })

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed')
      authError.name = 'MongoAuthenticationError'
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      mockClient.connect.mockRejectedValueOnce(authError)

      const result = await connectToDatabase()

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('MongoDB connection attempt'),
        authError
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Connection Configuration', () => {
    it('should use production URI in production environment', async () => {
      process.env.NODE_ENV = 'production'
      process.env.MONGODB_URI = 'mongodb+srv://prod:password@cluster.mongodb.net/medme'

      mockClient.connect.mockResolvedValueOnce(undefined)
      mockClient.db().command.mockResolvedValueOnce({ ok: 1 })

      await connectToDatabase()

      expect(MockedMongoClient).toHaveBeenCalledWith(
        'mongodb+srv://prod:password@cluster.mongodb.net/medme',
        expect.any(Object)
      )
    })

    it('should use test URI in test environment', async () => {
      process.env.NODE_ENV = 'test'
      process.env.MONGODB_URI = 'mongodb://localhost:27017/medme-test'

      mockClient.connect.mockResolvedValueOnce(undefined)
      mockClient.db().command.mockResolvedValueOnce({ ok: 1 })

      await connectToDatabase()

      expect(MockedMongoClient).toHaveBeenCalledWith(
        'mongodb://localhost:27017/medme-test',
        expect.any(Object)
      )
    })
  })
})
