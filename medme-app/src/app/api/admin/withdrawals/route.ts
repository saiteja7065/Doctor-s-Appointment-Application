import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { User, UserRole } from '@/lib/models/User';
import { Doctor } from '@/lib/models/Doctor';
import { WithdrawalRequest, WithdrawalStatus } from '@/lib/models/DoctorEarnings';
import { EarningsService } from '@/lib/services/earningsService';

/**
 * GET /api/admin/withdrawals
 * Get all withdrawal requests for admin review
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
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return demo data for development
      const demoRequests = [
        {
          id: 'demo_1',
          requestId: 'WR_1234567890',
          doctorName: 'Dr. John Smith',
          doctorEmail: 'john.smith@example.com',
          amount: 150,
          method: 'bank_transfer',
          status: 'pending',
          requestDate: new Date().toISOString(),
          bankDetails: {
            accountHolderName: 'John Smith',
            accountNumber: '1234567890',
            routingNumber: '123456789',
            bankName: 'Example Bank'
          },
          notes: 'Regular monthly withdrawal'
        },
        {
          id: 'demo_2',
          requestId: 'WR_0987654321',
          doctorName: 'Dr. Sarah Johnson',
          doctorEmail: 'sarah.johnson@example.com',
          amount: 75,
          method: 'paypal',
          status: 'processing',
          requestDate: new Date(Date.now() - 86400000).toISOString(),
          processedDate: new Date().toISOString(),
          paypalEmail: 'sarah.johnson@paypal.com'
        }
      ];

      return NextResponse.json({
        success: true,
        requests: demoRequests,
        message: 'Demo withdrawal requests data'
      });
    }

    // Check if user is admin
    const user = await User.findOne({ clerkId: userId });
    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get withdrawal requests with doctor information
    const withdrawalRequests = await WithdrawalRequest.aggregate([
      {
        $lookup: {
          from: 'doctors',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctor'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'clerkId',
          foreignField: 'clerkId',
          as: 'user'
        }
      },
      {
        $unwind: '$doctor'
      },
      {
        $unwind: '$user'
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $project: {
          requestId: 1,
          amount: 1,
          method: 1,
          status: 1,
          requestDate: 1,
          processedDate: 1,
          completedDate: 1,
          bankDetails: 1,
          paypalEmail: 1,
          upiId: 1,
          notes: 1,
          adminNotes: 1,
          transactionId: 1,
          failureReason: 1,
          doctorName: {
            $concat: ['$doctor.firstName', ' ', '$doctor.lastName']
          },
          doctorEmail: '$user.email',
          createdAt: 1
        }
      }
    ]);

    const formattedRequests = withdrawalRequests.map(request => ({
      id: request._id.toString(),
      requestId: request.requestId,
      doctorName: request.doctorName,
      doctorEmail: request.doctorEmail,
      amount: request.amount,
      method: request.method,
      status: request.status,
      requestDate: request.requestDate || request.createdAt,
      processedDate: request.processedDate,
      completedDate: request.completedDate,
      bankDetails: request.bankDetails,
      paypalEmail: request.paypalEmail,
      upiId: request.upiId,
      notes: request.notes,
      adminNotes: request.adminNotes,
      transactionId: request.transactionId,
      failureReason: request.failureReason
    }));

    return NextResponse.json({
      success: true,
      requests: formattedRequests
    });

  } catch (error) {
    console.error('Error in admin withdrawals GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/withdrawals
 * Process withdrawal requests (approve, reject, complete)
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
    const { action, requestId, status, adminNotes, transactionId, failureReason } = body;

    if (!action || !requestId) {
      return NextResponse.json(
        { error: 'Missing required fields: action, requestId' },
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

    // Check if user is admin
    const user = await User.findOne({ clerkId: userId });
    if (!user || user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'process_withdrawal':
        if (!status) {
          return NextResponse.json(
            { error: 'Status is required for processing withdrawal' },
            { status: 400 }
          );
        }

        // Validate status
        if (!Object.values(WithdrawalStatus).includes(status)) {
          return NextResponse.json(
            { error: 'Invalid withdrawal status' },
            { status: 400 }
          );
        }

        try {
          const updatedRequest = await EarningsService.processWithdrawalRequest(
            requestId,
            status,
            adminNotes,
            transactionId,
            failureReason
          );

          if (!updatedRequest) {
            return NextResponse.json(
              { error: 'Withdrawal request not found' },
              { status: 404 }
            );
          }

          return NextResponse.json({
            success: true,
            message: `Withdrawal request ${status} successfully`,
            request: {
              id: updatedRequest._id.toString(),
              requestId: updatedRequest.requestId,
              status: updatedRequest.status,
              adminNotes: updatedRequest.adminNotes,
              transactionId: updatedRequest.transactionId,
              processedDate: updatedRequest.processedDate,
              completedDate: updatedRequest.completedDate
            }
          });
        } catch (serviceError: any) {
          return NextResponse.json(
            { error: serviceError.message || 'Failed to process withdrawal request' },
            { status: 400 }
          );
        }

      case 'bulk_process':
        const { requestIds, bulkStatus, bulkAdminNotes } = body;
        
        if (!requestIds || !Array.isArray(requestIds) || !bulkStatus) {
          return NextResponse.json(
            { error: 'Request IDs array and bulk status are required' },
            { status: 400 }
          );
        }

        const bulkResults = [];
        for (const reqId of requestIds) {
          try {
            const result = await EarningsService.processWithdrawalRequest(
              reqId,
              bulkStatus,
              bulkAdminNotes
            );
            bulkResults.push({ requestId: reqId, success: true, result });
          } catch (error: any) {
            bulkResults.push({ requestId: reqId, success: false, error: error.message });
          }
        }

        return NextResponse.json({
          success: true,
          message: `Bulk processing completed`,
          results: bulkResults
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error in admin withdrawals POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
