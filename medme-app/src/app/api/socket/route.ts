import { NextRequest, NextResponse } from 'next/server';
import { Server as HTTPServer } from 'http';
import { initializeWebSocketServer, getWebSocketServer } from '@/lib/websocket-server';

// Store server instance
let httpServer: HTTPServer | null = null;

/**
 * GET /api/socket
 * WebSocket connection endpoint and status
 */
export async function GET(request: NextRequest) {
  try {
    const server = getWebSocketServer();
    
    if (!server) {
      return NextResponse.json({
        status: 'not_initialized',
        message: 'WebSocket server not initialized',
        endpoint: '/api/socket',
        transports: ['websocket', 'polling']
      });
    }

    // Get connection statistics
    const stats = {
      status: 'active',
      connectedClients: server.engine.clientsCount,
      rooms: Array.from(server.sockets.adapter.rooms.keys()),
      endpoint: '/api/socket',
      transports: ['websocket', 'polling'],
      features: [
        'Real-time notifications',
        'Consultation chat',
        'Typing indicators',
        'Presence detection',
        'Heartbeat monitoring'
      ]
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('WebSocket status error:', error);
    return NextResponse.json(
      { error: 'Failed to get WebSocket status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/socket
 * Initialize WebSocket server (for development/testing)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'initialize') {
      // In a real Next.js app, WebSocket server would be initialized
      // in a custom server or using a different approach
      // This is a placeholder for development
      
      return NextResponse.json({
        success: true,
        message: 'WebSocket server initialization requested',
        note: 'In production, WebSocket server should be initialized in custom server setup'
      });
    }

    if (action === 'broadcast') {
      const { type, data } = body;
      const server = getWebSocketServer();
      
      if (!server) {
        return NextResponse.json(
          { error: 'WebSocket server not initialized' },
          { status: 400 }
        );
      }

      // Broadcast message to all connected clients
      server.emit(type, data);

      return NextResponse.json({
        success: true,
        message: `Broadcasted ${type} to all clients`,
        data
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('WebSocket API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/socket
 * Send targeted notifications
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { target, type, notification } = body;

    const server = getWebSocketServer();
    if (!server) {
      return NextResponse.json(
        { error: 'WebSocket server not initialized' },
        { status: 400 }
      );
    }

    if (target.type === 'user') {
      // Send to specific user
      server.to(`user:${target.userId}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
    } else if (target.type === 'role') {
      // Send to all users with specific role
      server.to(`role:${target.role}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString()
      });
    } else if (target.type === 'consultation') {
      // Send to consultation room
      server.to(`consultation:${target.sessionId}`).emit('consultation-update', {
        type,
        data: notification,
        sessionId: target.sessionId,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${target.type}`,
      target,
      notification
    });

  } catch (error) {
    console.error('WebSocket notification error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/socket
 * Disconnect specific user or close server
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');

    const server = getWebSocketServer();
    if (!server) {
      return NextResponse.json(
        { error: 'WebSocket server not initialized' },
        { status: 400 }
      );
    }

    if (action === 'disconnect-user' && userId) {
      // Disconnect specific user
      const sockets = await server.in(`user:${userId}`).fetchSockets();
      sockets.forEach(socket => socket.disconnect());

      return NextResponse.json({
        success: true,
        message: `Disconnected user: ${userId}`,
        disconnectedSockets: sockets.length
      });
    }

    if (action === 'close-server') {
      // Close WebSocket server (for development/testing)
      server.close();
      
      return NextResponse.json({
        success: true,
        message: 'WebSocket server closed'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action or missing parameters' },
      { status: 400 }
    );

  } catch (error) {
    console.error('WebSocket disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to process disconnect request' },
      { status: 500 }
    );
  }
}
