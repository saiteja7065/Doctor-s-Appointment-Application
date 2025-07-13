import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Patient } from '@/lib/models/Patient';
import Appointment from '@/lib/models/Appointment';
import { withPatientAuth } from '@/lib/auth/rbac';
import { creditPackages, subscriptionPlans, formatPrice } from '@/lib/stripe';

interface SubscriptionData {
  creditBalance: number;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  totalAppointments: number;
  totalSpent: number;
  transactions: Transaction[];
  availablePackages?: any[];
  availablePlans?: any[];
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
        transactions,
        // Add available packages and plans for frontend
        availablePackages: creditPackages.map(pkg => ({
          ...pkg,
          formattedPrice: formatPrice(pkg.price)
        })),
        availablePlans: subscriptionPlans.map(plan => ({
          ...plan,
          formattedPrice: formatPrice(plan.price)
        })),
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

        // Find the appropriate credit package
        const packageId = body.packageId;
        if (!packageId) {
          return NextResponse.json(
            { error: 'Missing packageId for credit purchase' },
            { status: 400 }
          );
        }

        const creditPackage = creditPackages.find(pkg => pkg.id === packageId);
        if (!creditPackage) {
          return NextResponse.json(
            { error: 'Invalid credit package' },
            { status: 400 }
          );
        }

        // Return checkout URL for Stripe payment
        return NextResponse.json({
          success: true,
          requiresPayment: true,
          checkoutUrl: `/api/payments/checkout`,
          packageId: packageId,
          credits: creditPackage.credits,
          price: creditPackage.price,
          message: 'Redirect to payment processing'
        });

      } else if (action === 'upgrade_plan') {
        if (!planId) {
          return NextResponse.json(
            { error: 'Missing plan ID' },
            { status: 400 }
          );
        }

        // Find the subscription plan
        const plan = subscriptionPlans.find(p => p.id === planId || p.id === `plan_${planId}`);
        if (!plan) {
          return NextResponse.json(
            { error: 'Invalid subscription plan' },
            { status: 400 }
          );
        }

        // Return checkout URL for Stripe subscription
        return NextResponse.json({
          success: true,
          requiresPayment: true,
          checkoutUrl: `/api/payments/checkout`,
          planId: plan.id,
          credits: plan.credits,
          price: plan.price,
          message: 'Redirect to subscription payment processing'
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

/**
 * PATCH /api/patients/subscription
 * Update subscription settings (auto-renewal, billing cycle, etc.)
 */
export async function PATCH(request: NextRequest) {
  return withPatientAuth(async (userContext) => {
    try {
      const body = await request.json();
      const { action, settings } = body;

      if (!action) {
        return NextResponse.json(
          { error: 'Missing required field: action' },
          { status: 400 }
        );
      }

      // Connect to database
      const isConnected = await connectToDatabase();
      if (!isConnected) {
        return NextResponse.json(
          { error: 'Database connection failed' },
          { status: 500 }
        );
      }

      // Find patient
      const patient = await Patient.findOne({ clerkId: userContext.userId });
      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        );
      }

      switch (action) {
        case 'update_settings':
          if (settings) {
            // Update subscription settings
            patient.subscriptionSettings = {
              ...patient.subscriptionSettings,
              ...settings
            };
            await patient.save();

            return NextResponse.json({
              success: true,
              message: 'Subscription settings updated successfully',
              settings: patient.subscriptionSettings
            });
          }
          break;

        case 'toggle_auto_renewal':
          // Toggle auto-renewal setting
          const currentAutoRenew = patient.subscriptionSettings?.autoRenew !== false;
          patient.subscriptionSettings = {
            ...patient.subscriptionSettings,
            autoRenew: !currentAutoRenew
          };
          await patient.save();

          return NextResponse.json({
            success: true,
            message: `Auto-renewal ${!currentAutoRenew ? 'enabled' : 'disabled'}`,
            autoRenew: !currentAutoRenew
          });

        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          );
      }

    } catch (error) {
      console.error('Error in subscription PATCH:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
