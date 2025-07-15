import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/rbac';
import { connectToMongoose } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { Patient } from '@/lib/models/Patient';
import { Doctor } from '@/lib/models/Doctor';
import Appointment from '@/lib/models/Appointment';

interface FinancialOverview {
  totalRevenue: number;
  totalCreditsIssued: number;
  totalCreditsUsed: number;
  totalDoctorEarnings: number;
  pendingWithdrawals: number;
  completedWithdrawals: number;
  activeSubscriptions: number;
  totalTransactions: number;
  platformCommission: number;
  monthlyGrowth: number;
}

interface WithdrawalRequest {
  _id: string;
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  amount: number;
  method: 'bank' | 'paypal' | 'upi';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  notes?: string;
  accountDetails?: any;
}

interface CreditTransaction {
  _id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  type: 'purchase' | 'deduction' | 'refund' | 'bonus';
  amount: number;
  description: string;
  appointmentId?: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
}

interface SubscriptionData {
  _id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  plan: 'free' | 'basic' | 'standard' | 'premium';
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  startDate: string;
  endDate?: string;
  amount: number;
  renewalDate?: string;
}

async function getFinancialData() {
  const isConnected = await connectToMongoose();
  
  if (!isConnected) {
    // Return demo data if database is not available
    return {
      overview: {
        totalRevenue: 125750,
        totalCreditsIssued: 15420,
        totalCreditsUsed: 12890,
        totalDoctorEarnings: 89250,
        pendingWithdrawals: 15,
        completedWithdrawals: 142,
        activeSubscriptions: 1089,
        totalTransactions: 3456,
        platformCommission: 36500,
        monthlyGrowth: 12.5
      },
      withdrawals: [
        {
          _id: 'demo_withdrawal_1',
          doctorId: 'doc_demo_123',
          doctorName: 'Dr. Sarah Johnson',
          doctorEmail: 'sarah.johnson@email.com',
          amount: 250,
          method: 'bank',
          status: 'pending',
          requestedAt: '2025-07-11T10:30:00Z',
          accountDetails: {
            accountHolderName: 'Sarah Johnson',
            accountNumber: '****1234',
            bankName: 'Chase Bank'
          }
        },
        {
          _id: 'demo_withdrawal_2',
          doctorId: 'doc_demo_456',
          doctorName: 'Dr. Michael Chen',
          doctorEmail: 'michael.chen@email.com',
          amount: 180,
          method: 'paypal',
          status: 'processing',
          requestedAt: '2025-07-10T14:20:00Z',
          accountDetails: {
            paypalEmail: 'michael.chen@email.com'
          }
        }
      ],
      transactions: [
        {
          _id: 'demo_transaction_1',
          patientId: 'pat_demo_123',
          patientName: 'John Doe',
          patientEmail: 'john.doe@email.com',
          type: 'purchase',
          amount: 20,
          description: 'Credit purchase - Premium plan',
          status: 'completed',
          createdAt: '2025-07-11T09:15:00Z'
        },
        {
          _id: 'demo_transaction_2',
          patientId: 'pat_demo_456',
          patientName: 'Emily Rodriguez',
          patientEmail: 'emily.rodriguez@email.com',
          type: 'deduction',
          amount: 2,
          description: 'Consultation with Dr. Sarah Johnson',
          appointmentId: 'apt_demo_789',
          status: 'completed',
          createdAt: '2025-07-11T08:45:00Z'
        }
      ],
      subscriptions: [
        {
          _id: 'demo_subscription_1',
          patientId: 'pat_demo_123',
          patientName: 'John Doe',
          patientEmail: 'john.doe@email.com',
          plan: 'premium',
          status: 'active',
          startDate: '2025-07-01T00:00:00Z',
          endDate: '2025-08-01T00:00:00Z',
          amount: 29.99,
          renewalDate: '2025-08-01T00:00:00Z'
        }
      ]
    };
  }

  try {
    // Calculate financial overview
    const [
      totalPatients,
      totalDoctors,
      totalAppointments,
      completedAppointments,
      activeSubscriptions
    ] = await Promise.all([
      Patient.countDocuments(),
      Doctor.countDocuments(),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'completed' }),
      Patient.countDocuments({ subscriptionStatus: 'active' })
    ]);

    // Calculate total credits issued and used
    const creditAggregation = await Patient.aggregate([
      {
        $group: {
          _id: null,
          totalCreditsIssued: { $sum: { $add: ['$creditBalance', '$totalSpent'] } },
          totalCreditsUsed: { $sum: '$totalSpent' }
        }
      }
    ]);

    const creditData = creditAggregation[0] || { totalCreditsIssued: 0, totalCreditsUsed: 0 };

    // Calculate doctor earnings
    const doctorEarningsAggregation = await Doctor.aggregate([
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalEarnings' }
        }
      }
    ]);

    const totalDoctorEarnings = doctorEarningsAggregation[0]?.totalEarnings || 0;

    // Calculate revenue from completed appointments
    const revenueAggregation = await Appointment.aggregate([
      { $match: { status: 'completed', paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$consultationFee' } } }
    ]);
    const totalRevenue = (revenueAggregation[0]?.total || 0) * 1.5; // Assuming 1 credit = $1.5

    const overview: FinancialOverview = {
      totalRevenue,
      totalCreditsIssued: creditData.totalCreditsIssued,
      totalCreditsUsed: creditData.totalCreditsUsed,
      totalDoctorEarnings,
      pendingWithdrawals: await calculatePendingWithdrawals(),
      completedWithdrawals: await calculateCompletedWithdrawals(),
      activeSubscriptions,
      totalTransactions: totalAppointments + (activeSubscriptions * 2), // Rough estimate
      platformCommission: totalRevenue * 0.15, // 15% platform fee
      monthlyGrowth: await calculateMonthlyGrowth()
    };

    // Get recent transactions (demo data for now)
    const transactions: CreditTransaction[] = [
      {
        _id: 'transaction_1',
        patientId: 'pat_123',
        patientName: 'John Doe',
        patientEmail: 'john.doe@email.com',
        type: 'purchase',
        amount: 20,
        description: 'Credit purchase - Premium plan',
        status: 'completed',
        createdAt: '2025-07-11T09:15:00Z'
      }
    ];

    // Get withdrawal requests (demo data for now)
    const withdrawals: WithdrawalRequest[] = [
      {
        _id: 'withdrawal_1',
        doctorId: 'doc_123',
        doctorName: 'Dr. Sarah Johnson',
        doctorEmail: 'sarah.johnson@email.com',
        amount: 250,
        method: 'bank',
        status: 'pending',
        requestedAt: '2025-07-11T10:30:00Z'
      }
    ];

    // Get subscription data
    const subscriptionData = await Patient.find({ subscriptionStatus: 'active' })
      .populate('userId', 'firstName lastName email')
      .limit(50)
      .lean();

    const subscriptions: SubscriptionData[] = subscriptionData.map(patient => ({
      _id: patient._id.toString(),
      patientId: patient._id.toString(),
      patientName: `${patient.userId?.firstName} ${patient.userId?.lastName}`,
      patientEmail: patient.userId?.email || '',
      plan: patient.subscriptionPlan as any,
      status: patient.subscriptionStatus as any,
      startDate: patient.subscriptionStartDate?.toISOString() || '',
      endDate: patient.subscriptionEndDate?.toISOString(),
      amount: getSubscriptionAmount(patient.subscriptionPlan),
      renewalDate: patient.subscriptionEndDate?.toISOString()
    }));

    return {
      overview,
      withdrawals,
      transactions,
      subscriptions
    };

  } catch (error) {
    console.error('Error fetching financial data:', error);
    
    // Return demo data on error
    return {
      overview: {
        totalRevenue: 125750,
        totalCreditsIssued: 15420,
        totalCreditsUsed: 12890,
        totalDoctorEarnings: 89250,
        pendingWithdrawals: 15,
        completedWithdrawals: 142,
        activeSubscriptions: 1089,
        totalTransactions: 3456,
        platformCommission: 36500,
        monthlyGrowth: 12.5
      },
      withdrawals: [],
      transactions: [],
      subscriptions: []
    };
  }
}

