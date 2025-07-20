/**
 * @jest-environment node
 */
import { GET } from '@/app/api/doctors/search/route.fixed';

// Mock dependencies
jest.mock('@/lib/mongodb', () => ({
  connectToMongoose: jest.fn(),
}));

jest.mock('@/lib/models/Doctor', () => ({
  Doctor: {
    aggregate: jest.fn(),
    distinct: jest.fn(),
  },
  MedicalSpecialty: {
    CARDIOLOGY: 'cardiology',
    DERMATOLOGY: 'dermatology',
    GENERAL_PRACTICE: 'general_practice',
    PEDIATRICS: 'pediatrics',
    NEUROLOGY: 'neurology',
    ONCOLOGY: 'oncology',
    PSYCHIATRY: 'psychiatry',
    ORTHOPEDICS: 'orthopedics',
    GYNECOLOGY: 'gynecology',
    ENDOCRINOLOGY: 'endocrinology',
    GASTROENTEROLOGY: 'gastroenterology',
    PULMONOLOGY: 'pulmonology',
    RHEUMATOLOGY: 'rheumatology',
    UROLOGY: 'urology',
    OPHTHALMOLOGY: 'ophthalmology',
    ENT: 'ent',
    RADIOLOGY: 'radiology',
    ANESTHESIOLOGY: 'anesthesiology',
    EMERGENCY_MEDICINE: 'emergency_medicine',
    FAMILY_MEDICINE: 'family_medicine',
  },
  DoctorVerificationStatus: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended',
  },
}));

const { connectToMongoose } = require('@/lib/mongodb');
const { Doctor } = require('@/lib/models/Doctor');

describe('/api/doctors/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/doctors/search', () => {
    it('should return demo data when database is not connected', async () => {
      // Mock database connection failure
      connectToMongoose.mockResolvedValue(false);

      const request = new Request('http://localhost:3000/api/doctors/search');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doctors).toBeDefined();
      expect(Array.isArray(data.doctors)).toBe(true);
      expect(data.pagination).toBeDefined();
      expect(data.filters).toBeDefined();
      expect(data.isDemo).toBe(true);
    });

    it('should handle database connection errors gracefully', async () => {
      // Mock database connection error
      connectToMongoose.mockRejectedValue(new Error('Connection error'));

      const request = new Request('http://localhost:3000/api/doctors/search');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doctors).toBeDefined();
      expect(Array.isArray(data.doctors)).toBe(true);
      expect(data.isDemo).toBe(true);
    });

    it('should handle database query errors gracefully', async () => {
      // Mock database connection success but query failure
      connectToMongoose.mockResolvedValue(true);
      Doctor.aggregate.mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost:3000/api/doctors/search');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isDemo).toBe(true);
      expect(data.error).toBeDefined();
      expect(data.doctors).toBeDefined();
      expect(Array.isArray(data.doctors)).toBe(true);
    });

    it('should return correct demo data structure', async () => {
      connectToMongoose.mockResolvedValue(false);

      const request = new Request('http://localhost:3000/api/doctors/search');
      const response = await GET(request);
      const data = await response.json();

      expect(data.doctors[0]).toHaveProperty('id');
      expect(data.doctors[0]).toHaveProperty('name');
      expect(data.doctors[0]).toHaveProperty('specialty');
      expect(data.doctors[0]).toHaveProperty('formattedSpecialty');
      expect(data.doctors[0]).toHaveProperty('rating');
      expect(data.doctors[0]).toHaveProperty('totalRatings');
      expect(data.doctors[0]).toHaveProperty('experience');
      expect(data.doctors[0]).toHaveProperty('consultationFee');
      expect(data.doctors[0]).toHaveProperty('languages');
      expect(data.doctors[0]).toHaveProperty('education');
      expect(data.doctors[0]).toHaveProperty('certifications');
    });

    it('should handle specialty filter in demo mode', async () => {
      connectToMongoose.mockResolvedValue(false);

      const request = new Request('http://localhost:3000/api/doctors/search?specialty=cardiology');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doctors.every(doctor => doctor.specialty === 'cardiology')).toBe(true);
    });

    it('should handle rating filter in demo mode', async () => {
      connectToMongoose.mockResolvedValue(false);

      const request = new Request('http://localhost:3000/api/doctors/search?minRating=4.8');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doctors.every(doctor => doctor.rating >= 4.8)).toBe(true);
    });

    it('should handle fee filter in demo mode', async () => {
      connectToMongoose.mockResolvedValue(false);

      const request = new Request('http://localhost:3000/api/doctors/search?maxFee=3');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.doctors.every(doctor => doctor.consultationFee <= 3)).toBe(true);
    });

    it('should handle search query in demo mode', async () => {
      connectToMongoose.mockResolvedValue(false);

      const request = new Request('http://localhost:3000/api/doctors/search?search=cardio');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const hasMatch = data.doctors.some(doctor => 
        doctor.name.toLowerCase().includes('cardio') || 
        doctor.specialty.toLowerCase().includes('cardio') ||
        doctor.bio.toLowerCase().includes('cardio')
      );
      expect(hasMatch).toBe(true);
    });

    it('should handle pagination in demo mode', async () => {
      connectToMongoose.mockResolvedValue(false);

      const request = new Request('http://localhost:3000/api/doctors/search?page=2&limit=2');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(2);
      // Since we're using demo data, we can't test exact pagination results
      // but we can verify the structure is correct
      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('totalPages');
    });
  });
});