import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadNotificationCount,
  NotificationType,
  NotificationPriority
} from '@/lib/notifications';

/**
 * GET /api/notifications
 * Get notifications for the authenticated user
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

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const type = searchParams.get('type') as NotificationType | undefined;

    const notifications = getUserNotifications(userId, {
      unreadOnly,
      limit,
      type
    });

    const unreadCount = getUnreadNotificationCount(userId);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      total: notifications.length
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create a new notification (admin only) or mark notifications as read
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
    const { action, notificationId, notificationIds } = body;

    if (action === 'mark_read') {
      if (notificationId) {
        // Mark single notification as read
        const success = markNotificationAsRead(userId, notificationId);
        
        if (success) {
          return NextResponse.json({
            success: true,
            message: 'Notification marked as read'
          });
        } else {
          return NextResponse.json(
            { error: 'Notification not found' },
            { status: 404 }
          );
        }
      } else {
        // Mark all notifications as read
        const count = markAllNotificationsAsRead(userId);
        
        return NextResponse.json({
          success: true,
          message: `${count} notifications marked as read`,
          markedCount: count
        });
      }
    }

    if (action === 'mark_multiple_read' && notificationIds) {
      // Mark multiple notifications as read
      let successCount = 0;
      
      for (const id of notificationIds) {
        if (markNotificationAsRead(userId, id)) {
          successCount++;
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `${successCount} notifications marked as read`,
        markedCount: successCount
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error processing notification action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * Delete a notification
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const success = deleteNotification(userId, notificationId);

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Notification deleted'
      });
    } else {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
