import { clerkClient } from '@clerk/nextjs';
import { connectToMongoose } from '@/lib/mongodb';
import User, { UserRole, UserStatus } from '@/lib/models/User';
import { createAuditLog } from '@/lib/audit';

// Interface for user sync options
interface SyncOptions {
  forceSync?: boolean;
  updateRole?: boolean;
}

/**
 * Synchronizes a user from Clerk to the database
 * @param clerkId The Clerk user ID
 * @param options Sync options
 * @returns The synchronized user or null if failed
 */
export async function syncUserFromClerk(clerkId: string, options: SyncOptions = {}) {
  const { forceSync = false, updateRole = false } = options;
  
  try {
    // Connect to MongoDB
    const connected = await connectToMongoose();
    if (!connected) {
      console.error('Failed to connect to MongoDB during user sync');
      return null;
    }
    
    // Check if user already exists in database
    const existingUser = await User.findOne({ clerkId });
    
    // If user exists and force sync is not enabled, return the existing user
    if (existingUser && !forceSync) {
      return existingUser;
    }
    
    // Get user from Clerk
    const clerkUser = await clerkClient.users.getUser(clerkId);
    
    if (!clerkUser) {
      console.error(`User with Clerk ID ${clerkId} not found`);
      return null;
    }
    
    // Get primary email
    const primaryEmailId = clerkUser.primaryEmailAddressId;
    const primaryEmail = clerkUser.emailAddresses.find(email => email.id === primaryEmailId);
    
    if (!primaryEmail) {
      console.error(`User with Clerk ID ${clerkId} has no primary email`);
      return null;
    }
    
    // Get primary phone
    const primaryPhoneId = clerkUser.primaryPhoneNumberId;
    const primaryPhone = clerkUser.phoneNumbers.find(phone => phone.id === primaryPhoneId);
    
    // If user exists, update their information
    if (existingUser) {
      existingUser.email = primaryEmail.emailAddress;
      existingUser.firstName = clerkUser.firstName || existingUser.firstName;
      existingUser.lastName = clerkUser.lastName || existingUser.lastName;
      existingUser.profileImage = clerkUser.imageUrl || existingUser.profileImage;
      
      if (primaryPhone) {
        existingUser.phoneNumber = primaryPhone.phoneNumber;
      }
      
      // Only update role if explicitly requested (usually only during initial setup)
      if (updateRole) {
        // Get role from public metadata if available
        const roleFromMetadata = clerkUser.publicMetadata.role as string;
        if (roleFromMetadata && Object.values(UserRole).includes(roleFromMetadata as UserRole)) {
          existingUser.role = roleFromMetadata as UserRole;
        }
      }
      
      await existingUser.save();
      
      await createAuditLog({
        action: 'user.synced',
        entityId: existingUser._id.toString(),
        entityType: 'user',
        data: { clerkId, email: primaryEmail.emailAddress }
      });
      
      return existingUser;
    }
    
    // Create new user if they don't exist
    // Default role is patient unless specified in metadata
    let role = UserRole.PATIENT;
    
    // Get role from public metadata if available
    const roleFromMetadata = clerkUser.publicMetadata.role as string;
    if (roleFromMetadata && Object.values(UserRole).includes(roleFromMetadata as UserRole)) {
      role = roleFromMetadata as UserRole;
    }
    
    const newUser = new User({
      clerkId,
      email: primaryEmail.emailAddress,
      firstName: clerkUser.firstName || 'User',
      lastName: clerkUser.lastName || '',
      role,
      status: UserStatus.ACTIVE,
      profileImage: clerkUser.imageUrl,
      phoneNumber: primaryPhone?.phoneNumber,
    });
    
    await newUser.save();
    
    await createAuditLog({
      action: 'user.created_from_sync',
      entityId: newUser._id.toString(),
      entityType: 'user',
      data: { clerkId, email: primaryEmail.emailAddress }
    });
    
    return newUser;
  } catch (error) {
    console.error('Error syncing user from Clerk:', error);
    return null;
  }
}

/**
 * Updates a user's role in both Clerk and the database
 * @param clerkId The Clerk user ID
 * @param role The new role
 * @returns True if successful, false otherwise
 */
export async function updateUserRole(clerkId: string, role: UserRole): Promise<boolean> {
  try {
    // Connect to MongoDB
    const connected = await connectToMongoose();
    if (!connected) {
      console.error('Failed to connect to MongoDB during role update');
      return false;
    }
    
    // Find user in database
    const user = await User.findOne({ clerkId });
    
    if (!user) {
      console.error(`User with Clerk ID ${clerkId} not found in database`);
      return false;
    }
    
    // Update role in Clerk metadata
    await clerkClient.users.updateUser(clerkId, {
      publicMetadata: {
        role
      }
    });
    
    // Create a new user with the new role (since role is immutable)
    const newUser = new User({
      clerkId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role,
      status: UserStatus.ACTIVE,
      profileImage: user.profileImage,
      phoneNumber: user.phoneNumber,
    });
    
    // Save the new user
    await newUser.save();
    
    // Mark the old user as inactive
    user.status = UserStatus.INACTIVE;
    await user.save();
    
    await createAuditLog({
      action: 'user.role_changed',
      entityId: newUser._id.toString(),
      entityType: 'user',
      data: { 
        clerkId, 
        oldRole: user.role,
        newRole: role
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    return false;
  }
}

/**
 * Gets a user by their Clerk ID, syncing from Clerk if necessary
 * @param clerkId The Clerk user ID
 * @param options Sync options
 * @returns The user or null if not found
 */
export async function getUserByClerkId(clerkId: string, options: SyncOptions = {}) {
  try {
    // Connect to MongoDB
    const connected = await connectToMongoose();
    if (!connected) {
      console.error('Failed to connect to MongoDB');
      return null;
    }
    
    // Find user in database
    const user = await User.findOne({ clerkId });
    
    // If user exists, return them
    if (user) {
      return user;
    }
    
    // If user doesn't exist, sync from Clerk
    return syncUserFromClerk(clerkId, options);
  } catch (error) {
    console.error('Error getting user by Clerk ID:', error);
    return null;
  }
}