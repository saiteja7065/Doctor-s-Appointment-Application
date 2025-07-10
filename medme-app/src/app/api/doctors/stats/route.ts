import { NextRequest, NextResponse } from 'next/server';
import { withDoctorAuth, UserContext } from '@/lib/auth/rbac';
import { Doctor } from '@/lib/models/Doctor';
import Appointment, { AppointmentStatus, PaymentStatus } from '@/lib/models/Appointment';

interface DoctorStats {
  totalAppointments: number;
  todayAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  totalPatients: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  availableBalance: number;
  averageRating: number;
  totalRatings: number;
  verificationStatus: string;
  recentAppointments: Array<{
    id: string;
    patientName: string;
    date: string;
    time: string;
    status: string;
    topic: string;
    type: string;
  }>;
  monthlyStats: {
    month: string;
    appointments: number;
    earnings: number;
  }[];
}

/**
 * GET /api/doctors/stats
 * Get comprehensive statistics for the authenticated doctor
 */
async function handleGET(userContext: UserContext, _request: NextRequest): Promise<NextResponse> {
  try {
    // Get doctor profile
    const doctor = await Doctor.findOne({ clerkId: userContext.clerkId });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor profile not found' },
        { status: 404 }
      );
    }

    // Get current date info
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const startOfMonth = `${currentMonth}-01`;
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
      .toISOString().split('T')[0];

    // Parallel queries for better performance
    const [
      totalAppointments,
      todayAppointments,
      upcomingAppointments,
      completedAppointments,
      thisMonthAppointments,
      recentAppointments,
      uniquePatients,
      ratingsData,
      monthlyStatsData
    ] = await Promise.all([
      // Total appointments
      Appointment.countDocuments({ doctorId: doctor._id }),
      
      // Today's appointments
      Appointment.countDocuments({
        doctorId: doctor._id,
        appointmentDate: today,
        status: { $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.IN_PROGRESS] }
      }),
      
      // Upcoming appointments
      Appointment.countDocuments({
        doctorId: doctor._id,
        appointmentDate: { $gte: today },
        status: AppointmentStatus.SCHEDULED
      }),
      
      // Completed appointments
      Appointment.countDocuments({
        doctorId: doctor._id,
        status: AppointmentStatus.COMPLETED
      }),
      
      // This month's appointments for earnings calculation
      Appointment.find({
        doctorId: doctor._id,
        appointmentDate: { $gte: startOfMonth, $lte: endOfMonth },
        status: AppointmentStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID
      }).select('consultationFee'),
      
      // Recent appointments (last 5)
      Appointment.find({ doctorId: doctor._id })
        .sort({ appointmentDate: -1, appointmentTime: -1 })
        .limit(5)
        .select('patientName appointmentDate appointmentTime status topic consultationType'),
      
      // Unique patients count
      Appointment.distinct('patientId', { doctorId: doctor._id }),
      
      // Ratings data
      Appointment.aggregate([
        { $match: { doctorId: doctor._id, rating: { $exists: true } } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalRatings: { $sum: 1 }
          }
        }
      ]),
      
      // Monthly stats for the last 6 months
      Appointment.aggregate([
        {
          $match: {
            doctorId: doctor._id,
            status: AppointmentStatus.COMPLETED,
            appointmentDate: {
              $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
                .toISOString().split('T')[0]
            }
          }
        },
        {
          $group: {
            _id: { $substr: ['$appointmentDate', 0, 7] }, // Group by YYYY-MM
            appointments: { $sum: 1 },
            earnings: {
              $sum: {
                $cond: [
                  { $eq: ['$paymentStatus', PaymentStatus.PAID] },
                  '$consultationFee',
                  0
                ]
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Calculate earnings
    const totalEarnings = doctor.totalEarnings || 0;
    const thisMonthEarnings = thisMonthAppointments.reduce(
      (sum, appointment) => sum + appointment.consultationFee, 
      0
    );
    
    // Calculate available balance (total earnings minus withdrawals)
    // For now, we'll use the doctor's totalEarnings field
    const availableBalance = totalEarnings;

    // Process ratings data
    const ratingsResult = ratingsData[0] || { averageRating: 0, totalRatings: 0 };

    // Process monthly stats
    const monthlyStats = monthlyStatsData.map(stat => ({
      month: stat._id,
      appointments: stat.appointments,
      earnings: stat.earnings
    }));

    // Build response
    const stats: DoctorStats = {
      totalAppointments,
      todayAppointments,
      upcomingAppointments,
      completedAppointments,
      totalPatients: uniquePatients.length,
      totalEarnings,
      thisMonthEarnings,
      availableBalance,
      averageRating: Math.round(ratingsResult.averageRating * 10) / 10, // Round to 1 decimal
      totalRatings: ratingsResult.totalRatings,
      verificationStatus: doctor.verificationStatus,
      recentAppointments: recentAppointments.map(apt => ({
        id: apt._id,
        patientName: apt.patientName,
        date: apt.appointmentDate,
        time: apt.appointmentTime,
        status: apt.status,
        topic: apt.topic,
        type: apt.consultationType
      })),
      monthlyStats
    };

    return NextResponse.json({ stats }, { status: 200 });

  } catch (error) {
    console.error('Error fetching doctor stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/doctors/stats with demo fallback
 */
async function handleGETWithFallback(userContext: UserContext, request: NextRequest): Promise<NextResponse> {
  try {
    return await handleGET(userContext, request);
  } catch (error) {
    console.error('Database error, falling back to demo data:', error);
    
    // Return demo stats when database is not available
    const demoStats: DoctorStats = {
      totalAppointments: 0,
      todayAppointments: 0,
      upcomingAppointments: 0,
      completedAppointments: 0,
      totalPatients: 0,
      totalEarnings: 0,
      thisMonthEarnings: 0,
      availableBalance: 0,
      averageRating: 0,
      totalRatings: 0,
      verificationStatus: 'pending',
      recentAppointments: [],
      monthlyStats: []
    };

    return NextResponse.json(
      { 
        stats: demoStats,
        message: 'Demo mode - database not available'
      },
      { status: 200 }
    );
  }
}

// Export with RBAC protection
export const GET = withDoctorAuth(handleGETWithFallback);
