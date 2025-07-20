import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { auth } from '@clerk/nextjs/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Patient } from '@/lib/models/Patient';
import { Doctor } from '@/lib/models/Doctor';
import { User } from '@/lib/models/User';

// WebSocket server instance
let io: SocketIOServer | null = null;

// Connected users map
const connectedUsers = new Map<string, {
  socketId: string;
  userId: string;
  role: 'patient' | 'doctor' | 'admin';
  lastSeen: Date;
}>();

// Room management for consultations
const consultationRooms = new Map<string, {
  sessionId: string;
  participants: string[];
  startTime: Date;
}>();

/**
 * Initialize WebSocket server
 */
export function initializeWebSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    path: '/api/socket',
    transports: ['websocket', 'polling']
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify token with Clerk (simplified for demo)
      // In production, you'd verify the JWT token properly
      const userId = socket.handshake.auth.userId;
      const role = socket.handshake.auth.role;

      if (!userId || !role) {
        return next(new Error('Invalid authentication data'));
      }

      socket.data.userId = userId;
      socket.data.role = role;
      next();
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    const role = socket.data.role;

    console.log(`User connected: ${userId} (${role}) - Socket: ${socket.id}`);

    // Store connected user
    connectedUsers.set(userId, {
      socketId: socket.id,
      userId,
      role,
      lastSeen: new Date()
    });

    // Join user to their personal room
    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);

    // Send connection confirmation
    socket.emit('connected', {
      userId,
      role,
      timestamp: new Date().toISOString()
    });

    // Handle joining consultation rooms
    socket.on('join-consultation', (data: { sessionId: string }) => {
      const { sessionId } = data;
      const roomName = `consultation:${sessionId}`;
      
      socket.join(roomName);
      
      // Track consultation room
      if (!consultationRooms.has(sessionId)) {
        consultationRooms.set(sessionId, {
          sessionId,
          participants: [],
          startTime: new Date()
        });
      }
      
      const room = consultationRooms.get(sessionId)!;
      if (!room.participants.includes(userId)) {
        room.participants.push(userId);
      }

      // Notify other participants
      socket.to(roomName).emit('participant-joined', {
        userId,
        role,
        timestamp: new Date().toISOString()
      });

      console.log(`User ${userId} joined consultation: ${sessionId}`);
    });

    // Handle leaving consultation rooms
    socket.on('leave-consultation', (data: { sessionId: string }) => {
      const { sessionId } = data;
      const roomName = `consultation:${sessionId}`;
      
      socket.leave(roomName);
      
      // Update consultation room
      const room = consultationRooms.get(sessionId);
      if (room) {
        room.participants = room.participants.filter(id => id !== userId);
        if (room.participants.length === 0) {
          consultationRooms.delete(sessionId);
        }
      }

      // Notify other participants
      socket.to(roomName).emit('participant-left', {
        userId,
        role,
        timestamp: new Date().toISOString()
      });

      console.log(`User ${userId} left consultation: ${sessionId}`);
    });

    // Handle real-time chat messages
    socket.on('consultation-message', (data: {
      sessionId: string;
      message: string;
      timestamp: string;
    }) => {
      const { sessionId, message, timestamp } = data;
      const roomName = `consultation:${sessionId}`;

      // Broadcast message to consultation room
      io?.to(roomName).emit('consultation-message', {
        userId,
        role,
        message,
        timestamp,
        sessionId
      });

      console.log(`Message in consultation ${sessionId} from ${userId}: ${message}`);
    });

    // Handle typing indicators
    socket.on('typing-start', (data: { sessionId: string }) => {
      const { sessionId } = data;
      const roomName = `consultation:${sessionId}`;
      
      socket.to(roomName).emit('user-typing', {
        userId,
        role,
        sessionId
      });
    });

    socket.on('typing-stop', (data: { sessionId: string }) => {
      const { sessionId } = data;
      const roomName = `consultation:${sessionId}`;
      
      socket.to(roomName).emit('user-stopped-typing', {
        userId,
        role,
        sessionId
      });
    });

    // Handle heartbeat for connection monitoring
    socket.on('heartbeat', () => {
      const user = connectedUsers.get(userId);
      if (user) {
        user.lastSeen = new Date();
      }
      socket.emit('heartbeat-ack', { timestamp: new Date().toISOString() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${userId} - Reason: ${reason}`);
      
      // Remove from connected users
      connectedUsers.delete(userId);
      
      // Remove from all consultation rooms
      consultationRooms.forEach((room, sessionId) => {
        if (room.participants.includes(userId)) {
          room.participants = room.participants.filter(id => id !== userId);
          
          // Notify other participants
          socket.to(`consultation:${sessionId}`).emit('participant-left', {
            userId,
            role,
            timestamp: new Date().toISOString()
          });
          
          // Clean up empty rooms
          if (room.participants.length === 0) {
            consultationRooms.delete(sessionId);
          }
        }
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  });

  console.log('WebSocket server initialized');
  return io;
}

/**
 * Get WebSocket server instance
 */
export function getWebSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Send notification to specific user
 */
export function sendNotificationToUser(userId: string, notification: {
  type: string;
  title: string;
  message: string;
  data?: any;
}) {
  if (!io) return false;

  io.to(`user:${userId}`).emit('notification', {
    ...notification,
    timestamp: new Date().toISOString()
  });

  return true;
}

/**
 * Send notification to all users with specific role
 */
export function sendNotificationToRole(role: 'patient' | 'doctor' | 'admin', notification: {
  type: string;
  title: string;
  message: string;
  data?: any;
}) {
  if (!io) return false;

  io.to(`role:${role}`).emit('notification', {
    ...notification,
    timestamp: new Date().toISOString()
  });

  return true;
}

/**
 * Send update to consultation room
 */
export function sendConsultationUpdate(sessionId: string, update: {
  type: string;
  data: any;
}) {
  if (!io) return false;

  io.to(`consultation:${sessionId}`).emit('consultation-update', {
    ...update,
    sessionId,
    timestamp: new Date().toISOString()
  });

  return true;
}

/**
 * Get connected users count
 */
export function getConnectedUsersCount(): number {
  return connectedUsers.size;
}

/**
 * Get connected users by role
 */
export function getConnectedUsersByRole(role: 'patient' | 'doctor' | 'admin'): number {
  return Array.from(connectedUsers.values()).filter(user => user.role === role).length;
}

/**
 * Get active consultation rooms
 */
export function getActiveConsultations(): Array<{
  sessionId: string;
  participantCount: number;
  startTime: Date;
}> {
  return Array.from(consultationRooms.values()).map(room => ({
    sessionId: room.sessionId,
    participantCount: room.participants.length,
    startTime: room.startTime
  }));
}

/**
 * Check if user is online
 */
export function isUserOnline(userId: string): boolean {
  return connectedUsers.has(userId);
}

export default {
  initializeWebSocketServer,
  getWebSocketServer,
  sendNotificationToUser,
  sendNotificationToRole,
  sendConsultationUpdate,
  getConnectedUsersCount,
  getConnectedUsersByRole,
  getActiveConsultations,
  isUserOnline
};
