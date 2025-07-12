import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { Doctor } from '@/lib/models/Doctor';
import { sendWithdrawalRequestConfirmation } from '@/lib/email';
import { sendNotification } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    
    if (!isConnected) {
      // Return demo data when database is not available
      console.log('Database not available, returning demo earnings data for user:', userId);
      
      const demoEarningsData = {
        totalEarnings: 12450.00,
        availableBalance: 8320.50,
        pendingPayments: 2150.75,
        monthlyEarnings: 3250.00,
        totalConsultations: 156,
        averagePerConsultation: 79.81,
        transactions: [
          {
            id: 'demo_1',
            type: 'consultation',
            amount: 150.00,
            date: new Date().toISOString(),
            status: 'completed',
            patientName: 'John Doe',
            description: 'Video consultation - General checkup'
          },
          {
            id: 'demo_2',
            type: 'consultation',
            amount: 200.00,
            date: new Date(Date.now() - 86400000).toISOString(),
            status: 'completed',
            patientName: 'Jane Smith',
            description: 'Video consultation - Follow-up'
          },
          {
            id: 'demo_3',
            type: 'withdrawal',
            amount: -500.00,
            date: new Date(Date.now() - 172800000).toISOString(),
            status: 'processed',
            description: 'Withdrawal to bank account'
          },
          {
            id: 'demo_4',
            type: 'consultation',
            amount: 175.00,
            date: new Date(Date.now() - 259200000).toISOString(),
            status: 'completed',
            patientName: 'Mike Johnson',
            description: 'Video consultation - Specialist consultation'
          },
          {
            id: 'demo_5',
            type: 'consultation',
            amount: 125.00,
            date: new Date(Date.now() - 345600000).toISOString(),
            status: 'pending',
            patientName: 'Sarah Wilson',
            description: 'Video consultation - Routine checkup'
          }
        ],
        monthlyData: [
          { month: 'Jan', earnings: 2800 },
          { month: 'Feb', earnings: 3200 },
          { month: 'Mar', earnings: 2950 },
          { month: 'Apr', earnings: 3400 },
          { month: 'May', earnings: 3100 },
          { month: 'Jun', earnings: 3250 }
        ]
      };

      return NextResponse.json(demoEarningsData);
    }

    // Find user and verify they are a doctor
    const user = await User.findOne({ clerkId: userId });
    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Access denied. Doctor role required.' }, { status: 403 });
    }

    // Find doctor profile
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    // TODO: Implement actual earnings calculation from appointments/consultations
    // For now, return demo data structure that matches the frontend expectations
    const earningsData = {
      totalEarnings: doctor.earnings?.total || 0,
      availableBalance: doctor.earnings?.available || 0,
      pendingPayments: doctor.earnings?.pending || 0,
      monthlyEarnings: doctor.earnings?.thisMonth || 0,
      totalConsultations: doctor.stats?.totalConsultations || 0,
      averagePerConsultation: doctor.earnings?.averagePerConsultation || 0,
      transactions: doctor.earnings?.transactions || [],
      monthlyData: doctor.earnings?.monthlyData || []
    };

    return NextResponse.json(earningsData);

  } catch (error) {
    console.error('Error fetching doctor earnings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, amount } = body;

    // Connect to database
    const isConnected = await connectToDatabase();
    
    if (!isConnected) {
      // Return demo response when database is not available
      console.log('Database not available, returning demo response for earnings action:', action);
      
      if (action === 'withdraw') {
        return NextResponse.json({
          success: true,
          message: 'Withdrawal request submitted successfully (Demo Mode)',
          transactionId: `demo_withdraw_${Date.now()}`,
          amount: amount,
          status: 'pending'
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Action completed successfully (Demo Mode)'
      });
    }

    // Find user and verify they are a doctor
    const user = await User.findOne({ clerkId: userId });
    if (!user || user.role !== 'doctor') {
      return NextResponse.json({ error: 'Access denied. Doctor role required.' }, { status: 403 });
    }

    // Find doctor profile
    const doctor = await Doctor.findOne({ userId: user._id });
    if (!doctor) {
      return NextResponse.json({ error: 'Doctor profile not found' }, { status: 404 });
    }

    // Handle different actions
    if (action === 'withdraw') {
      const requestId = `withdraw_${Date.now()}`;

      // Send withdrawal request confirmation email
      try {
        await sendWithdrawalRequestConfirmation({
          doctorEmail: user.email,
          doctorName: `${user.firstName} ${user.lastName}`,
          requestId: requestId,
          amount: amount,
          withdrawalMethod: 'Bank Transfer', // Default method
          requestDate: new Date().toLocaleDateString(),
        });
      } catch (emailError) {
        console.error('Failed to send withdrawal request confirmation email:', emailError);
      }

      // Send in-app notification
      try {
        sendNotification(
          user.clerkId,
          'doctor',
          'withdrawalRequested',
          amount.toString(),
          requestId
        );
      } catch (notificationError) {
        console.error('Failed to send withdrawal request notification:', notificationError);
      }

      // TODO: Implement actual withdrawal logic
      // For now, just return success response
      return NextResponse.json({
        success: true,
        message: 'Withdrawal request submitted successfully',
        transactionId: requestId,
        amount: amount,
        status: 'pending'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Action completed successfully'
    });

  } catch (error) {
    console.error('Error processing earnings action:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
