import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToMongoose } from '@/lib/mongodb';
import { Patient } from '@/lib/models/Patient';
import { Transaction } from '@/lib/models/Transaction';
import { getSubscription } from '@/lib/stripe';

/**
 * GET /api/payments/status
 * Get comprehensive payment status for the current user
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
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      // Return demo data for development
      return NextResponse.json({
        success: true,
        demo: true,
        data: {
          creditBalance: 5,
          subscriptionPlan: 'free',
          subscriptionStatus: 'inactive',
          stripeCustomerId: null,
          totalSpent: 0,
          totalAppointments: 0,
          recentTransactions: [
            {
              id: 'demo_1',
              type: 'purchase',
              description: 'Welcome bonus credits',
              credits: 2,
              amount: 0,
              date: new Date().toISOString(),
              status: 'completed'
            }
          ],
          subscriptionDetails: null
        }
      });
    }

    // Find patient
    const patient = await Patient.findOne({ clerkId: userId });
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient profile not found' },
        { status: 404 }
      );
    }

    // Get recent transactions
    const recentTransactions = await Transaction.find({ 
      userId: patient._id 
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    // Get subscription details if active
    let subscriptionDetails = null;
    if (patient.stripeCustomerId && patient.subscriptionStatus === 'active') {
      try {
        // This would require the subscription ID to be stored in the patient model
        // For now, we'll return basic subscription info
        subscriptionDetails = {
          plan: patient.subscriptionPlan,
          status: patient.subscriptionStatus,
          startDate: patient.subscriptionStartDate,
          endDate: patient.subscriptionEndDate
        };
      } catch (error) {
        console.error('Error fetching subscription details:', error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        creditBalance: patient.creditBalance,
        subscriptionPlan: patient.subscriptionPlan,
        subscriptionStatus: patient.subscriptionStatus,
        stripeCustomerId: patient.stripeCustomerId,
        totalSpent: patient.totalSpent,
        totalAppointments: patient.totalAppointments,
        recentTransactions: recentTransactions.map(tx => ({
          id: tx._id.toString(),
          type: tx.type,
          description: tx.description,
          credits: tx.credits,
          amount: tx.amount,
          date: tx.createdAt.toISOString(),
          status: tx.status
        })),
        subscriptionDetails
      }
    });

  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to fetch payment status'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/status
 * Update payment status (for admin use or webhook processing)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, amount, description } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json({
        success: true,
        demo: true,
        message: 'Payment status updated (demo mode)',
        action
      });
    }

    // Find patient
    const patient = await Patient.findOne({ clerkId: userId });
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient profile not found' },
        { status: 404 }
      );
    }

    // Handle different actions
    switch (action) {
      case 'add_credits':
        if (typeof amount !== 'number' || amount <= 0) {
          return NextResponse.json(
            { error: 'Invalid amount for adding credits' },
            { status: 400 }
          );
        }
        
        patient.creditBalance += amount;
        await patient.save();

        // Create transaction record
        const addTransaction = new Transaction({
          userId: patient._id,
          clerkId: userId,
          type: 'purchase',
          description: description || `Added ${amount} credits`,
          credits: amount,
          amount: 0, // This would be set by webhook with actual payment amount
          status: 'completed'
        });
        await addTransaction.save();

        return NextResponse.json({
          success: true,
          message: `Added ${amount} credits successfully`,
          newBalance: patient.creditBalance
        });

      case 'deduct_credits':
        if (typeof amount !== 'number' || amount <= 0) {
          return NextResponse.json(
            { error: 'Invalid amount for deducting credits' },
            { status: 400 }
          );
        }

        if (patient.creditBalance < amount) {
          return NextResponse.json(
            { error: 'Insufficient credits' },
            { status: 400 }
          );
        }

        patient.creditBalance -= amount;
        await patient.save();

        // Create transaction record
        const deductTransaction = new Transaction({
          userId: patient._id,
          clerkId: userId,
          type: 'usage',
          description: description || `Used ${amount} credits`,
          credits: -amount,
          amount: 0,
          status: 'completed'
        });
        await deductTransaction.save();

        return NextResponse.json({
          success: true,
          message: `Deducted ${amount} credits successfully`,
          newBalance: patient.creditBalance
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error updating payment status:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to update payment status'
      },
      { status: 500 }
    );
  }
}
