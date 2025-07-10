import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import { Doctor } from '@/lib/models/Doctor';

// Connect to MongoDB
async function connectToDatabase() {
  if (mongoose.connections[0].readyState) {
    return true;
  }

  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('demo:demo')) {
    console.warn('MongoDB URI not configured or using placeholder. Database features will be disabled.');
    return false;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}

// Demo earnings data
const DEMO_EARNINGS = {
  totalEarnings: 156,
  availableBalance: 124,
  pendingBalance: 32,
  totalWithdrawn: 200,
  thisMonthEarnings: 78,
  lastMonthEarnings: 64,
  totalConsultations: 78,
  averagePerConsultation: 2
};

const DEMO_TRANSACTIONS = [
  {
    id: '1',
    type: 'earning',
    amount: 2,
    description: 'Video consultation completed',
    patientName: 'Sarah Johnson',
    appointmentId: 'apt_001',
    status: 'completed',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    type: 'earning',
    amount: 2,
    description: 'Video consultation completed',
    patientName: 'Michael Chen',
    appointmentId: 'apt_002',
    status: 'completed',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    type: 'withdrawal',
    amount: -50,
    description: 'Withdrawal to bank account',
    status: 'completed',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '4',
    type: 'earning',
    amount: 2,
    description: 'Video consultation completed',
    patientName: 'Emily Davis',
    appointmentId: 'apt_003',
    status: 'completed',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '5',
    type: 'earning',
    amount: 2,
    description: 'Video consultation completed',
    patientName: 'David Wilson',
    appointmentId: 'apt_004',
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  }
];

const DEMO_WITHDRAWALS = [
  {
    id: '1',
    amount: 50,
    method: 'bank',
    status: 'completed',
    requestedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    processedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    amount: 100,
    method: 'paypal',
    status: 'completed',
    requestedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    processedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// GET - Fetch doctor's earnings data
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('timeFilter') || 'all';

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return demo earnings data
      console.log('Database not available, returning demo earnings data');
      
      let filteredTransactions = [...DEMO_TRANSACTIONS];
      
      // Apply time filter
      if (timeFilter !== 'all') {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        switch (timeFilter) {
          case 'today':
            filteredTransactions = filteredTransactions.filter(t => t.date === today);
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            filteredTransactions = filteredTransactions.filter(t => t.date >= weekAgo);
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            filteredTransactions = filteredTransactions.filter(t => t.date >= monthAgo);
            break;
        }
      }
      
      return NextResponse.json(
        {
          earnings: DEMO_EARNINGS,
          transactions: filteredTransactions,
          withdrawals: DEMO_WITHDRAWALS,
          message: 'Demo earnings data'
        },
        { status: 200 }
      );
    }

    // Find doctor by clerkId
    const doctor = await Doctor.findOne({ clerkId: userId });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor profile not found' },
        { status: 404 }
      );
    }

    // TODO: Implement actual earnings calculation from database
    // For now, return demo data even when database is connected
    let filteredTransactions = [...DEMO_TRANSACTIONS];
    
    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      switch (timeFilter) {
        case 'today':
          filteredTransactions = filteredTransactions.filter(t => t.date === today);
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          filteredTransactions = filteredTransactions.filter(t => t.date >= weekAgo);
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          filteredTransactions = filteredTransactions.filter(t => t.date >= monthAgo);
          break;
      }
    }

    return NextResponse.json(
      {
        earnings: {
          ...DEMO_EARNINGS,
          totalEarnings: doctor.totalEarnings || DEMO_EARNINGS.totalEarnings,
          totalConsultations: doctor.totalConsultations || DEMO_EARNINGS.totalConsultations
        },
        transactions: filteredTransactions,
        withdrawals: DEMO_WITHDRAWALS,
        doctorId: doctor._id
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error fetching earnings data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Request withdrawal
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { amount, method, accountDetails } = body;

    // Validate required fields
    if (!amount || !method) {
      return NextResponse.json(
        { error: 'Amount and withdrawal method are required' },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount < 10) {
      return NextResponse.json(
        { error: 'Minimum withdrawal amount is 10 credits' },
        { status: 400 }
      );
    }

    // Validate method
    const validMethods = ['bank', 'paypal', 'upi'];
    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { error: 'Invalid withdrawal method' },
        { status: 400 }
      );
    }

    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      // Return success response for demo mode
      console.log('Database not available, returning success response for withdrawal request');
      return NextResponse.json(
        {
          message: 'Withdrawal request submitted successfully (demo mode)',
          withdrawalId: 'demo_' + Date.now(),
          amount,
          method,
          status: 'pending',
          estimatedProcessingTime: '2-5 business days'
        },
        { status: 201 }
      );
    }

    // Find doctor by clerkId
    const doctor = await Doctor.findOne({ clerkId: userId });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Doctor profile not found' },
        { status: 404 }
      );
    }

    // Check available balance (using demo data for now)
    const availableBalance = DEMO_EARNINGS.availableBalance;
    if (amount > availableBalance) {
      return NextResponse.json(
        { error: 'Insufficient balance for withdrawal' },
        { status: 400 }
      );
    }

    // TODO: Implement actual withdrawal request creation in database
    // For now, return demo response
    console.log(`Withdrawal request created for doctor ${userId}: ${amount} credits via ${method}`);

    return NextResponse.json(
      {
        message: 'Withdrawal request submitted successfully',
        withdrawalId: 'demo_' + Date.now(),
        amount,
        method,
        status: 'pending',
        estimatedProcessingTime: '2-5 business days'
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error processing withdrawal request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
