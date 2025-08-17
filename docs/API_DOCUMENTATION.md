# MedMe API Documentation

**Last Updated**: 2025-01-20
**API Version**: v1.0
**Status**: Development Ready with Demo Fallback

## 🔗 Base URL
```
Development: http://localhost:3000
Production: https://medme-app.vercel.app (when deployed)
```

## 🔐 Authentication

All API endpoints require authentication via Clerk JWT tokens, except for public endpoints. The API includes demo mode fallback for development testing.

### Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Demo-Mode: true (optional, for demo testing)
```

### Authentication Status
- ✅ **Clerk Integration**: Fully functional
- ✅ **JWT Validation**: Working with middleware
- ✅ **Role-based Access**: Implemented
- ✅ **Demo Mode**: Available for testing
- ✅ **Session Management**: Secure and reliable

---

## 📊 API ENDPOINT STATUS

### ✅ FULLY FUNCTIONAL ENDPOINTS

#### User Management APIs
- ✅ `GET /api/users/profile` - Get current user profile
- ✅ `PUT /api/users/profile` - Update user profile
- ✅ `GET /api/users` - List all users (admin only)
- ✅ `GET /api/users/[id]` - Get specific user
- ✅ `POST /api/users/register` - User registration

#### Doctor Management APIs
- ✅ `POST /api/doctors/apply` - Submit doctor application
- ✅ `GET /api/doctors/apply` - Get application status
- ✅ `GET /api/doctors` - Search doctors
- ✅ `GET /api/doctors/[id]` - Get doctor profile
- ✅ `PUT /api/doctors/[id]` - Update doctor profile

#### Admin APIs
- ✅ `GET /api/admin/overview` - Platform statistics
- ✅ `GET /api/admin/applications` - Doctor applications
- ✅ `PUT /api/admin/applications/[id]` - Approve/reject applications
- ✅ `GET /api/admin/users` - User management
- ✅ `PUT /api/admin/users/[id]` - Update user status

#### Appointment APIs
- ✅ `POST /api/appointments` - Create appointment
- ✅ `GET /api/appointments` - List appointments
- ✅ `GET /api/appointments/[id]` - Get appointment details
- ✅ `PUT /api/appointments/[id]` - Update appointment

### ⚠️ PARTIALLY FUNCTIONAL ENDPOINTS

#### Payment APIs (UI Only)
- ⚠️ `POST /api/payments/process` - Process payment (demo only)
- ⚠️ `GET /api/payments/history` - Payment history (demo data)
- ⚠️ `POST /api/credits/purchase` - Purchase credits (demo only)

#### Notification APIs (Basic)
- ⚠️ `POST /api/notifications/send` - Send notification (in-app only)
- ⚠️ `GET /api/notifications` - Get notifications (basic)

### ❌ NOT IMPLEMENTED ENDPOINTS

#### Video Consultation APIs
- ❌ `POST /api/video/create-room` - Create video room
- ❌ `GET /api/video/token` - Get video access token
- ❌ `POST /api/video/end-session` - End video session

#### Email/SMS APIs
- ❌ `POST /api/email/send` - Send email notification
- ❌ `POST /api/sms/send` - Send SMS notification
- ❌ `POST /api/notifications/email` - Email notifications

#### Advanced Features
- ❌ `GET /api/analytics/dashboard` - Advanced analytics
- ❌ `POST /api/medical-records` - Medical records management
- ❌ `GET /api/reports/generate` - Generate reports

---

## 👥 User Management

### Get Current User Profile
```http
GET /api/users/profile
```

**Response:**
```json
{
  "id": "user_123",
  "clerkId": "clerk_456",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "patient",
  "status": "active",
  "createdAt": "2025-01-13T10:00:00Z"
}
```

### Update User Profile
```http
PUT /api/users/profile
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "dateOfBirth": "1990-01-01"
}
```

## 🏥 Doctor Management

### Apply as Doctor
```http
POST /api/doctors/apply
```

**Request Body:**
```json
{
  "specialty": "general_practice",
  "licenseNumber": "MD123456",
  "credentialUrl": "https://example.com/credentials.pdf",
  "yearsOfExperience": 5,
  "education": "Harvard Medical School",
  "bio": "Experienced general practitioner",
  "consultationFee": 100,
  "languages": ["English", "Spanish"]
}
```

**Response:**
```json
{
  "success": true,
  "applicationId": "app_789",
  "status": "pending",
  "estimatedReviewTime": "2-5 business days"
}
```

### Get Doctor Application Status
```http
GET /api/doctors/apply
```

**Response:**
```json
{
  "applicationId": "app_789",
  "status": "pending",
  "specialty": "general_practice",
  "submittedAt": "2025-01-13T10:00:00Z",
  "lastUpdated": "2025-01-13T10:00:00Z",
  "reviewNotes": "Application under review"
}
```

### Search Doctors
```http
GET /api/doctors/search?specialty=cardiology&available=true&page=1&limit=10
```

**Query Parameters:**
- `specialty` (optional): Medical specialty
- `available` (optional): Filter by availability
- `rating` (optional): Minimum rating
- `maxFee` (optional): Maximum consultation fee
- `language` (optional): Preferred language
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)

**Response:**
```json
{
  "doctors": [
    {
      "id": "doc_123",
      "firstName": "Dr. Jane",
      "lastName": "Smith",
      "specialty": "cardiology",
      "rating": 4.8,
      "reviewCount": 156,
      "consultationFee": 150,
      "languages": ["English"],
      "availability": {
        "nextAvailable": "2025-01-14T09:00:00Z",
        "slotsAvailable": 5
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

### Get Doctor Profile
```http
GET /api/doctors/[id]
```

**Response:**
```json
{
  "id": "doc_123",
  "firstName": "Dr. Jane",
  "lastName": "Smith",
  "specialty": "cardiology",
  "bio": "Board-certified cardiologist with 10+ years experience",
  "education": "Johns Hopkins Medical School",
  "yearsOfExperience": 12,
  "consultationFee": 150,
  "rating": 4.8,
  "reviewCount": 156,
  "languages": ["English", "Spanish"],
  "availability": {
    "timezone": "America/New_York",
    "schedule": {
      "monday": [{"start": "09:00", "end": "17:00"}],
      "tuesday": [{"start": "09:00", "end": "17:00"}]
    }
  }
}
```

## 📅 Appointment Management

### Book Appointment
```http
POST /api/appointments/book
```

**Request Body:**
```json
{
  "doctorId": "doc_123",
  "scheduledFor": "2025-01-15T10:00:00Z",
  "timezone": "America/New_York",
  "consultationType": "video",
  "symptoms": "Chest pain and shortness of breath",
  "notes": "Patient experiencing symptoms for 2 days"
}
```

**Response:**
```json
{
  "success": true,
  "appointmentId": "apt_456",
  "scheduledFor": "2025-01-15T10:00:00Z",
  "doctorName": "Dr. Jane Smith",
  "consultationFee": 150,
  "creditsDeducted": 150,
  "remainingCredits": 350,
  "vonageSessionId": "session_789",
  "confirmationNumber": "CONF123456"
}
```

### Get Appointments
```http
GET /api/appointments?status=upcoming&page=1&limit=10
```

**Query Parameters:**
- `status` (optional): upcoming, completed, cancelled
- `page` (optional): Page number
- `limit` (optional): Results per page

**Response:**
```json
{
  "appointments": [
    {
      "id": "apt_456",
      "doctorId": "doc_123",
      "doctorName": "Dr. Jane Smith",
      "scheduledFor": "2025-01-15T10:00:00Z",
      "status": "confirmed",
      "consultationType": "video",
      "consultationFee": 150,
      "vonageSessionId": "session_789",
      "canCancel": true,
      "canReschedule": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

### Cancel Appointment
```http
POST /api/appointments/[id]/cancel
```

**Request Body:**
```json
{
  "reason": "Schedule conflict",
  "refundRequested": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Appointment cancelled successfully",
  "refundAmount": 150,
  "refundStatus": "processing"
}
```

### Reschedule Appointment
```http
POST /api/appointments/[id]/reschedule
```

**Request Body:**
```json
{
  "newDateTime": "2025-01-16T14:00:00Z",
  "reason": "Schedule conflict"
}
```

## 🎥 Video Consultation

### Get Session Details
```http
GET /api/video/session/[sessionId]
```

**Response:**
```json
{
  "sessionId": "session_789",
  "apiKey": "vonage_api_key",
  "token": "session_token",
  "appointmentId": "apt_456",
  "participants": {
    "doctor": {
      "name": "Dr. Jane Smith",
      "role": "moderator"
    },
    "patient": {
      "name": "John Doe",
      "role": "subscriber"
    }
  },
  "settings": {
    "recording": false,
    "maxDuration": 3600
  }
}
```

### Start Consultation
```http
POST /api/video/session/[sessionId]/start
```

**Response:**
```json
{
  "success": true,
  "sessionStarted": true,
  "startTime": "2025-01-15T10:00:00Z"
}
```

### End Consultation
```http
POST /api/video/session/[sessionId]/end
```

**Request Body:**
```json
{
  "duration": 1800,
  "notes": "Patient consultation completed successfully",
  "prescription": "Rest and follow-up in 1 week"
}
```

## 💳 Payment Management

### Get Credit Balance
```http
GET /api/payments/credits
```

**Response:**
```json
{
  "balance": 500,
  "currency": "USD",
  "lastTransaction": {
    "id": "txn_123",
    "amount": 100,
    "type": "purchase",
    "date": "2025-01-13T10:00:00Z"
  }
}
```

### Purchase Credits
```http
POST /api/payments/credits/purchase
```

**Request Body:**
```json
{
  "amount": 200,
  "paymentMethodId": "pm_stripe_123"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "txn_456",
  "creditsAdded": 200,
  "newBalance": 700,
  "paymentStatus": "succeeded"
}
```

### Create Subscription
```http
POST /api/payments/subscriptions
```

**Request Body:**
```json
{
  "planId": "plan_premium",
  "paymentMethodId": "pm_stripe_123"
}
```

**Response:**
```json
{
  "success": true,
  "subscriptionId": "sub_789",
  "status": "active",
  "currentPeriodEnd": "2025-02-13T10:00:00Z",
  "plan": {
    "name": "Premium Plan",
    "price": 29.99,
    "credits": 500
  }
}
```

## 🔔 Notifications

### Get Notifications
```http
GET /api/notifications?unread=true&page=1&limit=20
```

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif_123",
      "type": "appointment_reminder",
      "title": "Appointment Reminder",
      "message": "Your appointment with Dr. Jane Smith is in 1 hour",
      "read": false,
      "createdAt": "2025-01-15T09:00:00Z",
      "data": {
        "appointmentId": "apt_456"
      }
    }
  ],
  "unreadCount": 3,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15
  }
}
```

### Mark Notification as Read
```http
POST /api/notifications/[id]/read
```

**Response:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### Update Notification Preferences
```http
PUT /api/notifications/preferences
```

**Request Body:**
```json
{
  "email": {
    "appointmentReminders": true,
    "appointmentConfirmations": true,
    "promotions": false
  },
  "sms": {
    "appointmentReminders": true,
    "emergencyAlerts": true
  },
  "push": {
    "appointmentReminders": true,
    "chatMessages": true
  }
}
```

## 🛡️ Security & Admin

### Get Security Metrics (Admin Only)
```http
GET /api/security/metrics
```

**Response:**
```json
{
  "overview": {
    "totalUsers": 1247,
    "activeUsers": 892,
    "securityScore": 98,
    "lastSecurityAudit": "2025-01-13T10:00:00Z"
  },
  "authentication": {
    "successfulLogins": 1456,
    "failedLogins": 23,
    "mfaEnabled": 78.5
  },
  "threats": {
    "blocked": 12,
    "mitigated": 5,
    "active": 0
  }
}
```

### Get Security Alerts (Admin Only)
```http
GET /api/security/alerts
```

**Response:**
```json
[
  {
    "id": "alert_123",
    "title": "Unusual Login Pattern Detected",
    "description": "Multiple login attempts from different geographic locations",
    "severity": "medium",
    "category": "authentication",
    "timestamp": "2025-01-13T10:00:00Z",
    "acknowledged": false
  }
]
```

## 📊 Analytics & Reports

### Get Dashboard Analytics
```http
GET /api/analytics/dashboard
```

**Response:**
```json
{
  "appointments": {
    "total": 1234,
    "thisMonth": 156,
    "growth": 12.5
  },
  "revenue": {
    "total": 45678.90,
    "thisMonth": 5432.10,
    "growth": 8.3
  },
  "users": {
    "total": 2345,
    "active": 1876,
    "growth": 15.2
  },
  "satisfaction": {
    "averageRating": 4.7,
    "totalReviews": 892
  }
}
```

## ❌ Error Responses

All API endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details",
  "timestamp": "2025-01-13T10:00:00Z"
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Invalid or missing authentication
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `RATE_LIMITED` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

## 🔄 Rate Limiting

API endpoints are rate limited:
- **General endpoints**: 100 requests per minute
- **Authentication endpoints**: 10 requests per minute
- **Payment endpoints**: 20 requests per minute

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642089600
```

## 📝 Webhooks

### Clerk User Events
```http
POST /api/webhooks/clerk
```

### Stripe Payment Events
```http
POST /api/webhooks/stripe
```

### Vonage Video Events
```http
POST /api/webhooks/vonage
```

---

## 🔗 SDKs and Libraries

### JavaScript/TypeScript
```bash
npm install @medme/api-client
```

### Usage Example
```typescript
import { MedMeClient } from '@medme/api-client';

const client = new MedMeClient({
  baseUrl: 'https://your-domain.com',
  apiKey: 'your-api-key'
});

// Book an appointment
const appointment = await client.appointments.book({
  doctorId: 'doc_123',
  scheduledFor: '2025-01-15T10:00:00Z',
  consultationType: 'video'
});
```

For more detailed examples and advanced usage, refer to the complete API documentation and SDK guides.
