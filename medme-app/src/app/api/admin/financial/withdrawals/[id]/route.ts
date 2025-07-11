import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/rbac';
import { connectToDatabase } from '@/lib/mongodb';
import { Doctor } from '@/lib/models/Doctor';
import { User } from '@/lib/models/User';

async function handler(userContext: any, request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const withdrawalId = params.id;
    const { action, notes } = await request.json();

    // Validate action
    const validActions = ['approve', 'reject'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { 
          error: 'Invalid action',
          message: `Action must be one of: ${validActions.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return success response for demo mode
      console.log('Database not available, returning success response for withdrawal action demo mode');
      return NextResponse.json(
        {
          message: `Withdrawal ${action}d successfully (demo mode)`,
          withdrawalId: withdrawalId,
          action: action,
          status: action === 'approve' ? 'processing' : 'rejected',
          notes: notes || '',
          processedAt: new Date().toISOString(),
          processedBy: userContext.clerkId
        },
        { status: 200 }
      );
    }

    // TODO: Implement actual withdrawal request management
    // For now, we'll simulate the process since we don't have a withdrawal model yet
    
    // In a real implementation, you would:
    // 1. Find the withdrawal request by ID
    // 2. Validate that it's in pending status
    // 3. Update the status based on the action
    // 4. If approved, initiate the actual payment process
    // 5. Log the admin action for audit purposes
    // 6. Send notification to the doctor

    // Simulate finding a withdrawal request
    const mockWithdrawal = {
      _id: withdrawalId,
      doctorId: 'doc_123',
      amount: 250,
      method: 'bank',
      status: 'pending'
    };

    // Log the action
    console.log(`Withdrawal ${withdrawalId} ${action}d by admin ${userContext.clerkId}`);
    if (notes) {
      console.log(`Admin notes: ${notes}`);
    }

    // Simulate processing
    const newStatus = action === 'approve' ? 'processing' : 'rejected';
    
    // TODO: If approved, integrate with payment processor
    if (action === 'approve') {
      console.log(`Initiating payment of $${mockWithdrawal.amount} via ${mockWithdrawal.method}`);
      // Here you would integrate with:
      // - Bank transfer APIs for bank withdrawals
      // - PayPal API for PayPal withdrawals
      // - UPI APIs for UPI withdrawals
    }

    // TODO: Send notification email to doctor
    // This would be implemented with the notification system

    return NextResponse.json(
      {
        message: `Withdrawal ${action}d successfully`,
        withdrawalId: withdrawalId,
        action: action,
        status: newStatus,
        notes: notes || '',
        processedAt: new Date().toISOString(),
        processedBy: userContext.clerkId,
        estimatedCompletionTime: action === 'approve' ? '2-5 business days' : null
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing withdrawal action:', error);
    
    // Handle specific errors
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { 
          error: 'Invalid withdrawal ID',
          message: 'The provided withdrawal ID is not valid.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to process withdrawal action'
      },
      { status: 500 }
    );
  }
}

// GET - Fetch individual withdrawal request details
async function getHandler(userContext: any, request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const withdrawalId = params.id;

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 503 }
      );
    }

    // TODO: Implement actual withdrawal request fetching
    // For now, return demo data
    const mockWithdrawal = {
      _id: withdrawalId,
      doctorId: 'doc_123',
      doctorName: 'Dr. Sarah Johnson',
      doctorEmail: 'sarah.johnson@email.com',
      amount: 250,
      method: 'bank',
      status: 'pending',
      requestedAt: '2025-07-11T10:30:00Z',
      accountDetails: {
        accountHolderName: 'Sarah Johnson',
        accountNumber: '****1234',
        routingNumber: '****5678',
        bankName: 'Chase Bank'
      }
    };

    return NextResponse.json(
      {
        withdrawal: mockWithdrawal,
        message: 'Withdrawal request details fetched successfully'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching withdrawal request details:', error);
    
    if (error instanceof Error && error.message.includes('Cast to ObjectId failed')) {
      return NextResponse.json(
        { 
          error: 'Invalid withdrawal ID',
          message: 'The provided withdrawal ID is not valid.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to fetch withdrawal request details'
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getHandler);
export const PATCH = withAdminAuth(handler);
