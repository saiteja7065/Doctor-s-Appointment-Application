import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe, formatPrice } from '@/lib/stripe';
import { connectToMongoose } from '@/lib/mongodb';
import { Patient } from '@/lib/models/Patient';
import { Transaction } from '@/lib/models/Transaction';

/**
 * GET /api/payments/management
 * Get comprehensive payment management data for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Connect to database
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      // Return demo data if database is not connected
      return NextResponse.json({
        success: true,
        demo: true,
        data: {
          creditBalance: 5,
          subscriptionPlan: 'basic',
          subscriptionStatus: 'active',
          nextBillingDate: '2025-02-13',
          totalSpent: 89.97,
          recentTransactions: [
            {
              id: 'demo_1',
              type: 'purchase',
              description: 'Credit package - 10 credits',
              credits: 10,
              amount: '$19.99',
              status: 'completed',
              date: '2025-01-10'
            },
            {
              id: 'demo_2',
              type: 'usage',
              description: 'Video consultation with Dr. Smith',
              credits: -2,
              amount: '$0.00',
              status: 'completed',
              date: '2025-01-08'
            }
          ],
          paymentMethods: [
            {
              id: 'pm_demo',
              type: 'card',
              brand: 'visa',
              last4: '4242',
              expiryMonth: 12,
              expiryYear: 2025,
              isDefault: true
            }
          ],
          upcomingCharges: [
            {
              id: 'uc_demo',
              description: 'Basic Plan - Monthly',
              amount: '$29.99',
              date: '2025-02-13',
              status: 'scheduled'
            }
          ]
        }
      });
    }

    // Find patient
    const patient = await Patient.findOne({ clerkId: userId });
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    // Get recent transactions
    const recentTransactions = await Transaction.find({ 
      clerkId: userId 
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

    // Calculate total spent
    const totalSpent = await Transaction.aggregate([
      { $match: { clerkId: userId, type: { $in: ['purchase', 'subscription'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalSpentAmount = totalSpent.length > 0 ? totalSpent[0].total / 100 : 0;

    // Get Stripe customer and payment methods
    let paymentMethods: any[] = [];
    let upcomingCharges: any[] = [];
    let subscriptionInfo: any = null;

    if (patient.stripeCustomerId) {
      try {
        // Get payment methods
        const stripePaymentMethods = await stripe.paymentMethods.list({
          customer: patient.stripeCustomerId,
          type: 'card',
        });

        paymentMethods = stripePaymentMethods.data.map(pm => ({
          id: pm.id,
          type: pm.type,
          brand: pm.card?.brand || 'unknown',
          last4: pm.card?.last4 || '0000',
          expiryMonth: pm.card?.exp_month || 1,
          expiryYear: pm.card?.exp_year || 2025,
          isDefault: false // You might want to track this in your database
        }));

        // Get active subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: patient.stripeCustomerId,
          status: 'active',
          limit: 1
        });

        if (subscriptions.data.length > 0) {
          const subscription = subscriptions.data[0];
          subscriptionInfo = {
            id: subscription.id,
            status: subscription.status,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            planId: subscription.metadata?.planId || 'unknown'
          };

          // Get upcoming invoice
          try {
            const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
              customer: patient.stripeCustomerId,
            });

            if (upcomingInvoice) {
              upcomingCharges.push({
                id: upcomingInvoice.id || 'upcoming',
                description: upcomingInvoice.lines.data[0]?.description || 'Subscription renewal',
                amount: formatPrice(upcomingInvoice.amount_due || 0),
                date: new Date(upcomingInvoice.next_payment_attempt * 1000).toISOString(),
                status: 'scheduled'
              });
            }
          } catch (error) {
            console.warn('Could not retrieve upcoming invoice:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching Stripe data:', error);
      }
    }

    // Format transactions for response
    const formattedTransactions = recentTransactions.map(transaction => ({
      id: transaction._id.toString(),
      type: transaction.type,
      description: transaction.description,
      credits: transaction.credits,
      amount: formatPrice(transaction.amount),
      status: transaction.status,
      date: transaction.createdAt.toISOString().split('T')[0],
      stripePaymentIntentId: transaction.stripePaymentIntentId
    }));

    // Determine subscription plan name
    const subscriptionPlan = subscriptionInfo?.planId 
      ? subscriptionInfo.planId.replace('plan_', '')
      : patient.subscriptionPlan || 'free';

    const responseData = {
      creditBalance: patient.creditBalance || 0,
      subscriptionPlan: subscriptionPlan,
      subscriptionStatus: subscriptionInfo?.status || 'inactive',
      nextBillingDate: subscriptionInfo?.currentPeriodEnd?.toISOString().split('T')[0],
      totalSpent: totalSpentAmount,
      recentTransactions: formattedTransactions,
      paymentMethods: paymentMethods,
      upcomingCharges: upcomingCharges,
      stripeCustomerId: patient.stripeCustomerId
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error in payment management API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/management
 * Update payment management settings
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, ...data } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing action parameter' },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json({
        success: true,
        demo: true,
        message: `Payment management action '${action}' completed (demo mode)`
      });
    }

    // Find patient
    const patient = await Patient.findOne({ clerkId: userId });
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'update_auto_recharge':
        // Update auto-recharge settings
        patient.autoRechargeEnabled = data.enabled;
        patient.autoRechargeThreshold = data.threshold;
        patient.autoRechargeAmount = data.amount;
        await patient.save();
        
        return NextResponse.json({
          success: true,
          message: 'Auto-recharge settings updated'
        });

      case 'update_notifications':
        // Update notification preferences
        patient.emailNotifications = {
          ...patient.emailNotifications,
          payments: data.payments,
          receipts: data.receipts,
          lowCredits: data.lowCredits
        };
        await patient.save();
        
        return NextResponse.json({
          success: true,
          message: 'Notification preferences updated'
        });

      case 'set_default_payment_method':
        // This would typically involve updating Stripe customer default payment method
        if (patient.stripeCustomerId && data.paymentMethodId) {
          try {
            await stripe.customers.update(patient.stripeCustomerId, {
              invoice_settings: {
                default_payment_method: data.paymentMethodId
              }
            });
            
            return NextResponse.json({
              success: true,
              message: 'Default payment method updated'
            });
          } catch (error) {
            console.error('Error updating default payment method:', error);
            return NextResponse.json(
              { error: 'Failed to update default payment method' },
              { status: 500 }
            );
          }
        }
        break;

      case 'cancel_subscription':
        // Cancel active subscription
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
          } catch (error) {
            console.error('Error canceling subscription:', error);
            return NextResponse.json(
              { error: 'Failed to cancel subscription' },
              { status: 500 }
            );
          }
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json(
      { error: 'Action not implemented' },
      { status: 501 }
    );

  } catch (error) {
    console.error('Error in payment management POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
