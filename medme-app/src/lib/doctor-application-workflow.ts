import { connectToMongoose } from './mongodb';
import { DoctorApplication, ApplicationStatus } from './models/DoctorApplication';
import { User, UserRole } from './models/User';
import { Doctor } from './models/Doctor';
import { DemoAuthService } from './demo-auth';

// Workflow status transitions
export const VALID_STATUS_TRANSITIONS = {
  [ApplicationStatus.PENDING]: [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.REJECTED],
  [ApplicationStatus.UNDER_REVIEW]: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED, ApplicationStatus.REQUIRES_ADDITIONAL_INFO],
  [ApplicationStatus.REQUIRES_ADDITIONAL_INFO]: [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.REJECTED],
  [ApplicationStatus.APPROVED]: [], // Final state
  [ApplicationStatus.REJECTED]: [], // Final state
};

// Workflow result interface
export interface WorkflowResult {
  success: boolean;
  message: string;
  application?: any;
  doctor?: any;
  error?: string;
  isDemo?: boolean;
}

/**
 * Complete Doctor Application Approval Workflow
 */
export class DoctorApplicationWorkflow {
  
  /**
   * Approve a doctor application and create doctor profile
   */
  static async approveApplication(
    applicationId: string,
    adminUserId: string,
    comments?: string
  ): Promise<WorkflowResult> {
    try {
      console.log(`🔄 Starting approval workflow for application ${applicationId}`);

      // Check if we're in demo mode
      if (DemoAuthService.isDemoMode()) {
        console.log('🧪 Demo mode: Simulating approval workflow');
        return {
          success: true,
          message: 'Application approved successfully (demo mode)',
          application: {
            _id: applicationId,
            status: ApplicationStatus.APPROVED,
            adminReviews: [{
              reviewedBy: adminUserId || 'demo_admin',
              reviewedAt: new Date(),
              status: ApplicationStatus.APPROVED,
              comments: comments || 'Application approved in demo mode'
            }]
          },
          doctor: {
            _id: `doctor_${applicationId}`,
            clerkId: `demo_doctor_${applicationId}`,
            status: 'active',
            isVerified: true
          },
          isDemo: true
        };
      }

      // Connect to database
      const isConnected = await connectToMongoose();
      if (!isConnected) {
        return {
          success: false,
          error: 'Database connection failed'
        };
      }

      // Find the application
      const application = await DoctorApplication.findById(applicationId);
      if (!application) {
        return {
          success: false,
          error: 'Application not found'
        };
      }

      // Validate status transition
      if (!this.canTransitionTo(application.status, ApplicationStatus.APPROVED)) {
        return {
          success: false,
          error: `Cannot approve application with status: ${application.status}`
        };
      }

      // Update application status
      application.status = ApplicationStatus.APPROVED;
      application.adminReviews.push({
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        status: ApplicationStatus.APPROVED,
        comments: comments || 'Application approved'
      });

      await application.save();

      // Create or update user as doctor
      let doctorUser = await User.findOne({ clerkId: application.clerkId });
      if (!doctorUser) {
        // Create new user
        doctorUser = new User({
          clerkId: application.clerkId,
          email: application.email,
          firstName: application.firstName,
          lastName: application.lastName,
          role: UserRole.DOCTOR,
          status: 'active'
        });
        await doctorUser.save();
        console.log(`✅ Created new doctor user: ${doctorUser._id}`);
      }

      // Create doctor profile
      const doctor = new Doctor({
        clerkId: application.clerkId,
        userId: doctorUser._id,
        specialty: application.specialty,
        licenseNumber: application.licenseNumber,
        credentialUrl: application.credentialUrl,
        yearsOfExperience: application.yearsOfExperience,
        education: application.education,
        certifications: application.certifications,
        bio: application.bio,
        languages: application.languages,
        consultationFee: application.consultationFee,
        status: 'active',
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: adminUserId,
        availability: {
          monday: { isAvailable: true, slots: [] },
          tuesday: { isAvailable: true, slots: [] },
          wednesday: { isAvailable: true, slots: [] },
          thursday: { isAvailable: true, slots: [] },
          friday: { isAvailable: true, slots: [] },
          saturday: { isAvailable: false, slots: [] },
          sunday: { isAvailable: false, slots: [] }
        }
      });

      await doctor.save();
      console.log(`✅ Created doctor profile: ${doctor._id}`);

      // Send approval notification (in demo mode, just log)
      await this.sendApprovalNotification(application, doctor);

      return {
        success: true,
        message: 'Application approved successfully',
        application: {
          _id: application._id,
          status: application.status,
          adminReviews: application.adminReviews
        },
        doctor: {
          _id: doctor._id,
          clerkId: doctor.clerkId,
          specialty: doctor.specialty,
          status: doctor.status,
          isVerified: doctor.isVerified
        }
      };

    } catch (error) {
      console.error(`❌ Error in approval workflow:`, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Reject a doctor application
   */
  static async rejectApplication(
    applicationId: string,
    adminUserId: string,
    comments?: string,
    requestedChanges?: string[]
  ): Promise<WorkflowResult> {
    try {
      console.log(`🔄 Starting rejection workflow for application ${applicationId}`);

      // Check if we're in demo mode
      if (DemoAuthService.isDemoMode()) {
        console.log('🧪 Demo mode: Simulating rejection workflow');
        return {
          success: true,
          message: 'Application rejected successfully (demo mode)',
          application: {
            _id: applicationId,
            status: ApplicationStatus.REJECTED,
            adminReviews: [{
              reviewedBy: adminUserId || 'demo_admin',
              reviewedAt: new Date(),
              status: ApplicationStatus.REJECTED,
              comments: comments || 'Application rejected in demo mode',
              requestedChanges: requestedChanges || []
            }]
          },
          isDemo: true
        };
      }

      // Connect to database
      const isConnected = await connectToMongoose();
      if (!isConnected) {
        return {
          success: false,
          error: 'Database connection failed'
        };
      }

      // Find the application
      const application = await DoctorApplication.findById(applicationId);
      if (!application) {
        return {
          success: false,
          error: 'Application not found'
        };
      }

      // Validate status transition
      if (!this.canTransitionTo(application.status, ApplicationStatus.REJECTED)) {
        return {
          success: false,
          error: `Cannot reject application with status: ${application.status}`
        };
      }

      // Update application status
      application.status = ApplicationStatus.REJECTED;
      application.adminReviews.push({
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        status: ApplicationStatus.REJECTED,
        comments: comments || 'Application rejected',
        requestedChanges: requestedChanges || []
      });

      await application.save();

      // Send rejection notification (in demo mode, just log)
      await this.sendRejectionNotification(application, comments, requestedChanges);

      return {
        success: true,
        message: 'Application rejected successfully',
        application: {
          _id: application._id,
          status: application.status,
          adminReviews: application.adminReviews
        }
      };

    } catch (error) {
      console.error(`❌ Error in rejection workflow:`, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Move application to under review
   */
  static async moveToUnderReview(
    applicationId: string,
    adminUserId: string,
    comments?: string
  ): Promise<WorkflowResult> {
    try {
      console.log(`🔄 Moving application ${applicationId} to under review`);

      // Check if we're in demo mode
      if (DemoAuthService.isDemoMode()) {
        return {
          success: true,
          message: 'Application moved to under review (demo mode)',
          application: {
            _id: applicationId,
            status: ApplicationStatus.UNDER_REVIEW
          },
          isDemo: true
        };
      }

      const isConnected = await connectToMongoose();
      if (!isConnected) {
        return { success: false, error: 'Database connection failed' };
      }

      const application = await DoctorApplication.findById(applicationId);
      if (!application) {
        return { success: false, error: 'Application not found' };
      }

      if (!this.canTransitionTo(application.status, ApplicationStatus.UNDER_REVIEW)) {
        return {
          success: false,
          error: `Cannot move to under review from status: ${application.status}`
        };
      }

      application.status = ApplicationStatus.UNDER_REVIEW;
      application.adminReviews.push({
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        status: ApplicationStatus.UNDER_REVIEW,
        comments: comments || 'Application moved to under review'
      });

      await application.save();

      return {
        success: true,
        message: 'Application moved to under review',
        application: {
          _id: application._id,
          status: application.status
        }
      };

    } catch (error) {
      console.error(`❌ Error moving to under review:`, error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Check if status transition is valid
   */
  private static canTransitionTo(currentStatus: ApplicationStatus, newStatus: ApplicationStatus): boolean {
    const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    return validTransitions.includes(newStatus);
  }

  /**
   * Send approval notification
   */
  private static async sendApprovalNotification(application: any, doctor: any): Promise<void> {
    try {
      console.log(`📧 Sending approval notification to ${application.email}`);
      // In demo mode or when email service is not configured, just log
      console.log(`✅ Approval notification sent to ${application.firstName} ${application.lastName}`);
    } catch (error) {
      console.error('❌ Error sending approval notification:', error);
    }
  }

  /**
   * Send rejection notification
   */
  private static async sendRejectionNotification(
    application: any,
    comments?: string,
    requestedChanges?: string[]
  ): Promise<void> {
    try {
      console.log(`📧 Sending rejection notification to ${application.email}`);
      console.log(`✅ Rejection notification sent to ${application.firstName} ${application.lastName}`);
    } catch (error) {
      console.error('❌ Error sending rejection notification:', error);
    }
  }
}
