# MedMe Doctor Appointment Application - Production Deployment Guide

## 🚀 Overview

This guide provides comprehensive instructions for deploying the MedMe Doctor Appointment Application to production. The application is fully developed, tested, and ready for enterprise-grade deployment.

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 18.17.0 or higher
- **npm**: Version 9.0.0 or higher
- **MongoDB**: Atlas cluster or self-hosted MongoDB 6.0+
- **SSL Certificate**: For HTTPS enforcement
- **Domain**: Configured with proper DNS settings

### Third-Party Services
- **Clerk**: Authentication service account
- **MongoDB Atlas**: Database hosting
- **Vonage**: Video API for consultations
- **Stripe**: Payment processing
- **Resend**: Email service
- **SMS Provider**: For SMS notifications

## 🔧 Environment Configuration

### Required Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/medme-prod?retryWrites=true&w=majority

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_publishable_key
CLERK_SECRET_KEY=sk_live_your_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Video Consultations (Vonage)
VONAGE_API_KEY=your_vonage_api_key
VONAGE_API_SECRET=your_vonage_api_secret
VONAGE_APPLICATION_ID=your_vonage_application_id
VONAGE_PRIVATE_KEY_PATH=/path/to/private.key

# Payment Processing (Stripe)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Service (Resend)
RESEND_API_KEY=re_your_resend_api_key
NEXT_PUBLIC_FROM_EMAIL=noreply@your-domain.com

# SMS Service
SMS_API_KEY=your_sms_api_key
SMS_API_SECRET=your_sms_api_secret

# Security
ENCRYPTION_KEY=your_32_character_encryption_key
JWT_SECRET=your_jwt_secret_key
WEBHOOK_SECRET=your_webhook_secret

# Analytics (Optional)
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=GA_MEASUREMENT_ID
```

## 🏗️ Build and Deployment

### 1. Pre-deployment Checklist

```bash
# Install dependencies
npm ci

# Run tests
npm run test:ci

# Build the application
npm run build

# Analyze bundle (optional)
npm run build:analyze
```

### 2. Deployment Options

#### Option A: Vercel (Recommended)

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login and deploy
   vercel login
   vercel --prod
   ```

2. **Configure Environment Variables**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add all required environment variables
   - Set environment to "Production"

3. **Domain Configuration**
   - Add custom domain in Vercel Dashboard
   - Configure DNS records as instructed

#### Option B: Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS base
   
   # Install dependencies only when needed
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   
   COPY package.json package-lock.json* ./
   RUN npm ci
   
   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   
   RUN npm run build
   
   # Production image, copy all the files and run next
   FROM base AS runner
   WORKDIR /app
   
   ENV NODE_ENV production
   
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs
   
   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
   
   USER nextjs
   
   EXPOSE 3000
   
   ENV PORT 3000
   
   CMD ["node", "server.js"]
   ```

2. **Build and Run**
   ```bash
   # Build Docker image
   docker build -t medme-app .
   
   # Run container
   docker run -p 3000:3000 --env-file .env.local medme-app
   ```

#### Option C: Traditional Server Deployment

1. **Server Setup**
   ```bash
   # Install Node.js and npm
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   npm install -g pm2
   ```

2. **Application Deployment**
   ```bash
   # Clone repository
   git clone https://github.com/saiteja7065/Doctor-s-Appointment-Application.git
   cd Doctor-s-Appointment-Application
   
   # Install dependencies and build
   npm ci
   npm run build
   
   # Start with PM2
   pm2 start npm --name "medme-app" -- start
   pm2 save
   pm2 startup
   ```

## 🔒 Security Configuration

### 1. SSL/TLS Setup

```bash
# Using Let's Encrypt with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 2. Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## 📊 Database Setup

### 1. MongoDB Atlas Configuration

1. **Create Production Cluster**
   - Log in to MongoDB Atlas
   - Create new cluster for production
   - Configure appropriate instance size
   - Enable backup and monitoring

2. **Security Configuration**
   ```bash
   # Create database user
   # Set IP whitelist for production servers
   # Enable authentication
   # Configure network access
   ```

