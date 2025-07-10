import { connectToDatabase } from '@/lib/mongodb'
import mongoose from 'mongoose'

// Mock mongoose
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    readyState: 1,
  },
  ConnectionStates: {
    connected: 1,
    connecting: 2,
    disconnected: 0,
  },
}))

describe('MongoDB Connection', () => {
  const mockConnect = mongoose.connect as jest.MockedFunction<typeof mongoose.connect>
  
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    process.env.MONGODB_URI = 'mongodb://localhost:27017/medme-test'
  })

  afterEach(() => {
    jest.resetModules()
  })

  describe('connectToDatabase', () => {
    it('should connect to database successfully', async () => {
      mockConnect.mockResolvedValueOnce(mongoose as any)
      
      const result = await connectToDatabase()
      
      expect(result).toBe(true)
      expect(mockConnect).toHaveBeenCalledWith(process.env.MONGODB_URI)
    })

    it('should return true if already connected', async () => {
      // Mock already connected state
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 1, // connected
        writable: true,
      })
      
      const result = await connectToDatabase()
      
      expect(result).toBe(true)
      expect(mockConnect).not.toHaveBeenCalled()
    })

    it('should handle connection errors gracefully', async () => {
      mockConnect.mockRejectedValueOnce(new Error('Connection failed'))
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const result = await connectToDatabase()
      
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'MongoDB connection error:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })

    it('should handle missing MONGODB_URI', async () => {
      delete process.env.MONGODB_URI
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const result = await connectToDatabase()
      
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'MongoDB connection error:',
        expect.any(Error)
      )
      
      consoleSpy.mockRestore()
    })

    it('should use correct connection options', async () => {
      mockConnect.mockResolvedValueOnce(mongoose as any)
      
      await connectToDatabase()
      
      expect(mockConnect).toHaveBeenCalledWith(
        process.env.MONGODB_URI,
        expect.objectContaining({
          bufferCommands: false,
        })
      )
    })

    it('should handle different connection states', async () => {
      // Test connecting state
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 2, // connecting
        writable: true,
      })
      
      mockConnect.mockResolvedValueOnce(mongoose as any)
      
      const result = await connectToDatabase()
      
      expect(result).toBe(true)
      expect(mockConnect).toHaveBeenCalled()
    })

    it('should handle disconnected state', async () => {
      // Test disconnected state
      Object.defineProperty(mongoose.connection, 'readyState', {
        value: 0, // disconnected
        writable: true,
      })
      
      mockConnect.mockResolvedValueOnce(mongoose as any)
      
      const result = await connectToDatabase()
      
      expect(result).toBe(true)
      expect(mockConnect).toHaveBeenCalled()
    })

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('connection timed out')
      timeoutError.name = 'MongoNetworkTimeoutError'
      mockConnect.mockRejectedValueOnce(timeoutError)
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const result = await connectToDatabase()
      
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'MongoDB connection error:',
        timeoutError
      )
      
      consoleSpy.mockRestore()
    })

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed')
      authError.name = 'MongoAuthenticationError'
      mockConnect.mockRejectedValueOnce(authError)
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      const result = await connectToDatabase()
      
      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        'MongoDB connection error:',
        authError
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Connection Configuration', () => {
    it('should use production URI in production environment', async () => {
      process.env.NODE_ENV = 'production'
      process.env.MONGODB_URI = 'mongodb+srv://prod:password@cluster.mongodb.net/medme'
      
      mockConnect.mockResolvedValueOnce(mongoose as any)
      
      await connectToDatabase()
      
      expect(mockConnect).toHaveBeenCalledWith(
        'mongodb+srv://prod:password@cluster.mongodb.net/medme',
        expect.any(Object)
      )
    })

    it('should use test URI in test environment', async () => {
      process.env.NODE_ENV = 'test'
      process.env.MONGODB_URI = 'mongodb://localhost:27017/medme-test'
      
      mockConnect.mockResolvedValueOnce(mongoose as any)
      
      await connectToDatabase()
      
      expect(mockConnect).toHaveBeenCalledWith(
        'mongodb://localhost:27017/medme-test',
        expect.any(Object)
      )
    })
  })
})
