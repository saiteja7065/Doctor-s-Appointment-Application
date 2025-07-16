import mongoose, { Schema, Document } from 'mongoose';

// Transaction types
export enum TransactionType {
  PURCHASE = 'purchase',
  USAGE = 'usage',
  REFUND = 'refund',
  BONUS = 'bonus',
  SUBSCRIPTION = 'subscription',
  WITHDRAWAL = 'withdrawal',
  EARNING = 'earning'
}

// Transaction status
export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

// Transaction interface
export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User document
  clerkId: string; // For quick lookups
  type: TransactionType;
  description: string;
  credits: number; // Positive for additions, negative for deductions
  amount: number; // Amount in cents (for monetary transactions)
  currency: string;
  status: TransactionStatus;
  stripePaymentIntentId?: string;
  stripeSessionId?: string;
  metadata?: {
    appointmentId?: string;
    packageId?: string;
    planId?: string;
    doctorId?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Transaction schema
const TransactionSchema = new Schema<ITransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    clerkId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    credits: {
      type: Number,
      required: true,
      default: 0,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'usd',
      lowercase: true,
      minlength: 3,
      maxlength: 3,
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      required: true,
      default: TransactionStatus.PENDING,
      index: true,
    },
    stripePaymentIntentId: {
      type: String,
      sparse: true, // Allow multiple null values but unique non-null values
    },
    stripeSessionId: {
      type: String,
      sparse: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: 'transactions',
  }
);

// Indexes for better query performance
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ clerkId: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, status: 1 });
// Note: stripePaymentIntentId and stripeSessionId already have sparse indexes from field definition

// Virtual to format amount for display
TransactionSchema.virtual('formattedAmount').get(function (this: ITransaction) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency.toUpperCase(),
  }).format(this.amount / 100);
});

// Virtual to check if transaction is monetary
TransactionSchema.virtual('isMonetary').get(function (this: ITransaction) {
  return this.amount > 0;
});

// Static method to create a credit purchase transaction
TransactionSchema.statics.createCreditPurchase = function(
  userId: mongoose.Types.ObjectId,
  clerkId: string,
  credits: number,
  amount: number,
  packageId: string,
  stripeSessionId?: string
) {
  return new this({
    userId,
    clerkId,
    type: TransactionType.PURCHASE,
    description: `Purchased ${credits} credits`,
    credits,
    amount,
    status: TransactionStatus.PENDING,
    stripeSessionId,
    metadata: {
      packageId,
    },
  });
};

// Static method to create a credit usage transaction
TransactionSchema.statics.createCreditUsage = function(
  userId: mongoose.Types.ObjectId,
  clerkId: string,
  credits: number,
  description: string,
  appointmentId?: string
) {
  return new this({
    userId,
    clerkId,
    type: TransactionType.USAGE,
    description,
    credits: -Math.abs(credits), // Ensure negative for usage
    amount: 0,
    status: TransactionStatus.COMPLETED,
    metadata: {
      appointmentId,
    },
  });
};

// Static method to create a subscription transaction
TransactionSchema.statics.createSubscription = function(
  userId: mongoose.Types.ObjectId,
  clerkId: string,
  credits: number,
  amount: number,
  planId: string,
  stripeSessionId?: string
) {
  return new this({
    userId,
    clerkId,
    type: TransactionType.SUBSCRIPTION,
    description: `Subscription: ${planId}`,
    credits,
    amount,
    status: TransactionStatus.PENDING,
    stripeSessionId,
    metadata: {
      planId,
    },
  });
};

// Static method to create a doctor earning transaction
TransactionSchema.statics.createDoctorEarning = function(
  userId: mongoose.Types.ObjectId,
  clerkId: string,
  credits: number,
  appointmentId: string
) {
  return new this({
    userId,
    clerkId,
    type: TransactionType.EARNING,
    description: `Consultation fee earned`,
    credits,
    amount: 0,
    status: TransactionStatus.COMPLETED,
    metadata: {
      appointmentId,
    },
  });
};

// Instance method to mark as completed
TransactionSchema.methods.markCompleted = function() {
  this.status = TransactionStatus.COMPLETED;
  return this.save();
};

// Instance method to mark as failed
TransactionSchema.methods.markFailed = function() {
  this.status = TransactionStatus.FAILED;
  return this.save();
};

// Pre-save middleware to validate credits and amount
TransactionSchema.pre('save', function(next) {
  // Ensure usage transactions have negative credits
  if (this.type === TransactionType.USAGE && this.credits > 0) {
    this.credits = -Math.abs(this.credits);
  }
  
  // Ensure purchase/bonus transactions have positive credits
  if ([TransactionType.PURCHASE, TransactionType.BONUS, TransactionType.SUBSCRIPTION, TransactionType.EARNING].includes(this.type) && this.credits < 0) {
    this.credits = Math.abs(this.credits);
  }
  
  next();
});

// Prevent model re-compilation during development
export const Transaction = (mongoose.models?.Transaction as mongoose.Model<ITransaction>) || mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;
