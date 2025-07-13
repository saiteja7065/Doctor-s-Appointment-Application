import { Types } from 'mongoose';
import { 
  EarningTransaction, 
  WithdrawalRequest, 
  DoctorEarnings,
  EarningType,
  WithdrawalStatus,
  WithdrawalMethod,
  IEarningTransaction,
  IWithdrawalRequest,
  IDoctorEarnings
} from '@/lib/models/DoctorEarnings';
import { Doctor } from '@/lib/models/Doctor';
import Appointment from '@/lib/models/Appointment';
import { sendNotification } from '@/lib/notifications';

export class EarningsService {
  /**
   * Record earnings for a completed consultation
   */
  static async recordConsultationEarning(
    doctorId: Types.ObjectId,
    clerkId: string,
    appointmentId: Types.ObjectId,
    patientId: Types.ObjectId,
    patientName: string,
    amount: number,
    consultationDate: Date,
    consultationType: string = 'video'
  ): Promise<IEarningTransaction> {
    try {
      // Create earning transaction
      const earningTransaction = new EarningTransaction({
        doctorId,
        clerkId,
        type: EarningType.CONSULTATION,
        amount,
        description: `Consultation with ${patientName}`,
        appointmentId,
        patientId,
        patientName,
        consultationDate,
        status: 'completed',
        metadata: {
          consultationType,
          originalAmount: amount
        }
      });

      await earningTransaction.save();

      // Update doctor earnings summary
      await this.updateDoctorEarnings(doctorId, clerkId);

      // Send notification to doctor
      try {
        await sendNotification(
          clerkId,
          'doctor',
          'earningAdded',
          amount.toString(),
          appointmentId.toString()
        );
      } catch (notificationError) {
        console.error('Failed to send earning notification:', notificationError);
      }

      return earningTransaction;
    } catch (error) {
      console.error('Error recording consultation earning:', error);
      throw error;
    }
  }

  /**
   * Record bonus earnings
   */
  static async recordBonusEarning(
    doctorId: Types.ObjectId,
    clerkId: string,
    amount: number,
    reason: string
  ): Promise<IEarningTransaction> {
    try {
      const earningTransaction = new EarningTransaction({
        doctorId,
        clerkId,
        type: EarningType.BONUS,
        amount,
        description: `Bonus: ${reason}`,
        status: 'completed',
        metadata: {
          bonusReason: reason,
          originalAmount: amount
        }
      });

      await earningTransaction.save();
      await this.updateDoctorEarnings(doctorId, clerkId);

      return earningTransaction;
    } catch (error) {
      console.error('Error recording bonus earning:', error);
      throw error;
    }
  }

