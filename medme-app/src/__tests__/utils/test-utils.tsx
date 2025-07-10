import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ClerkProvider } from '@clerk/nextjs'

// Mock data generators
export const mockUser = {
  id: 'test-user-id',
  clerkId: 'test-clerk-id',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  role: 'patient',
  status: 'active',
  phoneNumber: '+1234567890',
  dateOfBirth: new Date('1990-01-01'),
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockPatient = {
  _id: 'test-patient-id',
  userId: 'test-user-id',
  clerkId: 'test-clerk-id',
  creditBalance: 2,
  subscriptionPlan: 'free',
  subscriptionStatus: 'inactive',
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
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockDoctor = {
  _id: 'test-doctor-id',
  userId: 'test-user-id',
  clerkId: 'test-clerk-id',
  verificationStatus: 'pending',
  specialty: 'general_practice',
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
  createdAt: new Date(),
  updatedAt: new Date(),
}

export const mockAppointment = {
  id: 'test-appointment-id',
  patientId: 'test-patient-id',
  doctorId: 'test-doctor-id',
  patientName: 'John Doe',
  patientEmail: 'john.doe@example.com',
  appointmentDate: new Date().toISOString().split('T')[0],
  appointmentTime: '10:00',
  duration: 30,
  status: 'scheduled',
  topic: 'General Consultation',
  description: 'Regular checkup',
  consultationType: 'video',
  consultationFee: 2,
  meetingLink: 'https://meet.medme.com/room/test123',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

// Custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClerkProvider publishableKey="pk_test_test">
      {children}
    </ClerkProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Helper functions for testing
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0))

export const mockFetch = (data: any, ok = true) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok,
      status: ok ? 200 : 400,
      json: () => Promise.resolve(data),
    })
  ) as jest.Mock
}

export const mockNextRouter = (router: Partial<any> = {}) => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    ...router,
  }

  jest.doMock('next/navigation', () => ({
    useRouter: () => mockRouter,
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => mockRouter.pathname,
  }))

  return mockRouter
}

// Database test helpers
export const mockDatabaseConnection = (connected = true) => {
  const mockConnect = jest.fn(() => Promise.resolve(connected))
  jest.doMock('@/lib/mongodb', () => ({
    connectToDatabase: mockConnect,
    default: mockConnect,
  }))
  return mockConnect
}

// Auth test helpers
export const mockAuthenticatedUser = (user = mockUser) => {
  jest.doMock('@clerk/nextjs', () => ({
    useAuth: () => ({
      userId: user.clerkId,
      isSignedIn: true,
      isLoaded: true,
    }),
    useUser: () => ({
      user: {
        id: user.clerkId,
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddresses: [{ emailAddress: user.email }],
      },
      isLoaded: true,
    }),
  }))
}

export const mockUnauthenticatedUser = () => {
  jest.doMock('@clerk/nextjs', () => ({
    useAuth: () => ({
      userId: null,
      isSignedIn: false,
      isLoaded: true,
    }),
    useUser: () => ({
      user: null,
      isLoaded: true,
    }),
  }))
}

// Form testing helpers
export const fillForm = async (form: HTMLFormElement, data: Record<string, string>) => {
  const { fireEvent } = await import('@testing-library/react')
  
  Object.entries(data).forEach(([name, value]) => {
    const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement
    if (input) {
      fireEvent.change(input, { target: { value } })
    }
  })
}

// API testing helpers
export const mockApiResponse = (data: any, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
})

export const mockApiError = (message = 'API Error', status = 500) => ({
  ok: false,
  status,
  json: () => Promise.resolve({ error: message }),
  text: () => Promise.resolve(JSON.stringify({ error: message })),
})
