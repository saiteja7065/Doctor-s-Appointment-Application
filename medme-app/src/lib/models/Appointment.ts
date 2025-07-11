import mongoose, { Schema, Document, Types } from 'mongoose';

// Appointment status enum
export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no-show',
  RESCHEDULED = 'rescheduled'
}

// Consultation type enum
export enum ConsultationType {
  VIDEO = 'video',
  PHONE = 'phone',
  IN_PERSON = 'in-person'
}

// Payment status enum
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed'
}

// Appointment interface
export interface IAppointment extends Document {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  appointmentDate: string; // YYYY-MM-DD format
  appointmentTime: string; // HH:MM format
  duration: number; // in minutes
  status: AppointmentStatus;
  topic: string;
  description?: string;
  consultationType: ConsultationType;
  consultationFee: number; // in credits
  paymentStatus: PaymentStatus;
  meetingLink?: string;
  sessionId?: string; // Vonage session ID
  notes?: string;
  prescription?: string;
  followUpRequired?: boolean;
  followUpDate?: Date;
  cancelledBy?: 'patient' | 'doctor' | 'system';
  cancellationReason?: string;
  rescheduledFrom?: Types.ObjectId; // Reference to original appointment if rescheduled
  rating?: number; // 1-5 rating from patient
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Appointment schema
const AppointmentSchema = new Schema<IAppointment>(
  {
    patientId: {
      type: Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    doctorId: {
      type: Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    patientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    appointmentDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD format
    },
    appointmentTime: {
      type: String,
      required: true,
      match: /^\d{2}:\d{2}$/, // HH:MM format
    },
    duration: {
      type: Number,
      required: true,
      min: 15,
      max: 120,
      default: 30,
    },
    status: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.SCHEDULED,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    consultationType: {
      type: String,
      enum: Object.values(ConsultationType),
      default: ConsultationType.VIDEO,
    },
    consultationFee: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    sessionId: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    prescription: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    followUpRequired: {
      type: Boolean,
      default: false,
    },
    followUpDate: {
      type: Date,
    },
    cancelledBy: {
      type: String,
      enum: ['patient', 'doctor', 'system'],
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    rescheduledFrom: {
      type: Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
AppointmentSchema.index({ patientId: 1, appointmentDate: -1 });
AppointmentSchema.index({ doctorId: 1, appointmentDate: -1 });
AppointmentSchema.index({ appointmentDate: 1, appointmentTime: 1 });
AppointmentSchema.index({ status: 1, appointmentDate: 1 });
AppointmentSchema.index({ paymentStatus: 1 });
AppointmentSchema.index({ createdAt: -1 });

// Virtual for full appointment datetime
AppointmentSchema.virtual('appointmentDateTime').get(function (this: IAppointment) {
  return new Date(`${this.appointmentDate}T${this.appointmentTime}:00`);
});

// Virtual for formatted date and time
AppointmentSchema.virtual('formattedDateTime').get(function (this: IAppointment) {
  const date = new Date(`${this.appointmentDate}T${this.appointmentTime}:00`);
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    full: date.toLocaleString(),
  };
});

// Instance methods
AppointmentSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const appointmentTime = new Date(`${this.appointmentDate}T${this.appointmentTime}:00`);
  const timeDiff = appointmentTime.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  return this.status === AppointmentStatus.SCHEDULED && hoursDiff >= 2; // Can cancel 2+ hours before
};

AppointmentSchema.methods.canBeRescheduled = function() {
  const now = new Date();
  const appointmentTime = new Date(`${this.appointmentDate}T${this.appointmentTime}:00`);
  const timeDiff = appointmentTime.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  return this.status === AppointmentStatus.SCHEDULED && hoursDiff >= 4; // Can reschedule 4+ hours before
};

AppointmentSchema.methods.isUpcoming = function() {
  const now = new Date();
  const appointmentTime = new Date(`${this.appointmentDate}T${this.appointmentTime}:00`);
  return appointmentTime > now && this.status === AppointmentStatus.SCHEDULED;
};

AppointmentSchema.methods.isPast = function() {
  const now = new Date();
  const appointmentTime = new Date(`${this.appointmentDate}T${this.appointmentTime}:00`);
  return appointmentTime < now;
};

// Static methods
AppointmentSchema.statics.findByDoctor = function(doctorId: string, options: any = {}) {
  const query = { doctorId };
  if (options.status) query.status = options.status;
  if (options.date) query.appointmentDate = options.date;
  
  return this.find(query).sort({ appointmentDate: -1, appointmentTime: -1 });
};

AppointmentSchema.statics.findByPatient = function(patientId: string, options: any = {}) {
  const query = { patientId };
  if (options.status) query.status = options.status;
  if (options.date) query.appointmentDate = options.date;
  
  return this.find(query).sort({ appointmentDate: -1, appointmentTime: -1 });
};

AppointmentSchema.statics.findUpcoming = function(doctorId?: string, patientId?: string) {
  const today = new Date().toISOString().split('T')[0];
  const query: any = {
    appointmentDate: { $gte: today },
    status: AppointmentStatus.SCHEDULED,
  };
  
  if (doctorId) query.doctorId = doctorId;
  if (patientId) query.patientId = patientId;
  
  return this.find(query).sort({ appointmentDate: 1, appointmentTime: 1 });
};

// Pre-save middleware
AppointmentSchema.pre('save', function (next) {
  // Validate appointment time is in the future for new appointments
  if (this.isNew && this.status === AppointmentStatus.SCHEDULED) {
    const appointmentDateTime = new Date(`${this.appointmentDate}T${this.appointmentTime}:00`);
    const now = new Date();
    
    if (appointmentDateTime <= now) {
      const error = new Error('Appointment time must be in the future');
      error.name = 'ValidationError';
      return next(error);
    }
  }
  
  next();
});

// Export the model
const Appointment = mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema);
export default Appointment;
