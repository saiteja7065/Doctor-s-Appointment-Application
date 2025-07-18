import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToMongoose } from '@/lib/mongodb';
import { User, UserRole } from '@/lib/models/User';
import { DemoAuthService } from '@/lib/demo-auth';
import { DoctorApplicationWorkflow } from '@/lib/doctor-application-workflow';

/**
 * POST /api/admin/doctor-applications/[id]/reject
 * Reject a doctor application
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🔍 Admin: Rejecting application ${id}...`);

    // Get admin user ID (if not in demo mode)
    let adminUserId = 'demo_admin';
    if (!DemoAuthService.isDemoMode()) {
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const isConnected = await connectToMongoose();
      if (!isConnected) {
        return NextResponse.json({
          success: false,
          error: 'Database connection failed'
        }, { status: 500 });
      }

      // Check if user is admin
      const user = await User.findOne({ clerkId: userId });
      if (!user || user.role !== UserRole.ADMIN) {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        );
      }

      adminUserId = userId;
    }

    // Get request body
    const body = await request.json();
    const { comments, requestedChanges } = body;

    // Use workflow to reject application
    const result = await DoctorApplicationWorkflow.rejectApplication(
      id,
      adminUserId,
      comments,
      requestedChanges
    );

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: result.error === 'Application not found' ? 404 : 500 });
    }

    console.log(`✅ Application ${id} rejected successfully`);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      application: result.application,
      isDemo: result.isDemo
    });

  } catch (error) {
    console.error(`❌ Error rejecting application ${id}:`, error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
