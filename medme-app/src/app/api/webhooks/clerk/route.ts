import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { connectToMongoose } from '@/lib/mongodb';
import User, { UserRole, UserStatus } from '@/lib/models/User';
import { createAuditLog } from '@/lib/audit';

// Webhook handler for Clerk events
export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, return error
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse('Error: Missing svix headers', { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('Error: Missing CLERK_WEBHOOK_SECRET');
    return new NextResponse('Error: Missing webhook secret', { status: 500 });
  }

  // Create a new Svix instance
  const wh = new Webhook(webhookSecret);

  let evt: WebhookEvent;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new NextResponse('Error verifying webhook', { status: 400 });
  }

  // Get the event type
  const eventType = evt.type;
  
  // Connect to MongoDB
  const connected = await connectToMongoose();
  if (!connected) {
    console.error('Failed to connect to MongoDB');
    return new NextResponse('Database connection error', { status: 500 });
  }

  try {
    // Handle different event types
    switch (eventType) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = evt.data;
        
        // Get primary email
        const primaryEmail = email_addresses?.find(email => email.id === evt.data.primary_email_address_id);
        const emailValue = primaryEmail?.email_address;
        
        // Get primary phone
        const primaryPhone = phone_numbers?.find(phone => phone.id === evt.data.primary_phone_number_id);
        const phoneValue = primaryPhone?.phone_number;
        
        if (!emailValue) {
          return new NextResponse('Error: Missing email address', { status: 400 });
        }
        
        // Create new user in MongoDB
        const newUser = new User({
          clerkId: id,
          email: emailValue,
          firstName: first_name || 'User',
          lastName: last_name || '',
          role: UserRole.PATIENT, // Default role is patient
          status: UserStatus.ACTIVE,
          profileImage: image_url,
          phoneNumber: phoneValue,
        });
        
        await newUser.save();
        
        // Create audit log
        await createAuditLog({
          action: 'user.created',
          entityId: newUser._id.toString(),
          entityType: 'user',
          data: { clerkId: id, email: emailValue },
        });
        
        return NextResponse.json({ success: true, message: 'User created successfully' });
      }
      
      case 'user.updated': {
        const { id, email_addresses, first_name, last_name, image_url, phone_numbers } = evt.data;
        
        // Get primary email
        const primaryEmail = email_addresses?.find(email => email.id === evt.data.primary_email_address_id);
        const emailValue = primaryEmail?.email_address;
        
        // Get primary phone
        const primaryPhone = phone_numbers?.find(phone => phone.id === evt.data.primary_phone_number_id);
        const phoneValue = primaryPhone?.phone_number;
        
        if (!emailValue) {
          return new NextResponse('Error: Missing email address', { status: 400 });
        }
        
        // Find and update user
        const user = await User.findOne({ clerkId: id });
        
        if (!user) {
          // User doesn't exist, create new user
          const newUser = new User({
            clerkId: id,
            email: emailValue,
            firstName: first_name || 'User',
            lastName: last_name || '',
            role: UserRole.PATIENT, // Default role is patient
            status: UserStatus.ACTIVE,
            profileImage: image_url,
            phoneNumber: phoneValue,
          });
          
          await newUser.save();
          
          await createAuditLog({
            action: 'user.created_from_update',
            entityId: newUser._id.toString(),
            entityType: 'user',
            data: { clerkId: id, email: emailValue },
          });
          
          return NextResponse.json({ success: true, message: 'User created from update event' });
        }
        
        // Update user fields
        user.email = emailValue;
        user.firstName = first_name || user.firstName;
        user.lastName = last_name || user.lastName;
        user.profileImage = image_url || user.profileImage;
        user.phoneNumber = phoneValue || user.phoneNumber;
        
        await user.save();
        
        await createAuditLog({
          action: 'user.updated',
          entityId: user._id.toString(),
          entityType: 'user',
          data: { clerkId: id, email: emailValue },
        });
        
        return NextResponse.json({ success: true, message: 'User updated successfully' });
      }
      
      case 'user.deleted': {
        const { id } = evt.data;
        
        // Find user
        const user = await User.findOne({ clerkId: id });
        
        if (!user) {
          return NextResponse.json({ success: false, message: 'User not found' });
        }
        
        // Instead of deleting, mark as inactive for audit purposes
        user.status = UserStatus.INACTIVE;
        await user.save();
        
        await createAuditLog({
          action: 'user.deleted',
          entityId: user._id.toString(),
          entityType: 'user',
          data: { clerkId: id },
        });
        
        return NextResponse.json({ success: true, message: 'User marked as inactive' });
      }
      
      default:
        // Handle other event types or ignore
        return NextResponse.json({ success: true, message: `Unhandled event type: ${eventType}` });
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new NextResponse(`Error processing webhook: ${error instanceof Error ? error.message : 'Unknown error'}`, { status: 500 });
  }
}