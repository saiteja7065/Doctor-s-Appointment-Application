import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Patient } from '@/lib/models/Patient';
import Appointment from '@/lib/models/Appointment';
import { withPatientAuth } from '@/lib/auth/rbac';

interface SubscriptionData {
  creditBalance: number;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  totalAppointments: number;
  totalSpent: number;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  type: 'purchase' | 'usage' | 'refund' | 'bonus';
  description: string;
  credits: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  appointmentId?: string;
}

/**
 * GET /api/patients/subscription
 * Get patient subscription data and transaction history
 */
export async function GET(request: NextRequest) {
  return withPatientAuth(async (userContext) => {
    try {
      // Connect to database
      const isConnected = await connectToDatabase();
      if (!isConnected) {
        // Return demo subscription data
        const demoData: SubscriptionData = {
          creditBalance: 2,
          subscriptionPlan: 'free',
          subscriptionStatus: 'inactive',
          totalAppointments: 0,
          totalSpent: 0,
          transactions: [
            {
              id: 'demo_1',
              type: 'bonus',
              description: 'Welcome bonus - Free credits for new patients',
              credits: 2,
              date: new Date().toISOString(),
              status: 'completed'
            }
          ]
        };

        return NextResponse.json({
          ...demoData,
          message: 'Demo subscription data'
        });
      }

      // Find patient
      const patient = await Patient.findOne({ clerkId: userContext.userId });
      if (!patient) {
        return NextResponse.json(
          { error: 'Patient profile not found' },
          { status: 404 }
        );
      }

      // Get recent appointments for transaction history
      const recentAppointments = await Appointment.find({
        patientId: patient._id,
        status: { $in: ['completed', 'cancelled'] }
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('doctorId', 'specialty');

      // Build transaction history
      const transactions: Transaction[] = [];

      // Add welcome bonus transaction if this is a new patient
      if (patient.totalAppointments === 0 && patient.creditBalance >= 2) {
        transactions.push({
          id: 'welcome_bonus',
          type: 'bonus',
          description: 'Welcome bonus - Free credits for new patients',
          credits: 2,
          date: patient.createdAt.toISOString(),
          status: 'completed'
        });
      }

      // Add appointment transactions
      recentAppointments.forEach(appointment => {
        if (appointment.status === 'completed') {
          transactions.push({
            id: appointment._id.toString(),
            type: 'usage',
            description: `Video consultation - ${appointment.topic}`,
            credits: -appointment.consultationFee,
            date: appointment.createdAt.toISOString(),
            status: 'completed',
            appointmentId: appointment._id.toString()
          });
        } else if (appointment.status === 'cancelled' && appointment.cancelledBy === 'patient') {
          // Check if this was a refunded cancellation
          const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.appointmentTime}:00`);
          const cancellationTime = appointment.updatedAt;
          const hoursBeforeAppointment = (appointmentDateTime.getTime() - cancellationTime.getTime()) / (1000 * 60 * 60);
          
          if (hoursBeforeAppointment >= 24) {
            transactions.push({
              id: `refund_${appointment._id}`,
              type: 'refund',
              description: `Refund for cancelled appointment - ${appointment.topic}`,
              credits: appointment.consultationFee,
              date: appointment.updatedAt.toISOString(),
              status: 'completed',
              appointmentId: appointment._id.toString()
            });
          }
        }
      });

      // Sort transactions by date (newest first)
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const subscriptionData: SubscriptionData = {
        creditBalance: patient.creditBalance,
        subscriptionPlan: patient.subscriptionPlan,
        subscriptionStatus: patient.subscriptionStatus,
        subscriptionStartDate: patient.subscriptionStartDate?.toISOString(),
        subscriptionEndDate: patient.subscriptionEndDate?.toISOString(),
        totalAppointments: patient.totalAppointments,
        totalSpent: patient.totalSpent,
        transactions
      };

      return NextResponse.json(subscriptionData);

    } catch (error) {
      console.error('Error fetching subscription data:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/patients/subscription
 * Purchase credits or upgrade subscription plan
 */
export async function POST(request: NextRequest) {
  return withPatientAuth(async (userContext) => {
    try {
      const body = await request.json();
      const { action, planId, credits, paymentMethod } = body;

      if (!action) {
        return NextResponse.json(
          { error: 'Missing required field: action' },
          { status: 400 }
        );
      }

      // Connect to database
      const isConnected = await connectToDatabase();
      if (!isConnected) {
        // Return demo success response
        return NextResponse.json({
          success: true,
          message: 'Purchase completed successfully (demo mode)',
          action,
          planId,
          credits,
          newBalance: 10 // Demo balance
        });
      }

      // Find patient
      const patient = await Patient.findOne({ clerkId: userContext.userId });
      if (!patient) {
        return NextResponse.json(
          { error: 'Patient profile not found' },
          { status: 404 }
        );
      }

      if (action === 'purchase_credits') {
        if (!credits || credits <= 0) {
          return NextResponse.json(
            { error: 'Invalid credits amount' },
            { status: 400 }
          );
        }

        // In a real implementation, you would:
        // 1. Process payment with Stripe
        // 2. Verify payment success
        // 3. Add credits to patient account

        // For demo purposes, we'll just add the credits
        patient.creditBalance += credits;
        await patient.save();

        return NextResponse.json({
          success: true,
          message: 'Credits purchased successfully',
          creditsAdded: credits,
          newBalance: patient.creditBalance
        });

      } else if (action === 'upgrade_plan') {
        if (!planId) {
          return NextResponse.json(
            { error: 'Missing plan ID' },
            { status: 400 }
          );
        }

        // Validate plan
        const validPlans = ['free', 'basic', 'premium', 'unlimited'];
        if (!validPlans.includes(planId)) {
          return NextResponse.json(
            { error: 'Invalid plan ID' },
            { status: 400 }
          );
        }

        // In a real implementation, you would:
        // 1. Process payment with Stripe
        // 2. Set up recurring subscription
        // 3. Update patient subscription

        // For demo purposes, we'll just update the plan
        patient.subscriptionPlan = planId;
        patient.subscriptionStatus = planId === 'free' ? 'inactive' : 'active';
        patient.subscriptionStartDate = new Date();
        
        // Add plan credits
        const planCredits = {
          free: 0,
          basic: 10,
          premium: 30,
          unlimited: 999
        };
        
        patient.creditBalance += planCredits[planId as keyof typeof planCredits];
        await patient.save();

        return NextResponse.json({
          success: true,
          message: 'Subscription upgraded successfully',
          newPlan: planId,
          creditsAdded: planCredits[planId as keyof typeof planCredits],
          newBalance: patient.creditBalance
        });

      } else {
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
      }

    } catch (error) {
      console.error('Error processing subscription request:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
