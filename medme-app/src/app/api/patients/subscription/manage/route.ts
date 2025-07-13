import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Patient } from '@/lib/models/Patient';
import Appointment from '@/lib/models/Appointment';
import { withPatientAuth } from '@/lib/auth/rbac';
import { stripe } from '@/lib/stripe';

interface SubscriptionData {
  currentPlan: string;
  status: string;
  nextBillingDate?: string;
  creditsUsed: number;
  creditsRemaining: number;
  totalCredits: number;
  billingCycle: string;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
}

interface UsageAnalytics {
  monthlyUsage: { month: string; credits: number }[];
  averageMonthlyUsage: number;
  peakUsageMonth: string;
  recommendedPlan: string;
}

/**
 * GET /api/patients/subscription/manage
 * Get comprehensive subscription management data including usage analytics
 */
export async function GET(request: NextRequest) {
  return withPatientAuth(async (userContext) => {
    try {
      // Connect to database
      const isConnected = await connectToDatabase();
      if (!isConnected) {
        // Return demo data for development
        const demoData = {
          subscription: {
            currentPlan: 'standard',
            status: 'active',
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            creditsUsed: 15,
            creditsRemaining: 10,
            totalCredits: 25,
            billingCycle: 'monthly',
            autoRenew: true,
            cancelAtPeriodEnd: false
          },
          analytics: {
            monthlyUsage: [
              { month: 'Jan', credits: 18 },
              { month: 'Feb', credits: 22 },
              { month: 'Mar', credits: 15 },
              { month: 'Apr', credits: 25 },
              { month: 'May', credits: 20 },
              { month: 'Jun', credits: 15 }
            ],
            averageMonthlyUsage: 19.2,
            peakUsageMonth: 'April',
            recommendedPlan: 'standard'
          }
        };

        return NextResponse.json({
          success: true,
          ...demoData,
          message: 'Demo subscription management data'
        });
      }

      // Find patient
      const patient = await Patient.findOne({ clerkId: userContext.userId });
      if (!patient) {
        return NextResponse.json(
          { error: 'Patient not found' },
          { status: 404 }
        );
      }

      // Calculate current billing period usage
      const currentDate = new Date();
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      const currentMonthAppointments = await Appointment.find({
        patientId: patient._id,
        status: 'completed',
        createdAt: { $gte: startOfMonth }
      });

      const creditsUsedThisMonth = currentMonthAppointments.length * 2; // 2 credits per appointment
      const totalCreditsForPlan = getPlanCredits(patient.subscriptionPlan);
      const creditsRemaining = Math.max(0, totalCreditsForPlan - creditsUsedThisMonth);

      // Get subscription status from Stripe if customer exists
      let stripeSubscription = null;
      let nextBillingDate = null;
      let cancelAtPeriodEnd = false;

      if (patient.stripeCustomerId) {
        try {
          const subscriptions = await stripe.subscriptions.list({
            customer: patient.stripeCustomerId,
            status: 'active',
            limit: 1
          });

          if (subscriptions.data.length > 0) {
            stripeSubscription = subscriptions.data[0];
            nextBillingDate = new Date(stripeSubscription.current_period_end * 1000).toISOString();
            cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
          }
        } catch (stripeError) {
          console.error('Error fetching Stripe subscription:', stripeError);
        }
      }

      // Build subscription data
      const subscriptionData: SubscriptionData = {
        currentPlan: patient.subscriptionPlan || 'free',
        status: patient.subscriptionStatus || 'inactive',
        nextBillingDate,
        creditsUsed: creditsUsedThisMonth,
        creditsRemaining,
        totalCredits: totalCreditsForPlan,
        billingCycle: stripeSubscription?.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
        autoRenew: patient.subscriptionSettings?.autoRenew !== false,
        cancelAtPeriodEnd
      };

      // Calculate usage analytics for the past 6 months
      const monthlyUsage = [];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const startOfAnalysisMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfAnalysisMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthAppointments = await Appointment.find({
          patientId: patient._id,
          status: 'completed',
          createdAt: { 
            $gte: startOfAnalysisMonth,
            $lte: endOfAnalysisMonth
          }
        });

        monthlyUsage.push({
          month: monthNames[date.getMonth()],
          credits: monthAppointments.length * 2
        });
      }

      // Calculate analytics
      const totalCreditsUsed = monthlyUsage.reduce((sum, month) => sum + month.credits, 0);
      const averageMonthlyUsage = totalCreditsUsed / 6;
      const peakUsageMonth = monthlyUsage.reduce((peak, month) => 
        month.credits > peak.credits ? month : peak
      );

      // Recommend plan based on average usage
      let recommendedPlan = 'free';
      if (averageMonthlyUsage > 25) {
        recommendedPlan = 'premium';
      } else if (averageMonthlyUsage > 10) {
        recommendedPlan = 'standard';
      } else if (averageMonthlyUsage > 2) {
        recommendedPlan = 'basic';
      }

      const usageAnalytics: UsageAnalytics = {
        monthlyUsage,
        averageMonthlyUsage: Math.round(averageMonthlyUsage * 10) / 10,
        peakUsageMonth: peakUsageMonth.month,
        recommendedPlan
      };

      return NextResponse.json({
        success: true,
        subscription: subscriptionData,
        analytics: usageAnalytics
      });

    } catch (error) {
      console.error('Error in subscription management GET:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/patients/subscription/manage
 * Handle subscription management actions (cancel, reactivate, change billing cycle)
 */
export async function POST(request: NextRequest) {
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
        case 'cancel_subscription':
          if (patient.stripeCustomerId) {
            try {
              const subscriptions = await stripe.subscriptions.list({
                customer: patient.stripeCustomerId,
                status: 'active',
                limit: 1
              });

              if (subscriptions.data.length > 0) {
                await stripe.subscriptions.update(subscriptions.data[0].id, {
                  cancel_at_period_end: true
                });

                return NextResponse.json({
                  success: true,
                  message: 'Subscription will be canceled at the end of the current period'
                });
              } else {
                return NextResponse.json(
                  { error: 'No active subscription found' },
                  { status: 404 }
                );
              }
            } catch (stripeError) {
              console.error('Error canceling subscription:', stripeError);
              return NextResponse.json(
                { error: 'Failed to cancel subscription' },
                { status: 500 }
              );
            }
          } else {
            return NextResponse.json(
              { error: 'No Stripe customer found' },
              { status: 400 }
            );
          }

        case 'reactivate_subscription':
          if (patient.stripeCustomerId) {
            try {
              const subscriptions = await stripe.subscriptions.list({
                customer: patient.stripeCustomerId,
                status: 'active',
                limit: 1
              });

              if (subscriptions.data.length > 0) {
                await stripe.subscriptions.update(subscriptions.data[0].id, {
                  cancel_at_period_end: false
                });

                return NextResponse.json({
                  success: true,
                  message: 'Subscription reactivated successfully'
                });
              } else {
                return NextResponse.json(
                  { error: 'No active subscription found' },
                  { status: 404 }
                );
              }
            } catch (stripeError) {
              console.error('Error reactivating subscription:', stripeError);
              return NextResponse.json(
                { error: 'Failed to reactivate subscription' },
                { status: 500 }
              );
            }
          } else {
            return NextResponse.json(
              { error: 'No Stripe customer found' },
              { status: 400 }
            );
          }

        case 'update_settings':
          if (settings) {
            patient.subscriptionSettings = {
              ...patient.subscriptionSettings,
              ...settings
            };
            await patient.save();

            return NextResponse.json({
              success: true,
              message: 'Subscription settings updated successfully'
            });
          } else {
            return NextResponse.json(
              { error: 'Settings object required' },
              { status: 400 }
            );
          }

        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          );
      }

    } catch (error) {
      console.error('Error in subscription management POST:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * Helper function to get plan credits
 */
function getPlanCredits(plan: string): number {
  const planCredits = {
    free: 2,
    basic: 10,
    standard: 25,
    premium: 50
  };
  return planCredits[plan as keyof typeof planCredits] || 2;
}
