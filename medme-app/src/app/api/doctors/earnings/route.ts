import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { Doctor } from '@/lib/models/Doctor';
import { EarningsService } from '@/lib/services/earningsService';
import { WithdrawalMethod } from '@/lib/models/DoctorEarnings';
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

    // Get comprehensive earnings data using the new earnings service
    const doctorEarnings = await EarningsService.getDoctorEarnings(doctor._id);
    const earningTransactions = await EarningsService.getEarningTransactions(doctor._id, 50);
    const withdrawalRequests = await EarningsService.getWithdrawalRequests(doctor._id, 20);

    // If no earnings record exists, create one
    if (!doctorEarnings) {
      await EarningsService.updateDoctorEarnings(doctor._id, userId);
      const newEarnings = await EarningsService.getDoctorEarnings(doctor._id);

      const earningsData = {
        totalEarnings: newEarnings?.totalEarnings || 0,
        availableBalance: newEarnings?.availableBalance || 0,
        pendingPayments: newEarnings?.pendingEarnings || 0,
        monthlyEarnings: newEarnings?.thisMonthEarnings || 0,
        lastMonthEarnings: newEarnings?.lastMonthEarnings || 0,
        totalConsultations: newEarnings?.totalConsultations || 0,
        averagePerConsultation: newEarnings?.averagePerConsultation || 0,
        transactions: earningTransactions.map(tx => ({
          id: tx._id.toString(),
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          date: tx.createdAt.toISOString(),
          status: tx.status,
          patientName: tx.patientName
        })),
        withdrawals: withdrawalRequests.map(wr => ({
          id: wr._id.toString(),
          requestId: wr.requestId,
          amount: wr.amount,
          method: wr.method,
          status: wr.status,
          requestDate: wr.requestDate.toISOString(),
          processedDate: wr.processedDate?.toISOString(),
          completedDate: wr.completedDate?.toISOString()
        })),
        monthlyData: newEarnings?.monthlyData || []
      };

      return NextResponse.json(earningsData);
    }

    const earningsData = {
      totalEarnings: doctorEarnings.totalEarnings,
      availableBalance: doctorEarnings.availableBalance,
      pendingPayments: doctorEarnings.pendingEarnings,
      monthlyEarnings: doctorEarnings.thisMonthEarnings,
      lastMonthEarnings: doctorEarnings.lastMonthEarnings,
      totalConsultations: doctorEarnings.totalConsultations,
      averagePerConsultation: doctorEarnings.averagePerConsultation,
      transactions: earningTransactions.map(tx => ({
        id: tx._id.toString(),
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        date: tx.createdAt.toISOString(),
        status: tx.status,
        patientName: tx.patientName
      })),
      withdrawals: withdrawalRequests.map(wr => ({
        id: wr._id.toString(),
        requestId: wr.requestId,
        amount: wr.amount,
        method: wr.method,
        status: wr.status,
        requestDate: wr.requestDate.toISOString(),
        processedDate: wr.processedDate?.toISOString(),
        completedDate: wr.completedDate?.toISOString()
      })),
      monthlyData: doctorEarnings.monthlyData
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
      const { method, bankDetails, paypalEmail, upiId } = body;

      if (!method) {
        return NextResponse.json(
          { error: 'Withdrawal method is required' },
          { status: 400 }
        );
      }

      // Validate withdrawal method
      if (!Object.values(WithdrawalMethod).includes(method)) {
        return NextResponse.json(
          { error: 'Invalid withdrawal method' },
          { status: 400 }
        );
      }

      // Prepare payment details based on method
      let paymentDetails: any = {};
      switch (method) {
        case WithdrawalMethod.BANK_TRANSFER:
          if (!bankDetails) {
            return NextResponse.json(
              { error: 'Bank details are required for bank transfer' },
              { status: 400 }
            );
          }
          paymentDetails.bankDetails = bankDetails;
          break;
        case WithdrawalMethod.PAYPAL:
          if (!paypalEmail) {
            return NextResponse.json(
              { error: 'PayPal email is required for PayPal withdrawal' },
              { status: 400 }
            );
          }
          paymentDetails.paypalEmail = paypalEmail;
          break;
        case WithdrawalMethod.UPI:
          if (!upiId) {
            return NextResponse.json(
              { error: 'UPI ID is required for UPI withdrawal' },
              { status: 400 }
            );
          }
          paymentDetails.upiId = upiId;
          break;
      }

      try {
        // Create withdrawal request using the earnings service
        const withdrawalRequest = await EarningsService.createWithdrawalRequest(
          doctor._id,
          userId,
          amount,
          method,
          paymentDetails
        );

        // Send withdrawal request confirmation email
        try {
          await sendWithdrawalRequestConfirmation({
            doctorEmail: user.email,
            doctorName: `${user.firstName} ${user.lastName}`,
            requestId: withdrawalRequest.requestId,
            amount: amount,
            withdrawalMethod: method,
            requestDate: new Date().toLocaleDateString(),
          });
        } catch (emailError) {
          console.error('Failed to send withdrawal request confirmation email:', emailError);
        }

        return NextResponse.json({
          success: true,
          message: 'Withdrawal request submitted successfully',
          transactionId: withdrawalRequest.requestId,
          amount: amount,
          status: 'pending'
        });
      } catch (serviceError: any) {
        return NextResponse.json(
          { error: serviceError.message || 'Failed to create withdrawal request' },
          { status: 400 }
        );
      }
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
