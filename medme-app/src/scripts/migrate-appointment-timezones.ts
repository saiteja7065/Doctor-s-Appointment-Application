/**
 * Migration script to update existing appointments with timezone information
 * This script adds timezone metadata to appointments that were created before timezone support
 */

import { connectToDatabase } from '@/lib/mongodb';
import Appointment from '@/lib/models/Appointment';
import { Doctor } from '@/lib/models/Doctor';
import { Patient } from '@/lib/models/Patient';
import { User } from '@/lib/models/User';
import { convertLocalTimeToUTC, getUserTimezone } from '@/lib/timezone';

interface MigrationStats {
  totalAppointments: number;
  updatedAppointments: number;
  skippedAppointments: number;
  errors: number;
}

/**
 * Migrate appointments to include timezone information
 */
export async function migrateAppointmentTimezones(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalAppointments: 0,
    updatedAppointments: 0,
    skippedAppointments: 0,
    errors: 0
  };

  try {
    console.log('🔄 Starting appointment timezone migration...');
    
    // Connect to database
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Get all appointments that don't have timezone information
    const appointments = await Appointment.find({
      $or: [
        { patientTimezone: { $exists: false } },
        { doctorTimezone: { $exists: false } },
        { appointmentTimeLocal: { $exists: false } }
      ]
    }).populate('doctorId').populate('patientId');

    stats.totalAppointments = appointments.length;
    console.log(`📊 Found ${stats.totalAppointments} appointments to migrate`);

    for (const appointment of appointments) {
      try {
        let needsUpdate = false;
        const updateData: any = {};

        // Get doctor and patient information
        const doctor = await Doctor.findById(appointment.doctorId);
        const patient = await Patient.findById(appointment.patientId);
        
        if (!doctor) {
          console.warn(`⚠️  Doctor not found for appointment ${appointment._id}`);
          stats.errors++;
          continue;
        }

        // Set doctor timezone if missing
        if (!appointment.doctorTimezone && doctor.timeZone) {
          updateData.doctorTimezone = doctor.timeZone;
          needsUpdate = true;
        }

        // Set patient timezone if missing (default to UTC if unknown)
        if (!appointment.patientTimezone) {
          // Try to get patient's timezone from their user profile or default to UTC
          let patientTimezone = 'UTC';
          
          if (patient) {
            const user = await User.findById(patient.userId);
            if (user && user.timeZone) {
              patientTimezone = user.timeZone;
            } else {
              // Default to doctor's timezone as a reasonable fallback
              patientTimezone = doctor.timeZone || 'UTC';
            }
          }
          
          updateData.patientTimezone = patientTimezone;
          needsUpdate = true;
        }

        // Convert appointment time to UTC if needed
        if (!appointment.appointmentTimeLocal) {
          // Current appointmentTime is assumed to be in local time
          const localTime = appointment.appointmentTime;
          const patientTimezone = updateData.patientTimezone || appointment.patientTimezone || 'UTC';
          
          try {
            // Convert local time to UTC
            const utcTime = convertLocalTimeToUTC(localTime, patientTimezone);
            
            updateData.appointmentTimeLocal = localTime; // Store original local time
            updateData.appointmentTime = utcTime; // Update to UTC time
            needsUpdate = true;
          } catch (error) {
            console.warn(`⚠️  Failed to convert time for appointment ${appointment._id}:`, error);
            // Keep original time if conversion fails
            updateData.appointmentTimeLocal = localTime;
            needsUpdate = true;
          }
        }

        // Update appointment if needed
        if (needsUpdate) {
          await Appointment.findByIdAndUpdate(appointment._id, updateData);
          stats.updatedAppointments++;
          
          console.log(`✅ Updated appointment ${appointment._id} with timezone data`);
        } else {
          stats.skippedAppointments++;
        }

      } catch (error) {
        console.error(`❌ Error updating appointment ${appointment._id}:`, error);
        stats.errors++;
      }
    }

    console.log('🎉 Migration completed!');
    console.log(`📊 Migration Statistics:`);
    console.log(`   Total appointments: ${stats.totalAppointments}`);
    console.log(`   Updated: ${stats.updatedAppointments}`);
    console.log(`   Skipped: ${stats.skippedAppointments}`);
    console.log(`   Errors: ${stats.errors}`);

    return stats;

  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

/**
 * Validate migrated data
 */
export async function validateMigration(): Promise<boolean> {
  try {
    console.log('🔍 Validating migration...');
    
    const isConnected = await connectToDatabase();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    // Check for appointments without timezone information
    const appointmentsWithoutTimezone = await Appointment.countDocuments({
      $or: [
        { patientTimezone: { $exists: false } },
        { doctorTimezone: { $exists: false } },
        { appointmentTimeLocal: { $exists: false } }
      ]
    });

    if (appointmentsWithoutTimezone > 0) {
      console.warn(`⚠️  Found ${appointmentsWithoutTimezone} appointments still missing timezone information`);
      return false;
    }

    // Check for invalid timezone values
    const appointmentsWithInvalidTimezone = await Appointment.find({
      $or: [
        { patientTimezone: { $in: ['', null] } },
        { doctorTimezone: { $in: ['', null] } }
      ]
    });

    if (appointmentsWithInvalidTimezone.length > 0) {
      console.warn(`⚠️  Found ${appointmentsWithInvalidTimezone.length} appointments with invalid timezone values`);
      return false;
    }

    console.log('✅ Migration validation passed!');
    return true;

  } catch (error) {
    console.error('❌ Migration validation failed:', error);
    return false;
  }
}

/**
 * Run the migration if this script is executed directly
 */
if (require.main === module) {
  migrateAppointmentTimezones()
    .then(async (stats) => {
      console.log('Migration completed successfully');
      
      // Validate the migration
      const isValid = await validateMigration();
      if (!isValid) {
        console.error('Migration validation failed');
        process.exit(1);
      }
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
