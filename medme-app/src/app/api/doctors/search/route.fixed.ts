import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToMongoose } from '@/lib/mongodb';
import { Doctor } from '@/lib/models/Doctor';
import { User } from '@/lib/models/User';
import { MedicalSpecialty, DoctorVerificationStatus } from '@/lib/models/Doctor';
import { DemoAuthService } from '@/lib/demo-auth';

interface DoctorSearchFilters {
  specialty?: string;
  minRating?: number;
  maxFee?: number;
  languages?: string[];
  availability?: string; // 'today', 'tomorrow', 'this_week', 'next_week'
  experience?: number; // minimum years
  search?: string; // name or bio search
  sortBy?: 'rating' | 'experience' | 'fee' | 'name' | 'consultations';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface DoctorSearchResult {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  specialty: string;
  formattedSpecialty: string;
  rating: number;
  totalRatings: number;
  experience: number;
  consultationFee: number;
  totalConsultations: number;
  bio?: string;
  languages: string[];
  isOnline: boolean;
  nextAvailableSlot?: string;
  profileImage?: string;
  verificationStatus: string;
  education: Array<{
    degree: string;
    institution: string;
    graduationYear: number;
  }>;
  certifications: Array<{
    name: string;
    issuingOrganization: string;
  }>;
}

/**
 * GET /api/doctors/search
 * Search and filter doctors with comprehensive filtering options
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Doctor search request received');
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const filters: DoctorSearchFilters = {
      specialty: searchParams.get('specialty') || undefined,
      minRating: searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : undefined,
      maxFee: searchParams.get('maxFee') ? parseInt(searchParams.get('maxFee')!) : undefined,
      languages: searchParams.get('languages') ? searchParams.get('languages')!.split(',') : undefined,
      availability: searchParams.get('availability') || undefined,
      experience: searchParams.get('experience') ? parseInt(searchParams.get('experience')!) : undefined,
      search: searchParams.get('search') || undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'rating',
      sortOrder: (searchParams.get('sortOrder') as any) || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '12'),
    };

    console.log('🔍 Search filters:', filters);

    // Check if we're in demo mode
    if (DemoAuthService.isDemoMode()) {
      console.log('🧪 Demo mode: Returning demo doctors including approved ones');
      return NextResponse.json({
        doctors: getDemoDataWithApproved(filters),
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 12,
          total: 6,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        filters: getDemoFilters(),
        isDemo: true,
        message: 'Demo mode - showing approved doctors'
      }, { status: 200 });
    }

    // Connect to database
    let isConnected = false;
    try {
      isConnected = await connectToMongoose();
    } catch (error) {
      console.error('Failed to connect to database:', error);
      isConnected = false;
    }
    
    if (!isConnected) {
      // Return demo data when database is not available
      return NextResponse.json({
        doctors: getDemoData(filters),
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 12,
          total: 24,
          totalPages: 2,
          hasNext: (filters.page || 1) < 2,
          hasPrev: (filters.page || 1) > 1,
        },
        filters: getDemoFilters(),
        isDemo: true,
        message: 'Database not available - using demo data'
      }, { status: 200 });
    }

    // Check if doctors collection exists to avoid timeout errors
    let collectionExists = false;
    try {
      if (mongoose.connection.db) {
        const collections = await mongoose.connection.db.listCollections({ name: 'doctors' }).toArray();
        collectionExists = collections.length > 0;
      }
    } catch (collectionError) {
      console.log('Could not check doctors collection existence (expected for new installations)');
      collectionExists = false;
    }

    if (!collectionExists) {
      console.log('Doctors collection does not exist yet (expected for new installations)');
      return NextResponse.json({
        doctors: getDemoData(filters),
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 12,
          total: 24,
          totalPages: 2,
          hasNext: (filters.page || 1) < 2,
          hasPrev: (filters.page || 1) > 1,
        },
        filters: getDemoFilters(),
        isDemo: true,
        message: 'Doctors collection not found - using demo data'
      }, { status: 200 });
    }

    // Build MongoDB aggregation pipeline
    const pipeline: any[] = [];

    // Match only approved doctors
    const matchStage: any = {
      verificationStatus: DoctorVerificationStatus.APPROVED,
    };

    // Apply filters
    if (filters.specialty) {
      matchStage.specialty = filters.specialty;
    }

    if (filters.minRating) {
      matchStage.averageRating = { $gte: filters.minRating };
    }

    if (filters.maxFee) {
      matchStage.consultationFee = { $lte: filters.maxFee };
    }

    if (filters.experience) {
      matchStage.yearsOfExperience = { $gte: filters.experience };
    }

    if (filters.languages && filters.languages.length > 0) {
      matchStage.languages = { $in: filters.languages };
    }

    pipeline.push({ $match: matchStage });

    // Join with User collection to get name and profile info
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'clerkId',
        foreignField: 'clerkId',
        as: 'user',
      },
    });

    pipeline.push({
      $unwind: '$user',
    });

    // Text search if provided
    if (filters.search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.firstName': { $regex: filters.search, $options: 'i' } },
            { 'user.lastName': { $regex: filters.search, $options: 'i' } },
            { bio: { $regex: filters.search, $options: 'i' } },
            { specialty: { $regex: filters.search, $options: 'i' } },
          ],
        },
      });
    }

    // Add computed fields
    pipeline.push({
      $addFields: {
        fullName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
        formattedSpecialty: {
          $replaceAll: {
            input: '$specialty',
            find: '_',
            replacement: ' ',
          },
        },
      },
    });

    // Sort
    const sortStage: any = {};
    switch (filters.sortBy) {
      case 'rating':
        sortStage.averageRating = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'experience':
        sortStage.yearsOfExperience = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'fee':
        sortStage.consultationFee = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'name':
        sortStage.fullName = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      case 'consultations':
        sortStage.totalConsultations = filters.sortOrder === 'asc' ? 1 : -1;
        break;
      default:
        sortStage.averageRating = -1;
    }
    pipeline.push({ $sort: sortStage });

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    
    let total = 0;
    try {
      const countResult = await Doctor.aggregate(countPipeline);
      total = countResult[0]?.total || 0;
    } catch (error) {
      console.error('Error counting doctors:', error);
      // Continue with demo data on error
      return NextResponse.json({
        doctors: getDemoData(filters),
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 12,
          total: 24,
          totalPages: 2,
          hasNext: (filters.page || 1) < 2,
          hasPrev: (filters.page || 1) > 1,
        },
        filters: getDemoFilters(),
        isDemo: true,
        error: 'Database error - using demo data'
      }, { status: 200 });
    }

    // Apply pagination
    const skip = ((filters.page || 1) - 1) * (filters.limit || 12);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: filters.limit || 12 });

    // Project final fields
    pipeline.push({
      $project: {
        id: '$_id',
        name: '$fullName',
        firstName: '$user.firstName',
        lastName: '$user.lastName',
        specialty: 1,
        formattedSpecialty: 1,
        rating: '$averageRating',
        totalRatings: 1,
        experience: '$yearsOfExperience',
        consultationFee: 1,
        totalConsultations: 1,
        bio: 1,
        languages: 1,
        isOnline: 1,
        verificationStatus: 1,
        education: 1,
        certifications: {
          $map: {
            input: '$certifications',
            as: 'cert',
            in: {
              name: '$$cert.name',
              issuingOrganization: '$$cert.issuingOrganization',
            },
          },
        },
        profileImage: '$user.profileImage',
        createdAt: 1,
      },
    });

    // Execute aggregation with error handling
    let doctors: any[] = [];

    try {
      doctors = await Doctor.aggregate(pipeline);
    } catch (dbError) {
      console.error('Database aggregation error:', dbError);
      // Return demo data if database query fails
      return NextResponse.json({
        doctors: getDemoData(filters),
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 12,
          total: 24,
          totalPages: 2,
          hasNext: (filters.page || 1) < 2,
          hasPrev: (filters.page || 1) > 1,
        },
        filters: getDemoFilters(),
        isDemo: true,
        error: 'Database error - using demo data'
      }, { status: 200 });
    }

    // Calculate pagination info
    const totalPages = Math.ceil(total / (filters.limit || 12));
    const currentPage = filters.page || 1;

    // Get available filter options
    const availableFilters = await getAvailableFilters();

    return NextResponse.json({
      doctors: doctors as DoctorSearchResult[],
      pagination: {
        page: currentPage,
        limit: filters.limit || 12,
        total,
        totalPages,
        hasNext: currentPage < totalPages,
        hasPrev: currentPage > 1,
      },
      filters: availableFilters,
    }, { status: 200 });

  } catch (error) {
    console.error('Error searching doctors:', error);

    // Return demo data instead of error to keep the app functional
    const defaultFilters = {
      page: 1,
      limit: 12,
      sortBy: 'rating' as const,
      sortOrder: 'desc' as const,
    };

    return NextResponse.json({
      doctors: getDemoData(defaultFilters),
      pagination: {
        page: 1,
        limit: 12,
        total: 24,
        totalPages: 2,
        hasNext: true,
        hasPrev: false,
      },
      filters: getDemoFilters(),
      isDemo: true,
      error: 'Using demo data due to database error',
    }, { status: 200 });
  }
}

/**
 * Get available filter options from the database
 */
async function getAvailableFilters() {
  try {
    let isConnected = false;
    try {
      isConnected = await connectToMongoose();
    } catch (error) {
      console.error('Failed to connect to database for filters:', error);
      return getDemoFilters();
    }
    
    if (!isConnected) {
      return getDemoFilters();
    }

    // Check if doctors collection exists to avoid timeout errors
    let collectionExists = false;
    try {
      if (mongoose.connection.db) {
        const collections = await mongoose.connection.db.listCollections({ name: 'doctors' }).toArray();
        collectionExists = collections.length > 0;
      }
    } catch (collectionError) {
      console.log('Could not check doctors collection existence for filters');
      return getDemoFilters();
    }

    if (!collectionExists) {
      console.log('Doctors collection does not exist for filters - using demo filters');
      return getDemoFilters();
    }

    // Get unique specialties with timeout
    let specialties = [];
    try {
      specialties = await Doctor.distinct('specialty', {
        verificationStatus: DoctorVerificationStatus.APPROVED,
      });
    } catch (error) {
      console.error('Error getting specialties:', error);
      specialties = Object.values(MedicalSpecialty);
    }

    // Get unique languages with timeout
    let languages = [];
    try {
      languages = await Doctor.distinct('languages', {
        verificationStatus: DoctorVerificationStatus.APPROVED,
      });
    } catch (error) {
      console.error('Error getting languages:', error);
      languages = ['English', 'Spanish', 'French', 'German'];
    }

    // Get fee range with timeout
    let feeStats = [];
    try {
      feeStats = await Doctor.aggregate([
        { $match: { verificationStatus: DoctorVerificationStatus.APPROVED } },
        {
          $group: {
            _id: null,
            minFee: { $min: '$consultationFee' },
            maxFee: { $max: '$consultationFee' },
            avgFee: { $avg: '$consultationFee' },
          },
        },
      ]);
    } catch (error) {
      console.error('Error getting fee stats:', error);
      feeStats = [];
    }

    // Get experience range with timeout
    let experienceStats = [];
    try {
      experienceStats = await Doctor.aggregate([
        { $match: { verificationStatus: DoctorVerificationStatus.APPROVED } },
        {
          $group: {
            _id: null,
            minExperience: { $min: '$yearsOfExperience' },
            maxExperience: { $max: '$yearsOfExperience' },
            avgExperience: { $avg: '$yearsOfExperience' },
          },
        },
      ]);
    } catch (error) {
      console.error('Error getting experience stats:', error);
      experienceStats = [];
    }

    return {
      specialties: specialties.map(specialty => ({
        value: specialty,
        label: specialty.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      })),
      languages: languages.flat().filter((lang, index, arr) => arr.indexOf(lang) === index),
      feeRange: {
        min: (feeStats && feeStats.length > 0 && feeStats[0]) ? feeStats[0].minFee || 2 : 2,
        max: (feeStats && feeStats.length > 0 && feeStats[0]) ? feeStats[0].maxFee || 10 : 10,
        average: (feeStats && feeStats.length > 0 && feeStats[0]) ? Math.round(feeStats[0].avgFee || 2) : 2,
      },
      experienceRange: {
        min: (experienceStats && experienceStats.length > 0 && experienceStats[0]) ? experienceStats[0].minExperience || 1 : 1,
        max: (experienceStats && experienceStats.length > 0 && experienceStats[0]) ? experienceStats[0].maxExperience || 30 : 30,
        average: (experienceStats && experienceStats.length > 0 && experienceStats[0]) ? Math.round(experienceStats[0].avgExperience || 5) : 5,
      },
      sortOptions: [
        { value: 'rating', label: 'Highest Rated' },
        { value: 'experience', label: 'Most Experienced' },
        { value: 'consultations', label: 'Most Consultations' },
        { value: 'fee', label: 'Lowest Fee' },
        { value: 'name', label: 'Name (A-Z)' },
      ],
    };
  } catch (error) {
    console.error('Error getting available filters:', error);
    return getDemoFilters();
  }
}

/**
 * Get demo filter options when database is not available
 */
function getDemoFilters() {
  return {
    specialties: Object.values(MedicalSpecialty).map(specialty => ({
      value: specialty,
      label: specialty.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    })),
    languages: ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Hindi', 'Mandarin'],
    feeRange: {
      min: 2,
      max: 10,
      average: 3,
    },
    experienceRange: {
      min: 1,
      max: 30,
      average: 8,
    },
    sortOptions: [
      { value: 'rating', label: 'Highest Rated' },
      { value: 'experience', label: 'Most Experienced' },
      { value: 'consultations', label: 'Most Consultations' },
      { value: 'fee', label: 'Lowest Fee' },
      { value: 'name', label: 'Name (A-Z)' },
    ],
  };
}

/**
 * Get demo data including approved doctors from workflow
 */
function getDemoDataWithApproved(filters: DoctorSearchFilters): DoctorSearchResult[] {
  // Include approved doctors from our workflow
  const approvedDoctors: DoctorSearchResult[] = [
    {
      id: 'demo_app_1_approved',
      name: 'Dr. John Smith',
      firstName: 'John',
      lastName: 'Smith',
      specialty: 'cardiology',
      formattedSpecialty: 'Cardiology',
      rating: 4.8,
      totalRatings: 156,
      experience: 10,
      consultationFee: 5,
      totalConsultations: 423,
      bio: 'Experienced cardiologist with 10+ years of practice in interventional cardiology.',
      languages: ['English', 'Spanish'],
      isOnline: true,
      nextAvailableSlot: 'Today 3:00 PM',
      verificationStatus: DoctorVerificationStatus.APPROVED,
      education: [
        {
          degree: 'Doctor of Medicine (MD)',
          institution: 'Harvard Medical School',
          graduationYear: 2010,
        },
      ],
      certifications: [
        {
          name: 'Board Certified Cardiologist',
          issuingOrganization: 'American Board of Internal Medicine',
        },
      ],
    },
    {
      id: 'demo_app_3_approved',
      name: 'Dr. Michael Brown',
      firstName: 'Michael',
      lastName: 'Brown',
      specialty: 'dermatology',
      formattedSpecialty: 'Dermatology',
      rating: 4.9,
      totalRatings: 89,
      experience: 15,
      consultationFee: 6,
      totalConsultations: 234,
      bio: 'Dermatologist specializing in skin cancer detection and cosmetic procedures.',
      languages: ['English'],
      isOnline: true,
      nextAvailableSlot: 'Tomorrow 11:00 AM',
      verificationStatus: DoctorVerificationStatus.APPROVED,
      education: [
        {
          degree: 'MD in Dermatology',
          institution: 'Johns Hopkins School of Medicine',
          graduationYear: 2005,
        },
      ],
      certifications: [
        {
          name: 'Board Certified Dermatologist',
          issuingOrganization: 'American Board of Dermatology',
        },
      ],
    },
  ];

  // Combine with existing demo data
  const allDoctors = [...approvedDoctors, ...getDemoData(filters)];

  // Apply filters
  return applyFilters(allDoctors, filters);
}

/**
 * Get demo doctor data when database is not available
 */
function getDemoData(filters: DoctorSearchFilters): DoctorSearchResult[] {
  const demoData: DoctorSearchResult[] = [
    {
      id: 'demo_1',
      name: 'Dr. Sarah Johnson',
      firstName: 'Sarah',
      lastName: 'Johnson',
      specialty: MedicalSpecialty.CARDIOLOGY,
      formattedSpecialty: 'Cardiology',
      rating: 4.8,
      totalRatings: 156,
      experience: 12,
      consultationFee: 3,
      totalConsultations: 342,
      bio: 'Experienced cardiologist specializing in preventive heart care and advanced cardiac procedures.',
      languages: ['English', 'Spanish'],
      isOnline: true,
      nextAvailableSlot: 'Today 2:00 PM',
      verificationStatus: DoctorVerificationStatus.APPROVED,
      education: [
        {
          degree: 'MD in Cardiology',
          institution: 'Harvard Medical School',
          graduationYear: 2012,
        },
      ],
      certifications: [
        {
          name: 'Board Certified Cardiologist',
          issuingOrganization: 'American Board of Internal Medicine',
        },
      ],
    },
    {
      id: 'demo_2',
      name: 'Dr. Michael Chen',
      firstName: 'Michael',
      lastName: 'Chen',
      specialty: MedicalSpecialty.DERMATOLOGY,
      formattedSpecialty: 'Dermatology',
      rating: 4.9,
      totalRatings: 203,
      experience: 8,
      consultationFee: 2,
      totalConsultations: 567,
      bio: 'Dermatologist with expertise in skin cancer detection and cosmetic dermatology.',
      languages: ['English', 'Mandarin'],
      isOnline: false,
      nextAvailableSlot: 'Tomorrow 10:00 AM',
      verificationStatus: DoctorVerificationStatus.APPROVED,
      education: [
        {
          degree: 'MD in Dermatology',
          institution: 'Stanford University School of Medicine',
          graduationYear: 2016,
        },
      ],
      certifications: [
        {
          name: 'Board Certified Dermatologist',
          issuingOrganization: 'American Board of Dermatology',
        },
      ],
    },
    {
      id: 'demo_3',
      name: 'Dr. Emily Rodriguez',
      firstName: 'Emily',
      lastName: 'Rodriguez',
      specialty: MedicalSpecialty.PEDIATRICS,
      formattedSpecialty: 'Pediatrics',
      rating: 4.7,
      totalRatings: 89,
      experience: 6,
      consultationFee: 2,
      totalConsultations: 234,
      bio: 'Pediatrician dedicated to providing comprehensive care for children from infancy through adolescence.',
      languages: ['English', 'Spanish', 'Portuguese'],
      isOnline: true,
      nextAvailableSlot: 'Today 4:30 PM',
      verificationStatus: DoctorVerificationStatus.APPROVED,
      education: [
        {
          degree: 'MD in Pediatrics',
          institution: 'Johns Hopkins School of Medicine',
          graduationYear: 2018,
        },
      ],
      certifications: [
        {
          name: 'Board Certified Pediatrician',
          issuingOrganization: 'American Board of Pediatrics',
        },
      ],
    },
    {
      id: 'demo_4',
      name: 'Dr. David Thompson',
      firstName: 'David',
      lastName: 'Thompson',
      specialty: MedicalSpecialty.ORTHOPEDICS,
      formattedSpecialty: 'Orthopedics',
      rating: 4.6,
      totalRatings: 134,
      experience: 15,
      consultationFee: 4,
      totalConsultations: 456,
      bio: 'Orthopedic surgeon specializing in sports medicine and joint replacement procedures.',
      languages: ['English'],
      isOnline: false,
      nextAvailableSlot: 'Monday 9:00 AM',
      verificationStatus: DoctorVerificationStatus.APPROVED,
      education: [
        {
          degree: 'MD in Orthopedic Surgery',
          institution: 'Mayo Clinic Alix School of Medicine',
          graduationYear: 2009,
        },
      ],
      certifications: [
        {
          name: 'Board Certified Orthopedic Surgeon',
          issuingOrganization: 'American Board of Orthopedic Surgery',
        },
      ],
    },
  ];

  // Apply basic filtering to demo data
  return applyFilters(demoData, filters);
}

/**
 * Apply filters to doctor search results
 */
function applyFilters(doctors: DoctorSearchResult[], filters: DoctorSearchFilters): DoctorSearchResult[] {
  let filtered = [...doctors];

  // Apply specialty filter
  if (filters.specialty) {
    filtered = filtered.filter(doctor => doctor.specialty === filters.specialty);
  }

  // Apply rating filter
  if (filters.minRating) {
    filtered = filtered.filter(doctor => doctor.rating >= filters.minRating!);
  }

  // Apply fee filter
  if (filters.maxFee) {
    filtered = filtered.filter(doctor => doctor.consultationFee <= filters.maxFee!);
  }

  // Apply experience filter
  if (filters.experience) {
    filtered = filtered.filter(doctor => doctor.experience >= filters.experience!);
  }

  // Apply language filter
  if (filters.languages && filters.languages.length > 0) {
    filtered = filtered.filter(doctor =>
      filters.languages!.some(lang => doctor.languages.includes(lang))
    );
  }

  // Apply search filter
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(doctor =>
      doctor.name.toLowerCase().includes(searchTerm) ||
      doctor.bio?.toLowerCase().includes(searchTerm) ||
      doctor.specialty.toLowerCase().includes(searchTerm)
    );
  }

  // Apply sorting
  if (filters.sortBy) {
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'experience':
          aValue = a.experience;
          bValue = b.experience;
          break;
        case 'fee':
          aValue = a.consultationFee;
          bValue = b.consultationFee;
          break;
        case 'consultations':
          aValue = a.totalConsultations;
          bValue = b.totalConsultations;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        default:
          aValue = a.rating;
          bValue = b.rating;
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  // Apply pagination
  const page = filters.page || 1;
  const limit = filters.limit || 12;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return filtered.slice(startIndex, endIndex);
}