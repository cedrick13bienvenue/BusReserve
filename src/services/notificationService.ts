import SocketServer from '../config/socket';
import { logInfo, logError } from '../utils/loggerUtils';

export enum NotificationType {
  BOOKING_CREATED = 'booking:created',
  BOOKING_CANCELLED = 'booking:cancelled',
  BOOKING_COMPLETED = 'booking:completed',
  SEAT_LOW = 'seat:low',
  SEAT_AVAILABLE = 'seat:available',
  SCHEDULE_UPDATED = 'schedule:updated',
  ROUTE_UPDATED = 'route:updated',
  PAYMENT_RECEIVED = 'payment:received',
  REMINDER = 'reminder',
  SYSTEM = 'system',
}

export interface Notification {
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high';
  actionUrl?: string;
  actionText?: string;
}

export class NotificationService {
  /**
   * Send notification to a specific user
   */
  static sendToUser(userId: number, notification: Notification): void {
    try {
      const socketServer = SocketServer.getInstance();
      socketServer.sendNotificationToUser(userId, {
        ...notification,
        timestamp: new Date().toISOString(),
        read: false,
      });

      logInfo(`Notification sent to user ${userId}: ${notification.title}`);
    } catch (error) {
      logError('Error sending user notification', error, {
        context: 'NotificationService.sendToUser',
        userId,
      });
    }
  }

  /**
   * Send booking confirmation notification
   */
  static sendBookingConfirmation(
    userId: number,
    bookingCode: string,
    details: any
  ): void {
    const notification: Notification = {
      type: NotificationType.BOOKING_CREATED,
      title: '🎉 Booking Confirmed!',
      message: `Your booking ${bookingCode} has been confirmed.`,
      data: {
        bookingCode,
        ...details,
      },
      priority: 'high',
      actionUrl: `/bookings/${bookingCode}`,
      actionText: 'View Booking',
    };

    this.sendToUser(userId, notification);
  }

  /**
   * Send booking cancellation notification
   */
  static sendBookingCancellation(userId: number, bookingCode: string): void {
    const notification: Notification = {
      type: NotificationType.BOOKING_CANCELLED,
      title: 'Booking Cancelled',
      message: `Your booking ${bookingCode} has been cancelled.`,
      data: { bookingCode },
      priority: 'medium',
    };

    this.sendToUser(userId, notification);
  }

  /**
   * Send low seat availability warning
   */
  static sendLowSeatWarning(
    scheduleId: number,
    travelDate: string,
    remainingSeats: number
  ): void {
    try {
      const socketServer = SocketServer.getInstance();
      
      const notification: Notification = {
        type: NotificationType.SEAT_LOW,
        title: '⚠️ Limited Seats!',
        message: `Only ${remainingSeats} seats remaining for this trip.`,
        data: {
          scheduleId,
          travelDate,
          remainingSeats,
        },
        priority: 'high',
      };

      // Send to all users watching this schedule
      socketServer.getIO().to(`schedule:${scheduleId}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString(),
      });

      logInfo(`Low seat warning sent for schedule ${scheduleId}`);
    } catch (error) {
      logError('Error sending low seat warning', error, {
        context: 'NotificationService.sendLowSeatWarning',
      });
    }
  }

  /**
   * Send travel reminder notification
   */
  static sendTravelReminder(
    userId: number,
    bookingCode: string,
    travelDate: string,
    hoursUntilDeparture: number
  ): void {
    const notification: Notification = {
      type: NotificationType.REMINDER,
      title: '🚌 Travel Reminder',
      message: `Your trip is in ${hoursUntilDeparture} hours. Booking: ${bookingCode}`,
      data: {
        bookingCode,
        travelDate,
        hoursUntilDeparture,
      },
      priority: 'high',
      actionUrl: `/bookings/${bookingCode}`,
      actionText: 'View Details',
    };

    this.sendToUser(userId, notification);
  }

  /**
   * Send schedule update notification
   */
  static sendScheduleUpdate(
    scheduleId: number,
    routeId: number,
    message: string
  ): void {
    try {
      const socketServer = SocketServer.getInstance();
      
      const notification: Notification = {
        type: NotificationType.SCHEDULE_UPDATED,
        title: '📅 Schedule Updated',
        message,
        data: {
          scheduleId,
          routeId,
        },
        priority: 'medium',
      };

      // Send to all users watching this schedule
      socketServer.getIO().to(`schedule:${scheduleId}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString(),
      });

      // Also send to route watchers
      socketServer.getIO().to(`route:${routeId}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString(),
      });

      logInfo(`Schedule update notification sent for schedule ${scheduleId}`);
    } catch (error) {
      logError('Error sending schedule update notification', error);
    }
  }

  /**
   * Broadcast system-wide notification
   */
  static broadcastSystem(message: string, priority: 'low' | 'medium' | 'high' = 'medium'): void {
    try {
      const socketServer = SocketServer.getInstance();
      
      const notification: Notification = {
        type: NotificationType.SYSTEM,
        title: '📢 System Announcement',
        message,
        priority,
      };

      socketServer.broadcastSystemNotification(notification);
      
      logInfo('System notification broadcasted');
    } catch (error) {
      logError('Error broadcasting system notification', error);
    }
  }

  /**
   * Send payment confirmation notification
   */
  static sendPaymentConfirmation(
    userId: number,
    bookingCode: string,
    amount: number
  ): void {
    const notification: Notification = {
      type: NotificationType.PAYMENT_RECEIVED,
      title: '💳 Payment Received',
      message: `Payment of RWF ${amount.toLocaleString()} received for booking ${bookingCode}.`,
      data: {
        bookingCode,
        amount,
      },
      priority: 'high',
      actionUrl: `/bookings/${bookingCode}`,
      actionText: 'View Receipt',
    };

    this.sendToUser(userId, notification);
  }

  /**
   * Send seat availability update to schedule watchers
   */
  static sendSeatAvailabilityUpdate(
    scheduleId: number,
    travelDate: string,
    availableSeats: number
  ): void {
    try {
      const socketServer = SocketServer.getInstance();
      
      socketServer.getIO().to(`schedule:${scheduleId}`).emit('seats:update', {
        scheduleId,
        travelDate,
        availableSeats,
        timestamp: new Date().toISOString(),
      });

      logInfo(`Seat availability update sent for schedule ${scheduleId}`);
    } catch (error) {
      logError('Error sending seat availability update', error);
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(): Promise<any> {
    try {
      const socketServer = SocketServer.getInstance();
      const connectedClients = socketServer.getConnectedClientsCount();

      return {
        connectedClients,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logError('Error getting notification stats', error);
      return {
        connectedClients: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }
}