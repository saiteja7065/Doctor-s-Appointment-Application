import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { User, UserRole } from '@/lib/models/User';
import { DemoAuthService } from '@/lib/demo-auth';
import { DoctorApplicationWorkflow } from '@/lib/doctor-application-workflow';
import { connectToMongoose } from '@/lib/mongodb';

/**
 * POST /api/admin/doctor-applications/[id]/approve
 * Approve a doctor application and create doctor profile
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🔍 Admin: Approving application ${id}...`);

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
    const { comments } = body;

    // Use workflow to approve application
    const result = await DoctorApplicationWorkflow.approveApplication(
      id,
      adminUserId,
      comments
    );

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: result.error === 'Application not found' ? 404 : 500 });
    }

    console.log(`✅ Application ${id} approved successfully`);

    return NextResponse.json({
      success: result.success,
      message: result.message,
      application: result.application,
      doctor: result.doctor,
      isDemo: result.isDemo
    });

  } catch (error) {
    console.error(`❌ Error approving application ${id}:`, error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/doctor-applications/[id]/reject
 * Reject a doctor application
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🔍 Admin: Rejecting application ${params.id}...`);

    // Check if we're in demo mode
    if (DemoAuthService.isDemoMode()) {
      console.log('🧪 Demo mode: Simulating application rejection');
      
      const body = await request.json();
      const { comments, requestedChanges } = body;

      return NextResponse.json({
        success: true,
        message: 'Application rejected successfully (demo mode)',
        application: {
          _id: params.id,
          status: ApplicationStatus.REJECTED,
          adminReviews: [{
            reviewedBy: 'demo_admin',
            reviewedAt: new Date(),
            status: ApplicationStatus.REJECTED,
            comments: comments || 'Application rejected in demo mode',
            requestedChanges: requestedChanges || []
          }],
          isDemo: true
        }
      });
    }

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

    const applicationId = params.id;
    const body = await request.json();
    const { comments, requestedChanges } = body;

    // Find the application
    const application = await DoctorApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Update application status
    application.status = ApplicationStatus.REJECTED;
    application.adminReviews.push({
      reviewedBy: userId,
      reviewedAt: new Date(),
      status: ApplicationStatus.REJECTED,
      comments: comments || 'Application rejected',
      requestedChanges: requestedChanges || []
    });

    await application.save();

    console.log(`✅ Application ${applicationId} rejected`);

    return NextResponse.json({
      success: true,
      message: 'Application rejected successfully',
      application: {
        _id: application._id,
        status: application.status,
        adminReviews: application.adminReviews
      }
    });

  } catch (error) {
    console.error(`❌ Error rejecting application ${params.id}:`, error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}
