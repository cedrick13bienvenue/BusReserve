import cron from 'node-cron';
import TokenBlacklist from '../models/TokenBlacklist';
import { logInfo, logError, logSuccess } from '../utils/loggerUtils';

export class CronService {
  /**
   * Clean up expired tokens from blacklist
   * Runs daily at 2:00 AM
   */
  static startTokenCleanup() {
    // Run every day at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        logInfo('Starting expired token cleanup...');
        
        const deletedCount = await TokenBlacklist.cleanupExpired();
        
        if (deletedCount > 0) {
          logSuccess(`Removed ${deletedCount} expired token(s) from blacklist`);
        } else {
          logInfo('No expired tokens to remove');
        }
      } catch (error: any) {
        logError('Failed to clean up expired tokens', error, {
          context: 'CronService.startTokenCleanup',
        });
      }
    });

    logInfo('✅ Token cleanup cron job scheduled (daily at 2:00 AM)');
  }

  /**
   * Clean up expired tokens immediately (manual trigger)
   */
  static async cleanupTokensNow(): Promise<number> {
    try {
      logInfo('Manual token cleanup triggered...');
      
      const deletedCount = await TokenBlacklist.cleanupExpired();
      
      if (deletedCount > 0) {
        logSuccess(`Removed ${deletedCount} expired token(s) from blacklist`);
      } else {
        logInfo('No expired tokens to remove');
      }
      
      return deletedCount;
    } catch (error: any) {
      logError('Failed to clean up expired tokens', error, {
        context: 'CronService.cleanupTokensNow',
      });
      throw error;
    }
  }

  /**
   * Start all cron jobs
   */
  static startAllJobs() {
    this.startTokenCleanup();
    // Add more cron jobs here as needed
    // Example: this.startBookingReminders();
    // Example: this.startDailyReports();
  }
}
