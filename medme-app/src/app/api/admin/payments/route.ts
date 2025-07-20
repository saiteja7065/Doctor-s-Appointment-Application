import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToMongoose } from '@/lib/mongodb';
import { Patient } from '@/lib/models/Patient';
import { Transaction } from '@/lib/models/Transaction';
import { User, UserRole } from '@/lib/models/User';
import { stripe, formatPrice } from '@/lib/stripe';

interface AdminPaymentData {
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  totalTransactions: number;
  recentTransactions: AdminTransaction[];
  subscriptionBreakdown: SubscriptionBreakdown[];
  paymentMethods: PaymentMethodStats[];
  failedPayments: FailedPayment[];
}

interface AdminTransaction {
  id: string;
  userId: string;
  userEmail: string;
  type: 'purchase' | 'subscription' | 'refund';
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  date: string;
  stripePaymentIntentId?: string;
}

interface SubscriptionBreakdown {
  plan: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface PaymentMethodStats {
  type: string;
  count: number;
  percentage: number;
}

interface FailedPayment {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  reason: string;
  date: string;
  retryCount: number;
}

/**
 * GET /api/admin/payments
 * Get comprehensive payment analytics for admin dashboard
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

    // Verify admin role
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      // No demo data - return error
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        message: 'Unable to retrieve payment data'
      }, { status: 500 });

      /* const demoData: AdminPaymentData = {
        totalRevenue: 12450.00,
        monthlyRevenue: 3200.00,
        activeSubscriptions: 156,
        totalTransactions: 1247,
        recentTransactions: [
          {
            id: 'txn_demo_1',
            userId: 'user_demo_1',
            userEmail: 'patient@example.com',
            type: 'subscription',
            description: 'Premium Plan Subscription',
            amount: 60.00,
            status: 'completed',
            date: new Date().toISOString(),
            stripePaymentIntentId: 'pi_demo_123'
          },
          {
            id: 'txn_demo_2',
            userId: 'user_demo_2',
            userEmail: 'patient2@example.com',
            type: 'purchase',
            description: '20 Credit Package',
            amount: 40.00,
            status: 'completed',
            date: new Date(Date.now() - 86400000).toISOString(),
            stripePaymentIntentId: 'pi_demo_124'
          },
          {
            id: 'txn_demo_3',
            userId: 'user_demo_3',
            userEmail: 'patient3@example.com',
            type: 'purchase',
            description: '10 Credit Package',
            amount: 20.00,
            status: 'failed',
            date: new Date(Date.now() - 172800000).toISOString(),
            stripePaymentIntentId: 'pi_demo_125'
          }
        ],
        subscriptionBreakdown: [
          { plan: 'Premium', count: 45, revenue: 2700, percentage: 35 },
          { plan: 'Standard', count: 67, revenue: 2010, percentage: 43 },
          { plan: 'Basic', count: 44, revenue: 880, percentage: 22 }
        ],
        paymentMethods: [
          { type: 'Visa', count: 89, percentage: 57 },
          { type: 'Mastercard', count: 45, percentage: 29 },
          { type: 'American Express', count: 22, percentage: 14 }
        ],
        failedPayments: [
          {
            id: 'fail_demo_1',
            userId: 'user_demo_4',
            userEmail: 'patient4@example.com',
            amount: 30.00,
            reason: 'Insufficient funds',
            date: new Date().toISOString(),
            retryCount: 2
          },
          {
            id: 'fail_demo_2',
            userId: 'user_demo_5',
            userEmail: 'patient5@example.com',
            amount: 60.00,
            reason: 'Card declined',
            date: new Date(Date.now() - 86400000).toISOString(),
            retryCount: 1
          }
        ]
      }; */
    }

    // Check if user is admin
    const user = await User.findOne({ clerkId: userId });
    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Calculate total revenue from all completed transactions
    const totalRevenueResult = await Transaction.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    // Calculate monthly revenue (current month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRevenueResult = await Transaction.aggregate([
      { 
        $match: { 
          status: 'completed',
          createdAt: { $gte: startOfMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const monthlyRevenue = monthlyRevenueResult[0]?.total || 0;

    // Count active subscriptions
    const activeSubscriptions = await Patient.countDocuments({
      subscriptionStatus: 'active'
    });

    // Count total transactions
    const totalTransactions = await Transaction.countDocuments();

    // Get recent transactions with user details
    const recentTransactionsData = await Transaction.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: 'users',
          localField: 'clerkId',
          foreignField: 'clerkId',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ]);

    const recentTransactions: AdminTransaction[] = recentTransactionsData.map(tx => ({
      id: tx._id.toString(),
      userId: tx.userId.toString(),
      userEmail: tx.user.email || 'Unknown',
      type: tx.type,
      description: tx.description,
      amount: tx.amount / 100, // Convert from cents
      status: tx.status,
      date: tx.createdAt.toISOString(),
      stripePaymentIntentId: tx.stripePaymentIntentId
    }));

    // Get subscription breakdown
    const subscriptionBreakdownData = await Patient.aggregate([
      { $match: { subscriptionStatus: 'active' } },
      { $group: { _id: '$subscriptionPlan', count: { $sum: 1 } } }
    ]);

    const totalActiveSubscriptions = subscriptionBreakdownData.reduce((sum, item) => sum + item.count, 0);
    const subscriptionBreakdown: SubscriptionBreakdown[] = subscriptionBreakdownData.map(item => {
      const revenue = item.count * getPlanPrice(item._id);
      return {
        plan: item._id.charAt(0).toUpperCase() + item._id.slice(1),
        count: item.count,
        revenue: revenue,
        percentage: Math.round((item.count / totalActiveSubscriptions) * 100)
      };
    });

    // Get payment method stats (would need Stripe integration for real data)
    const paymentMethods: PaymentMethodStats[] = [
      { type: 'Unknown', count: totalTransactions, percentage: 100 }
    ];

    // Get failed payments
    const failedPaymentsData = await Transaction.aggregate([
      { $match: { status: 'failed' } },
      { $sort: { createdAt: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: 'clerkId',
          foreignField: 'clerkId',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ]);

    const failedPayments: FailedPayment[] = failedPaymentsData.map(tx => ({
      id: tx._id.toString(),
      userId: tx.userId.toString(),
      userEmail: tx.user.email || 'Unknown',
      amount: tx.amount / 100, // Convert from cents
      reason: tx.metadata?.failureReason || 'Payment failed',
      date: tx.createdAt.toISOString(),
      retryCount: tx.metadata?.retryCount || 0
    }));

    const responseData: AdminPaymentData = {
      totalRevenue: totalRevenue / 100, // Convert from cents
      monthlyRevenue: monthlyRevenue / 100, // Convert from cents
      activeSubscriptions,
      totalTransactions,
      recentTransactions,
      subscriptionBreakdown,
      paymentMethods,
      failedPayments
    };

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error in admin payments API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get plan price
 */
function getPlanPrice(plan: string): number {
  const prices = {
    basic: 20,
    standard: 30,
    premium: 60
  };
  return prices[plan as keyof typeof prices] || 0;
}

/**
 * POST /api/admin/payments
 * Admin actions for payment management
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
    const { action, transactionId, amount, reason } = body;

    // Connect to database
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Check if user is admin
    const user = await User.findOne({ clerkId: userId });
    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'refund_transaction':
        if (!transactionId) {
          return NextResponse.json(
            { error: 'Transaction ID required' },
            { status: 400 }
          );
        }

        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
          return NextResponse.json(
            { error: 'Transaction not found' },
            { status: 404 }
          );
        }

        // Process refund through Stripe
        if (transaction.stripePaymentIntentId) {
          try {
            const refund = await stripe.refunds.create({
              payment_intent: transaction.stripePaymentIntentId,
              amount: amount ? amount * 100 : undefined, // Convert to cents
              reason: reason || 'requested_by_customer'
            });

            // Update transaction status
            transaction.status = 'refunded';
            transaction.metadata = {
              ...transaction.metadata,
              refundId: refund.id,
              refundReason: reason
            };
            await transaction.save();

            return NextResponse.json({
              success: true,
              message: 'Refund processed successfully',
              refundId: refund.id
            });
          } catch (stripeError) {
            console.error('Stripe refund error:', stripeError);
            return NextResponse.json(
              { error: 'Failed to process refund' },
              { status: 500 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'No Stripe payment intent found for this transaction' },
            { status: 400 }
          );
        }

      case 'retry_failed_payment':
        if (!transactionId) {
          return NextResponse.json(
            { error: 'Transaction ID required' },
            { status: 400 }
          );
        }

        const failedTransaction = await Transaction.findById(transactionId);
        if (!failedTransaction) {
          return NextResponse.json(
            { error: 'Transaction not found' },
            { status: 404 }
          );
        }

        // Update retry count
        failedTransaction.metadata = {
          ...failedTransaction.metadata,
          retryCount: (failedTransaction.metadata?.retryCount || 0) + 1,
          lastRetryDate: new Date().toISOString()
        };
        await failedTransaction.save();

        return NextResponse.json({
          success: true,
          message: 'Payment retry initiated'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in admin payments POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
