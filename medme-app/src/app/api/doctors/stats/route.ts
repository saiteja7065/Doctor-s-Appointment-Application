import { NextRequest, NextResponse } from 'next/server';
import { withDoctorAuth, UserContext } from '@/lib/auth/rbac';

// Simple demo stats for doctor dashboard
const getDemoStats = () => ({
  totalAppointments: 15,
  todayAppointments: 3,
  upcomingAppointments: 8,
  completedAppointments: 12,
  totalPatients: 25,
  totalEarnings: 2400,
  thisMonthEarnings: 800,
  availableBalance: 2400,
  averageRating: 4.8,
  totalRatings: 12,
  verificationStatus: 'approved' as const,
  recentAppointments: [
    {
      id: 'demo_1',
      patientName: 'John Smith',
      date: new Date().toISOString().split('T')[0],
      time: '10:00 AM',
      status: 'scheduled',
      topic: 'General Consultation',
      type: 'video'
    },
    {
      id: 'demo_2',
      patientName: 'Sarah Johnson',
      date: new Date().toISOString().split('T')[0],
      time: '2:00 PM',
      status: 'scheduled',
      topic: 'Follow-up',
      type: 'video'
    }
  ],
  monthlyStats: [
    { month: '2024-12', appointments: 15, earnings: 800 },
    { month: '2024-11', appointments: 12, earnings: 600 },
    { month: '2024-10', appointments: 18, earnings: 900 }
  ]
});

/**
 * GET /api/doctors/stats
 * Get comprehensive statistics for the authenticated doctor
 */
async function handleGET(userContext: UserContext, _request: NextRequest): Promise<NextResponse> {
  try {
    console.log('📊 Getting doctor stats for user:', userContext.clerkId);
    
    // Return demo stats for now
    const stats = getDemoStats();
    
    console.log('✅ Doctor stats retrieved successfully');
    return NextResponse.json({ 
      stats,
      message: 'Demo mode - using sample data'
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ Error getting doctor stats:', error);
    
    // Return demo stats as fallback
    const stats = getDemoStats();
    
    return NextResponse.json({ 
      stats,
      message: 'Demo mode - error fallback'
    }, { status: 200 });
  }
}

// Export without RBAC for testing
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Getting doctor stats (no RBAC)');

    // Return demo stats for now
    const stats = getDemoStats();

    console.log('✅ Doctor stats retrieved successfully');
    return NextResponse.json({
      stats,
      message: 'Demo mode - using sample data (no RBAC)'
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error getting doctor stats:', error);

    // Return demo stats as fallback
    const stats = getDemoStats();

    return NextResponse.json({
      stats,
      message: 'Demo mode - error fallback (no RBAC)'
    }, { status: 200 });
  }
}
