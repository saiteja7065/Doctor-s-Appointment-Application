import { connectToMongoose } from './mongodb';
import mongoose from 'mongoose';
import { auth } from '@clerk/nextjs';

// Audit log schema
const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    index: true
  },
  entityId: {
    type: String,
    index: true
  },
  entityType: {
    type: String,
    index: true
  },
  userId: {
    type: String,
    index: true
  },
  userRole: {
    type: String
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Create model (prevent re-compilation during development)
export const AuditLog = (mongoose.models?.AuditLog as mongoose.Model<any>) || 
  mongoose.model('AuditLog', AuditLogSchema);

// Interface for audit log creation
interface AuditLogData {
  action: string;
  entityId?: string;
  entityType?: string;
  userId?: string;
  userRole?: string;
  data?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Creates an audit log entry
 * @param logData The audit log data
 * @returns The created audit log or null if failed
 */
export async function createAuditLog(logData: AuditLogData) {
  try {
    // Connect to MongoDB
    const connected = await connectToMongoose();
    if (!connected) {
      console.error('Failed to connect to MongoDB during audit logging');
      return null;
    }
    
    // Get current user if not provided
    if (!logData.userId) {
      const { userId } = auth();
      if (userId) {
        logData.userId = userId;
      }
    }
    
    // Create audit log
    const auditLog = new AuditLog({
      action: logData.action,
      entityId: logData.entityId,
      entityType: logData.entityType,
      userId: logData.userId,
      userRole: logData.userRole,
      data: logData.data,
      ipAddress: logData.ipAddress,
      userAgent: logData.userAgent,
      timestamp: new Date()
    });
    
    await auditLog.save();
    return auditLog;
  } catch (error) {
    // Don't throw errors from audit logging to prevent disrupting main flow
    console.error('Error creating audit log:', error);
    return null;
  }
}

/**
 * Gets audit logs for a specific entity
 * @param entityId The entity ID
 * @param entityType The entity type
 * @param limit The maximum number of logs to return
 * @returns The audit logs or empty array if failed
 */
export async function getEntityAuditLogs(entityId: string, entityType: string, limit = 100) {
  try {
    // Connect to MongoDB
    const connected = await connectToMongoose();
    if (!connected) {
      console.error('Failed to connect to MongoDB during audit log retrieval');
      return [];
    }
    
    // Get audit logs
    const logs = await AuditLog.find({ entityId, entityType })
      .sort({ timestamp: -1 })
      .limit(limit);
    
    return logs;
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return [];
  }
}

/**
 * Gets audit logs for a specific user
 * @param userId The user ID
 * @param limit The maximum number of logs to return
 * @returns The audit logs or empty array if failed
 */
export async function getUserAuditLogs(userId: string, limit = 100) {
  try {
    // Connect to MongoDB
    const connected = await connectToMongoose();
    if (!connected) {
      console.error('Failed to connect to MongoDB during audit log retrieval');
      return [];
    }
    
    // Get audit logs
    const logs = await AuditLog.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit);
    
    return logs;
  } catch (error) {
    console.error('Error getting user audit logs:', error);
    return [];
  }
}

/**
 * Gets audit logs for a specific action
 * @param action The action
 * @param limit The maximum number of logs to return
 * @returns The audit logs or empty array if failed
 */
export async function getActionAuditLogs(action: string, limit = 100) {
  try {
    // Connect to MongoDB
    const connected = await connectToMongoose();
    if (!connected) {
      console.error('Failed to connect to MongoDB during audit log retrieval');
      return [];
    }
    
    // Get audit logs
    const logs = await AuditLog.find({ action })
      .sort({ timestamp: -1 })
      .limit(limit);
    
    return logs;
  } catch (error) {
    console.error('Error getting action audit logs:', error);
    return [];
  }
}