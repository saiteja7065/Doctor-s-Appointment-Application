import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/auth/rbac';
import { connectToMongoose } from '@/lib/mongodb';
import { SystemSettings } from '@/lib/models/SystemSettings';
import { logSecurityEvent, AuditAction, AuditSeverity } from '@/lib/auth-audit';

interface SystemSettingsResponse {
  appointmentSettings: {
    defaultDuration: number;
    minBookingNotice: number;
    maxAdvanceBooking: number;
    cancellationPolicy: {
      allowedUntil: number;
      refundPercentage: number;
    };
  };
  paymentSettings: {
    platformFeePercentage: number;
    minimumWithdrawalAmount: number;
    withdrawalProcessingDays: number;
    defaultCredits: number;
    creditPricing: {
      standard: number;
      bulk: number;
    };
  };
  notificationSettings: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    reminderTimes: number[];
  };
  maintenanceMode: {
    enabled: boolean;
    message: string;
    plannedEndTime: string | null;
  };
  featureFlags: {
    videoConsultation: boolean;
    instantConsultation: boolean;
    subscriptionPlans: boolean;
    doctorReviews: boolean;
    patientMedicalHistory: boolean;
    emergencyConsultation: boolean;
  };
}

/**
 * GET /api/admin/settings
 * Get system settings
 */
async function getSystemSettings(userContext: any, request: NextRequest) {
  try {
    // Connect to database
    const isConnected = await connectToMongoose();
    
    if (!isConnected) {
      // Return demo data if database is not available
      const demoSettings: SystemSettingsResponse = {
        appointmentSettings: {
          defaultDuration: 30,
          minBookingNotice: 60,
          maxAdvanceBooking: 30,
          cancellationPolicy: {
            allowedUntil: 24,
            refundPercentage: 80
          }
        },
        paymentSettings: {
          platformFeePercentage: 15,
          minimumWithdrawalAmount: 50,
          withdrawalProcessingDays: 3,
          defaultCredits: 2,
          creditPricing: {
            standard: 10,
            bulk: 8
          }
        },
        notificationSettings: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: true,
          reminderTimes: [24, 2]
        },
        maintenanceMode: {
          enabled: false,
          message: "System is undergoing scheduled maintenance. Please check back later.",
          plannedEndTime: null
        },
        featureFlags: {
          videoConsultation: true,
          instantConsultation: false,
          subscriptionPlans: true,
          doctorReviews: true,
          patientMedicalHistory: true,
          emergencyConsultation: false
        }
      };
      
      return NextResponse.json({
        success: true,
        settings: demoSettings,
        message: 'Demo system settings'
      });
    }

    // Get settings from database
    let settings = await SystemSettings.findOne({});
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await SystemSettings.create({
        appointmentSettings: {
          defaultDuration: 30,
          minBookingNotice: 60,
          maxAdvanceBooking: 30,
          cancellationPolicy: {
            allowedUntil: 24,
            refundPercentage: 80
          }
        },
        paymentSettings: {
          platformFeePercentage: 15,
          minimumWithdrawalAmount: 50,
          withdrawalProcessingDays: 3,
          defaultCredits: 2,
          creditPricing: {
            standard: 10,
            bulk: 8
          }
        },
        notificationSettings: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: true,
          reminderTimes: [24, 2]
        },
        maintenanceMode: {
          enabled: false,
          message: "System is undergoing scheduled maintenance. Please check back later.",
          plannedEndTime: null
        },
        featureFlags: {
          videoConsultation: true,
          instantConsultation: false,
          subscriptionPlans: true,
          doctorReviews: true,
          patientMedicalHistory: true,
          emergencyConsultation: false
        }
      });
    }

    // Log the access for audit purposes
    await logSecurityEvent(
      AuditAction.ADMIN_VIEW_SETTINGS,
      AuditSeverity.LOW,
      `Admin ${userContext.userId} viewed system settings`,
      userContext.userId,
      request
    );

    return NextResponse.json({
      success: true,
      settings: settings,
      message: 'System settings retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to fetch system settings'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/settings
 * Update system settings
 */
async function updateSystemSettings(userContext: any, request: NextRequest) {
  try {
    const updates = await request.json();
    
    // Connect to database
    const isConnected = await connectToMongoose();
    if (!isConnected) {
      return NextResponse.json(
        { 
          error: 'Database Error',
          message: 'Database connection failed'
        },
        { status: 503 }
      );
    }

    // Get current settings
    let settings = await SystemSettings.findOne({});
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = new SystemSettings({});
    }

    // Update settings with provided values
    if (updates.appointmentSettings) {
      settings.appointmentSettings = {
        ...settings.appointmentSettings,
        ...updates.appointmentSettings
      };
    }

    if (updates.paymentSettings) {
      settings.paymentSettings = {
        ...settings.paymentSettings,
        ...updates.paymentSettings
      };
    }

    if (updates.notificationSettings) {
      settings.notificationSettings = {
        ...settings.notificationSettings,
        ...updates.notificationSettings
      };
    }

    if (updates.maintenanceMode) {
      settings.maintenanceMode = {
        ...settings.maintenanceMode,
        ...updates.maintenanceMode
      };
    }

    if (updates.featureFlags) {
      settings.featureFlags = {
        ...settings.featureFlags,
        ...updates.featureFlags
      };
    }

    // Save updated settings
    await settings.save();

    // Log the update for audit purposes
    await logSecurityEvent(
      AuditAction.ADMIN_UPDATE_SETTINGS,
      AuditSeverity.MEDIUM,
      `Admin ${userContext.userId} updated system settings`,
      userContext.userId,
      request
    );

    return NextResponse.json({
      success: true,
      settings: settings,
      message: 'System settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating system settings:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Failed to update system settings'
      },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getSystemSettings);
export const PATCH = withAdminAuth(updateSystemSettings);