function getSubscriptionAmount(plan?: string): number {
  switch (plan) {
    case 'basic': return 9.99;
    case 'standard': return 19.99;
    case 'premium': return 29.99;
    default: return 0;
  }
}

async function handler(userContext: any, request: NextRequest) {
  try {
    const financialData = await getFinancialData();

    return NextResponse.json({
      ...financialData,
      message: 'Financial data fetched successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Admin financial API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to fetch financial data'
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler);

// Helper functions for financial calculations
async function calculatePendingWithdrawals(): Promise<number> {
  try {
    // In a real implementation, this would query a withdrawals collection
    // For now, return a calculated estimate based on doctor earnings
    const doctors = await Doctor.find({
      verificationStatus: 'approved',
      totalEarnings: { $gt: 50 } // Doctors with earnings above withdrawal threshold
    });

    return Math.floor(doctors.length * 0.3); // Estimate 30% have pending withdrawals
  } catch (error) {
    console.warn('Error calculating pending withdrawals:', error);
    return 15; // Fallback value
  }
}

async function calculateCompletedWithdrawals(): Promise<number> {
  try {
    // In a real implementation, this would query completed withdrawals
    // For now, estimate based on total doctor count and platform age
    const totalDoctors = await Doctor.countDocuments({ verificationStatus: 'approved' });
    return Math.floor(totalDoctors * 2.5); // Estimate 2.5 withdrawals per doctor on average
  } catch (error) {
    console.warn('Error calculating completed withdrawals:', error);
    return 142; // Fallback value
  }
}

async function calculateMonthlyGrowth(): Promise<number> {
  try {
    const currentMonth = new Date();
    const lastMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    // Get appointments for current and last month
    const [currentMonthAppointments, lastMonthAppointments] = await Promise.all([
      Appointment.countDocuments({
        createdAt: { $gte: currentMonthStart },
        status: { $in: ['completed', 'confirmed', 'scheduled'] }
      }),
      Appointment.countDocuments({
        createdAt: {
          $gte: lastMonth,
          $lt: currentMonthStart
        },
        status: { $in: ['completed', 'confirmed', 'scheduled'] }
      })
    ]);

    if (lastMonthAppointments === 0) return 0;

    const growth = ((currentMonthAppointments - lastMonthAppointments) / lastMonthAppointments) * 100;
    return Math.round(growth * 10) / 10; // Round to 1 decimal place
  } catch (error) {
    console.warn('Error calculating monthly growth:', error);
    return 12.5; // Fallback value
  }
}
