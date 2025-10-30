import { Request, Response } from 'express';
import { CronService } from '../services/cronService';
import { sendSuccess, sendError } from '../utils/responseUtils';
import { logInfo, logError } from '../utils/loggerUtils';

export class AdminController {
  /**
   * Manually trigger token cleanup
   */
  static async cleanupExpiredTokens(_req: Request, res: Response): Promise<void> {
    try {
      const deletedCount = await CronService.cleanupTokensNow();

      sendSuccess(
        res,
        { deletedCount },
        `Successfully removed ${deletedCount} expired token(s)`
      );
    } catch (error: any) {
      logError('Manual token cleanup failed', error, {
        context: 'AdminController.cleanupExpiredTokens',
      });
      sendError(res, 'Failed to clean up expired tokens', 500);
    }
  }

  /**
   * Get system health and statistics
   */
  static async getSystemStats(_req: Request, res: Response): Promise<void> {
    try {
      // Add system statistics logic here
      const stats = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      };

      sendSuccess(res, stats);
    } catch (error: any) {
      logError('Failed to get system stats', error, {
        context: 'AdminController.getSystemStats',
      });
      sendError(res, 'Failed to retrieve system statistics', 500);
    }
  }
}