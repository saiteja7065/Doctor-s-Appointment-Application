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

    // Check for new notifications since last check
    const newNotifications = await Notification.find({
      userId,
      createdAt: { $gt: lastCheckDate },
      isRead: false
    }).sort({ createdAt: -1 });

    // Get total unread count
    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false
    });

    // Check for any urgent notifications
    const urgentNotifications = await Notification.find({
      userId,
      priority: 'urgent',
      isRead: false,
      createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    });

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
              userId 
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
          { userId, isRead: false },
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
            userId
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
      userId,
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
