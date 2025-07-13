import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Notification } from '@/lib/models/Notification';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Get the last check timestamp from query params
    const url = new URL(request.url);
    const lastCheck = url.searchParams.get('lastCheck');
    const lastCheckDate = lastCheck ? new Date(lastCheck) : new Date(Date.now() - 5 * 60 * 1000); // Default to 5 minutes ago

    // Initialize default values for graceful fallback
    let newNotifications = [];
    let unreadCount = 0;
    let urgentNotifications = [];

    try {
      // Check for new notifications since last check - use clerkId instead of userId
      // Add timeout and limit to prevent hanging queries
      newNotifications = await Notification.find({
        clerkId: userId,
        createdAt: { $gt: lastCheckDate },
        isRead: false
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .maxTimeMS(3000) // 3 second timeout
      .lean(); // Use lean() for better performance

      // Get total unread count with timeout
      unreadCount = await Notification.countDocuments({
        clerkId: userId,
        isRead: false
      }).maxTimeMS(3000);

      // Check for any urgent notifications with timeout
      urgentNotifications = await Notification.find({
        clerkId: userId,
        priority: 'urgent',
        isRead: false,
        createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
      })
      .limit(5)
      .maxTimeMS(3000)
      .lean();

    } catch (queryError) {
      // Log the error but don't fail the request
      console.warn('Notification query timeout or error (expected for new installations):', queryError instanceof Error ? queryError.message : 'Unknown error');
      // Use default values (already initialized above)
    }

    // Determine if there are significant updates
    const hasUpdates = newNotifications.length > 0 || urgentNotifications.length > 0;

    return NextResponse.json({
      hasUpdates,
      newNotificationsCount: newNotifications.length,
      unreadCount,
      urgentCount: urgentNotifications.length,
      lastCheck: new Date().toISOString(),
      notifications: newNotifications.slice(0, 5), // Return latest 5 for preview
    });

  } catch (error) {
    console.error('Error checking for notification updates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action, notificationIds } = await request.json();

    await connectToDatabase();

    switch (action) {
      case 'markAsRead':
        if (notificationIds && Array.isArray(notificationIds)) {
          await Notification.updateMany(
            {
              _id: { $in: notificationIds },
              clerkId: userId
            },
            {
              isRead: true,
              readAt: new Date()
            }
          );
        }
        break;

      case 'markAllAsRead':
        await Notification.updateMany(
          { clerkId: userId, isRead: false },
          {
            isRead: true,
            readAt: new Date()
          }
        );
        break;

      case 'delete':
        if (notificationIds && Array.isArray(notificationIds)) {
          await Notification.deleteMany({
            _id: { $in: notificationIds },
            clerkId: userId
          });
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Return updated counts
    const unreadCount = await Notification.countDocuments({
      clerkId: userId,
      isRead: false
    });

    return NextResponse.json({
      success: true,
      unreadCount,
      message: `Action '${action}' completed successfully`
    });

  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