  /**
   * Update doctor earnings summary
   */
  static async updateDoctorEarnings(
    doctorId: Types.ObjectId,
    clerkId: string
  ): Promise<IDoctorEarnings> {
    try {
      // Get or create doctor earnings record
      let doctorEarnings = await DoctorEarnings.findOne({ doctorId });
      
      if (!doctorEarnings) {
        doctorEarnings = new DoctorEarnings({
          doctorId,
          clerkId,
          totalEarnings: 0,
          availableBalance: 0,
          pendingEarnings: 0,
          totalWithdrawn: 0,
          totalConsultations: 0,
          averagePerConsultation: 0,
          thisMonthEarnings: 0,
          lastMonthEarnings: 0,
          monthlyData: []
        });
      }

      // Calculate total earnings from all completed transactions
      const totalEarningsResult = await EarningTransaction.aggregate([
        { $match: { doctorId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalEarnings = totalEarningsResult[0]?.total || 0;

      // Calculate total withdrawn
      const totalWithdrawnResult = await WithdrawalRequest.aggregate([
        { $match: { doctorId, status: WithdrawalStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalWithdrawn = totalWithdrawnResult[0]?.total || 0;

      // Calculate available balance
      const availableBalance = totalEarnings - totalWithdrawn;

      // Calculate pending earnings
      const pendingEarningsResult = await EarningTransaction.aggregate([
        { $match: { doctorId, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const pendingEarnings = pendingEarningsResult[0]?.total || 0;

      // Calculate consultation count
      const totalConsultations = await EarningTransaction.countDocuments({
        doctorId,
        type: EarningType.CONSULTATION,
        status: 'completed'
      });

      // Calculate average per consultation
      const consultationEarningsResult = await EarningTransaction.aggregate([
        { 
          $match: { 
            doctorId, 
            type: EarningType.CONSULTATION, 
            status: 'completed' 
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const consultationEarnings = consultationEarningsResult[0]?.total || 0;
      const averagePerConsultation = totalConsultations > 0 ? consultationEarnings / totalConsultations : 0;

      // Calculate this month's earnings
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const thisMonthEarningsResult = await EarningTransaction.aggregate([
        { 
          $match: { 
            doctorId, 
            status: 'completed',
            createdAt: { $gte: startOfMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const thisMonthEarnings = thisMonthEarningsResult[0]?.total || 0;

      // Calculate last month's earnings
      const startOfLastMonth = new Date();
      startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);
      startOfLastMonth.setDate(1);
      startOfLastMonth.setHours(0, 0, 0, 0);

      const endOfLastMonth = new Date();
      endOfLastMonth.setDate(0);
      endOfLastMonth.setHours(23, 59, 59, 999);

      const lastMonthEarningsResult = await EarningTransaction.aggregate([
        { 
          $match: { 
            doctorId, 
            status: 'completed',
            createdAt: { 
              $gte: startOfLastMonth,
              $lte: endOfLastMonth
            }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const lastMonthEarnings = lastMonthEarningsResult[0]?.total || 0;

      // Calculate monthly data for the last 12 months
      const monthlyData = await this.calculateMonthlyData(doctorId);

      // Update doctor earnings
      doctorEarnings.totalEarnings = totalEarnings;
      doctorEarnings.availableBalance = availableBalance;
      doctorEarnings.pendingEarnings = pendingEarnings;
      doctorEarnings.totalWithdrawn = totalWithdrawn;
      doctorEarnings.totalConsultations = totalConsultations;
      doctorEarnings.averagePerConsultation = Math.round(averagePerConsultation * 100) / 100;
      doctorEarnings.thisMonthEarnings = thisMonthEarnings;
      doctorEarnings.lastMonthEarnings = lastMonthEarnings;
      doctorEarnings.monthlyData = monthlyData;
      doctorEarnings.lastCalculatedAt = new Date();

      await doctorEarnings.save();

      return doctorEarnings;
    } catch (error) {
      console.error('Error updating doctor earnings:', error);
      throw error;
    }
  }

  /**
   * Calculate monthly earnings data
   */
  static async calculateMonthlyData(doctorId: Types.ObjectId) {
    try {
      const monthlyData = [];
      const currentDate = new Date();

      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setMonth(date.getMonth() - i);
        
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

        // Get earnings for the month
        const monthEarningsResult = await EarningTransaction.aggregate([
          { 
            $match: { 
              doctorId, 
              status: 'completed',
              createdAt: { 
                $gte: startOfMonth,
                $lte: endOfMonth
              }
            } 
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const monthEarnings = monthEarningsResult[0]?.total || 0;

        // Get consultation count for the month
        const monthConsultations = await EarningTransaction.countDocuments({
          doctorId,
          type: EarningType.CONSULTATION,
          status: 'completed',
          createdAt: { 
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        });

        // Get average rating for the month (from appointments)
        const ratingResult = await Appointment.aggregate([
          { 
            $match: { 
              doctorId,
              status: 'completed',
              rating: { $exists: true, $ne: null },
              createdAt: { 
                $gte: startOfMonth,
                $lte: endOfMonth
              }
            } 
          },
          { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ]);
        const averageRating = ratingResult[0]?.avgRating || 0;

        monthlyData.push({
          month: monthKey,
          earnings: monthEarnings,
          consultations: monthConsultations,
          averageRating: Math.round(averageRating * 10) / 10
        });
      }

      return monthlyData;
    } catch (error) {
      console.error('Error calculating monthly data:', error);
      return [];
    }
  }

  /**
   * Create withdrawal request
   */
  static async createWithdrawalRequest(
    doctorId: Types.ObjectId,
    clerkId: string,
    amount: number,
    method: WithdrawalMethod,
    paymentDetails: any
  ): Promise<IWithdrawalRequest> {
    try {
      // Check available balance
      const doctorEarnings = await DoctorEarnings.findOne({ doctorId });
      if (!doctorEarnings || doctorEarnings.availableBalance < amount) {
        throw new Error('Insufficient balance for withdrawal');
      }

      // Generate unique request ID
      const requestId = `WR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create withdrawal request
      const withdrawalRequest = new WithdrawalRequest({
        doctorId,
        clerkId,
        requestId,
        amount,
        method,
        status: WithdrawalStatus.PENDING,
        requestDate: new Date(),
        ...paymentDetails
      });

      await withdrawalRequest.save();

      // Send notification
      try {
        await sendNotification(
          clerkId,
          'doctor',
          'withdrawalRequested',
          amount.toString(),
          requestId
        );
      } catch (notificationError) {
        console.error('Failed to send withdrawal notification:', notificationError);
      }

      return withdrawalRequest;
    } catch (error) {
      console.error('Error creating withdrawal request:', error);
      throw error;
    }
  }

  /**
   * Get doctor earnings summary
   */
  static async getDoctorEarnings(doctorId: Types.ObjectId): Promise<IDoctorEarnings | null> {
    try {
      return await DoctorEarnings.findOne({ doctorId });
    } catch (error) {
      console.error('Error getting doctor earnings:', error);
      return null;
    }
  }

  /**
   * Get earning transactions for a doctor
   */
  static async getEarningTransactions(
    doctorId: Types.ObjectId,
    limit: number = 50,
    offset: number = 0
  ): Promise<IEarningTransaction[]> {
    try {
      return await EarningTransaction.find({ doctorId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .populate('appointmentId', 'appointmentDate appointmentTime')
        .populate('patientId', 'firstName lastName');
    } catch (error) {
      console.error('Error getting earning transactions:', error);
      return [];
    }
  }

  /**
   * Get withdrawal requests for a doctor
   */
  static async getWithdrawalRequests(
    doctorId: Types.ObjectId,
    limit: number = 20,
    offset: number = 0
  ): Promise<IWithdrawalRequest[]> {
    try {
      return await WithdrawalRequest.find({ doctorId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset);
    } catch (error) {
      console.error('Error getting withdrawal requests:', error);
      return [];
    }
  }

  /**
   * Process withdrawal request (admin function)
   */
  static async processWithdrawalRequest(
    requestId: string,
    status: WithdrawalStatus,
    adminNotes?: string,
    transactionId?: string,
    failureReason?: string
  ): Promise<IWithdrawalRequest | null> {
    try {
      const withdrawalRequest = await WithdrawalRequest.findOne({ requestId });
      if (!withdrawalRequest) {
        throw new Error('Withdrawal request not found');
      }

      withdrawalRequest.status = status;
      withdrawalRequest.adminNotes = adminNotes;
      withdrawalRequest.transactionId = transactionId;
      withdrawalRequest.failureReason = failureReason;

      if (status === WithdrawalStatus.PROCESSING) {
        withdrawalRequest.processedDate = new Date();
      } else if (status === WithdrawalStatus.COMPLETED) {
        withdrawalRequest.completedDate = new Date();
        
        // Update doctor earnings
        await this.updateDoctorEarnings(withdrawalRequest.doctorId, withdrawalRequest.clerkId);
      }

      await withdrawalRequest.save();

      // Send notification to doctor
      try {
        await sendNotification(
          withdrawalRequest.clerkId,
          'doctor',
          'withdrawalStatusUpdate',
          status,
          requestId
        );
      } catch (notificationError) {
        console.error('Failed to send withdrawal status notification:', notificationError);
      }

      return withdrawalRequest;
    } catch (error) {
      console.error('Error processing withdrawal request:', error);
      throw error;
    }
  }
}
