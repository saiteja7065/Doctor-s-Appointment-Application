import mongoose, { Schema, Document } from 'mongoose';

// User role enum
export enum UserRole {
  PATIENT = 'patient',
  DOCTOR = 'doctor',
  ADMIN = 'admin',
}

// User status enum
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

// Base User interface
export interface IUser extends Document {
  clerkId: string; // Clerk user ID for authentication
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  profileImage?: string;
  phoneNumber?: string;
  dateOfBirth?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// User schema
const UserSchema = new Schema<IUser>(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
      immutable: true, // Role cannot be changed after creation
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    profileImage: {
      type: String,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save middleware to enforce role immutability
UserSchema.pre('save', function (next) {
  // If this is not a new document and role is being modified
  if (!this.isNew && this.isModified('role')) {
    const error = new Error('User role cannot be changed after account creation. Create a separate account for different roles.');
    error.name = 'RoleImmutabilityError';
    return next(error);
  }
  next();
});

// Pre-update middleware to prevent role changes via findOneAndUpdate, updateOne, etc.
UserSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function (next) {
  const update = this.getUpdate() as any;
  if (update && (update.role || (update.$set && update.$set.role))) {
    const error = new Error('User role cannot be changed after account creation. Create a separate account for different roles.');
    error.name = 'RoleImmutabilityError';
    return next(error);
  }
  next();
});

// Virtual for full name
UserSchema.virtual('fullName').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// Static method to check if user can have multiple roles (always false for security)
if (UserSchema.statics) {
  UserSchema.statics.canHaveMultipleRoles = function() {
    return false;
  };
}

// Instance method to check role permissions
if (UserSchema.methods) {
  UserSchema.methods.hasRole = function(role: UserRole) {
    return this.role === role;
  };
}

// Instance method to check if user can access resource
UserSchema.methods.canAccess = function(requiredRole: UserRole | UserRole[]) {
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(this.role);
  }
  return this.role === requiredRole;
};

// Indexes for better query performance (email and clerkId already have unique indexes)
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: -1 });

// Prevent model re-compilation during development
export const User = (mongoose.models?.User as mongoose.Model<IUser>) || mongoose.model<IUser>('User', UserSchema);

export default User;
