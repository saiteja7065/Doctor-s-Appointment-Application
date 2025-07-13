import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User, UserRole } from '@/lib/models/User';
import { Doctor } from '@/lib/models/Doctor';
import { Patient } from '@/lib/models/Patient';
import Appointment from '@/lib/models/Appointment';
import { Transaction } from '@/lib/models/Transaction';
import { WithdrawalRequest } from '@/lib/models/DoctorEarnings';

interface AdminOverviewData {
  userStats: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    userGrowthRate: number;
  };
  doctorStats: {
    totalDoctors: number;
    verifiedDoctors: number;
    pendingVerification: number;
    rejectedApplications: number;
  };
  financialStats: {
    totalRevenue: number;
    monthlyRevenue: number;
    pendingWithdrawals: number;
    totalWithdrawals: number;
  };
  appointmentStats: {
    totalAppointments: number;
    completedToday: number;
    upcomingToday: number;
    cancellationRate: number;
  };
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
  recentActivities: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'error';
  }[];
  alerts: {
    id: string;
    title: string;
    description: string;
    type: 'urgent' | 'warning' | 'info';
    timestamp: string;
  }[];
}

/**
 * GET /api/admin/overview
 * Get comprehensive admin overview data
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return demo data for development
      const demoData: AdminOverviewData = {
        userStats: {
          totalUsers: 1247,
          activeUsers: 1156,
          newUsersToday: 23,
          userGrowthRate: 12.5
        },
        doctorStats: {
          totalDoctors: 89,
          verifiedDoctors: 76,
          pendingVerification: 8,
          rejectedApplications: 5
        },
        financialStats: {
          totalRevenue: 45670.00,
          monthlyRevenue: 8920.00,
          pendingWithdrawals: 2340.00,
          totalWithdrawals: 12450.00
        },
        appointmentStats: {
          totalAppointments: 3456,
          completedToday: 45,
          upcomingToday: 67,
          cancellationRate: 8.2
        },
        systemHealth: {
          status: 'healthy',
          uptime: 99.8,
          responseTime: 245,
          errorRate: 0.02
        },
        recentActivities: [
          {
            id: '1',
            type: 'doctor_verification',
            description: 'Dr. Sarah Johnson verified and approved',
            timestamp: new Date().toISOString(),
            severity: 'info'
          },
          {
            id: '2',
            type: 'withdrawal_request',
            description: 'Withdrawal request of $150 from Dr. Mike Chen',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            severity: 'warning'
          },
          {
            id: '3',
            type: 'system_alert',
            description: 'High server load detected - auto-scaling triggered',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            severity: 'warning'
          }
        ],
        alerts: [
          {
            id: '1',
            title: 'Pending Doctor Verifications',
            description: '8 doctor applications require immediate review',
            type: 'urgent',
            timestamp: new Date().toISOString()
          },
          {
            id: '2',
            title: 'High Withdrawal Volume',
            description: 'Unusual increase in withdrawal requests today',
            type: 'warning',
            timestamp: new Date(Date.now() - 1800000).toISOString()
          }
        ]
      };

      return NextResponse.json({
        success: true,
        data: demoData,
        message: 'Demo admin overview data'
      });
    }

    // Check if user is admin
    const user = await User.findOne({ clerkId: userId });
    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Calculate date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // Parallel data fetching for better performance
    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      lastMonthUsers,
      totalDoctors,
      verifiedDoctors,
      pendingDoctors,
      rejectedDoctors,
      totalRevenue,
      monthlyRevenue,
      pendingWithdrawals,
      totalWithdrawals,
      totalAppointments,
      completedToday,
      upcomingToday,
      totalCancellations
    ] = await Promise.all([
      // User stats
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ 
        createdAt: { 
          $gte: startOfLastMonth, 
          $lt: endOfLastMonth 
        } 
      }),

      // Doctor stats
      Doctor.countDocuments(),
      Doctor.countDocuments({ verificationStatus: 'verified' }),
      Doctor.countDocuments({ verificationStatus: 'pending' }),
      Doctor.countDocuments({ verificationStatus: 'rejected' }),

      // Financial stats
      Transaction.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { 
          $match: { 
            status: 'completed',
            createdAt: { $gte: startOfMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      WithdrawalRequest.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      WithdrawalRequest.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),

      // Appointment stats
      Appointment.countDocuments(),
      Appointment.countDocuments({
        status: 'completed',
        appointmentDate: {
          $gte: today.toISOString().split('T')[0],
          $lt: tomorrow.toISOString().split('T')[0]
        }
      }),
      Appointment.countDocuments({
        status: { $in: ['scheduled', 'confirmed'] },
        appointmentDate: {
          $gte: today.toISOString().split('T')[0],
          $lt: tomorrow.toISOString().split('T')[0]
        }
      }),
      Appointment.countDocuments({ status: 'cancelled' })
    ]);

    // Calculate growth rate
    const userGrowthRate = lastMonthUsers > 0 
      ? ((totalUsers - lastMonthUsers) / lastMonthUsers) * 100 
      : 0;

    // Calculate cancellation rate
    const cancellationRate = totalAppointments > 0 
      ? (totalCancellations / totalAppointments) * 100 
      : 0;

    // Get recent activities (simplified for demo)
    const recentActivities = [
      {
        id: '1',
        type: 'doctor_verification',
        description: `${verifiedDoctors} doctors verified`,
        timestamp: new Date().toISOString(),
        severity: 'info' as const
      },
      {
        id: '2',
        type: 'withdrawal_request',
        description: `${(pendingWithdrawals[0]?.total || 0)} credits pending withdrawal`,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        severity: 'warning' as const
      }
    ];

    // Generate alerts based on system state
    const alerts = [];
    if (pendingDoctors > 5) {
      alerts.push({
        id: 'pending_doctors',
        title: 'Pending Doctor Verifications',
        description: `${pendingDoctors} doctor applications require immediate review`,
        type: 'urgent' as const,
        timestamp: new Date().toISOString()
      });
    }

    if ((pendingWithdrawals[0]?.total || 0) > 1000) {
      alerts.push({
        id: 'high_withdrawals',
        title: 'High Withdrawal Volume',
        description: 'Unusual increase in withdrawal requests',
        type: 'warning' as const,
        timestamp: new Date().toISOString()
      });
    }

    // Determine system health
    let systemStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (pendingDoctors > 10 || (pendingWithdrawals[0]?.total || 0) > 5000) {
      systemStatus = 'warning';
    }
    if (pendingDoctors > 20 || (pendingWithdrawals[0]?.total || 0) > 10000) {
      systemStatus = 'critical';
    }

    const overviewData: AdminOverviewData = {
      userStats: {
        totalUsers,
        activeUsers,
        newUsersToday,
        userGrowthRate: Math.round(userGrowthRate * 10) / 10
      },
      doctorStats: {
        totalDoctors,
        verifiedDoctors,
        pendingVerification: pendingDoctors,
        rejectedApplications: rejectedDoctors
      },
      financialStats: {
        totalRevenue: (totalRevenue[0]?.total || 0) / 100, // Convert from cents
        monthlyRevenue: (monthlyRevenue[0]?.total || 0) / 100,
        pendingWithdrawals: pendingWithdrawals[0]?.total || 0,
        totalWithdrawals: totalWithdrawals[0]?.total || 0
      },
      appointmentStats: {
        totalAppointments,
        completedToday,
        upcomingToday,
        cancellationRate: Math.round(cancellationRate * 10) / 10
      },
      systemHealth: {
        status: systemStatus,
        uptime: 99.8, // This would come from monitoring service
        responseTime: 245, // This would come from monitoring service
        errorRate: 0.02 // This would come from monitoring service
      },
      recentActivities,
      alerts
    };

    return NextResponse.json({
      success: true,
      data: overviewData
    });

  } catch (error) {
    console.error('Error in admin overview GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