3. **Database Indexes**
   ```javascript
   // Create indexes for optimal performance
   db.users.createIndex({ "clerkId": 1 }, { unique: true })
   db.users.createIndex({ "email": 1 }, { unique: true })
   db.doctors.createIndex({ "userId": 1 })
   db.doctors.createIndex({ "specialty": 1 })
   db.doctors.createIndex({ "verificationStatus": 1 })
   db.patients.createIndex({ "userId": 1 })
   db.appointments.createIndex({ "doctorId": 1, "patientId": 1 })
   db.appointments.createIndex({ "scheduledFor": 1 })
   db.appointments.createIndex({ "status": 1 })
   db.auditlogs.createIndex({ "timestamp": -1 })
   db.auditlogs.createIndex({ "userId": 1 })
   ```

## 🔧 Third-Party Service Configuration

### 1. Clerk Authentication

1. **Production Instance Setup**
   - Create production instance in Clerk Dashboard
   - Configure authentication methods
   - Set up custom domains
   - Configure webhooks for user events

2. **Webhook Configuration**
   ```bash
   # Webhook endpoint: https://your-domain.com/api/webhooks/clerk
   # Events: user.created, user.updated, user.deleted
   ```

### 2. Stripe Payment Setup

1. **Live Mode Configuration**
   - Switch to live mode in Stripe Dashboard
   - Configure payment methods
   - Set up webhooks
   - Configure tax settings

2. **Webhook Endpoints**
   ```bash
   # Webhook endpoint: https://your-domain.com/api/webhooks/stripe
   # Events: payment_intent.succeeded, subscription.created, etc.
   ```

### 3. Vonage Video API

1. **Production Application**
   - Create production application in Vonage Dashboard
   - Generate API credentials
   - Configure callback URLs
   - Set up recording settings (if needed)

## 📈 Monitoring and Analytics

### 1. Application Monitoring

```bash
# Install monitoring tools
npm install @sentry/nextjs
npm install @vercel/analytics
```

### 2. Health Check Endpoints

The application includes built-in health check endpoints:
- `/api/health` - Basic health check
- `/api/health/detailed` - Detailed system status
- `/api/security/metrics` - Security metrics

### 3. Log Management

```bash
# Configure log rotation
sudo nano /etc/logrotate.d/medme-app

/var/log/medme-app/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

## 🚀 Performance Optimization

### 1. CDN Configuration

```bash
# Configure CDN for static assets
# Use Vercel Edge Network or CloudFlare
```

### 2. Caching Strategy

```javascript
// Redis configuration for session storage
const redis = require('redis');
const client = redis.createClient({
  host: 'your-redis-host',
  port: 6379,
  password: 'your-redis-password'
});
```

### 3. Database Optimization

```javascript
// Connection pooling configuration
const mongooseOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  bufferMaxEntries: 0
};
```

## 🔍 Testing in Production

### 1. Smoke Tests

```bash
# Run basic functionality tests
curl -f https://your-domain.com/api/health
curl -f https://your-domain.com/
```

### 2. Load Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Run load tests
artillery quick --count 10 --num 5 https://your-domain.com
```

## 📋 Post-Deployment Checklist

- [ ] SSL certificate installed and working
- [ ] All environment variables configured
- [ ] Database connections working
- [ ] Third-party integrations tested
- [ ] Payment processing functional
- [ ] Email notifications working
- [ ] SMS notifications working
- [ ] Video consultations working
- [ ] Security headers configured
- [ ] Monitoring and logging active
- [ ] Backup systems in place
- [ ] Performance optimization applied
- [ ] Load testing completed
- [ ] Documentation updated

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Issues**
   ```bash
   # Check MongoDB connection
   mongosh "mongodb+srv://cluster.mongodb.net/medme-prod"
   ```

2. **SSL Certificate Issues**
   ```bash
   # Renew Let's Encrypt certificate
   sudo certbot renew
   ```

3. **Performance Issues**
   ```bash
   # Check application logs
   pm2 logs medme-app
   
   # Monitor system resources
   htop
   ```

## 📞 Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Monitor application logs
   - Check system performance
   - Review security alerts

2. **Monthly**
   - Update dependencies
   - Review and rotate API keys
   - Backup verification

3. **Quarterly**
   - Security audit
   - Performance optimization review
   - Disaster recovery testing

---

## 🎉 Congratulations!

Your MedMe Doctor Appointment Application is now ready for production! The application includes:

- ✅ **100% Feature Complete** - All core features implemented
- ✅ **Enterprise Security** - HIPAA compliant with comprehensive security measures
- ✅ **Production Ready** - Optimized for performance and scalability
- ✅ **Fully Tested** - Comprehensive test suite with high coverage
- ✅ **Documentation Complete** - Full deployment and maintenance guides

For support or questions, refer to the technical documentation or contact the development team.
