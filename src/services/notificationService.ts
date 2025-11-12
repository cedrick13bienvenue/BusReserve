import SocketServer from '../config/socket';
import { logInfo, logError, logSuccess } from '../utils/loggerUtils';

export enum NotificationType {
  // Booking notifications
  BOOKING_CREATED = 'booking:created',
  BOOKING_CANCELLED = 'booking:cancelled',
  BOOKING_COMPLETED = 'booking:completed',
  BOOKING_STATUS_CHANGED = 'booking:status:changed',
  
  // Seat notifications
  SEAT_UPDATED = 'seat:updated',
  SEAT_LOW = 'seat:low',
  SEAT_CRITICAL = 'seat:critical',
  SEAT_AVAILABLE = 'seat:available',
  
  // Schedule notifications
  SCHEDULE_CREATED = 'schedule:created',
  SCHEDULE_UPDATED = 'schedule:updated',
  SCHEDULE_DELETED = 'schedule:deleted',
  SCHEDULE_TIME_CHANGED = 'schedule:time:changed',
  SCHEDULE_PRICE_CHANGED = 'schedule:price:changed',
  
  // Route notifications
  ROUTE_CREATED = 'route:created',
  ROUTE_UPDATED = 'route:updated',
  ROUTE_DELETED = 'route:deleted',
  
  // System notifications
  SYSTEM_ANNOUNCEMENT = 'system:announcement',
  SYSTEM_MAINTENANCE = 'system:maintenance',
  SYSTEM_UPDATE = 'system:update',
  
  // Payment notifications
  PAYMENT_RECEIVED = 'payment:received',
  PAYMENT_FAILED = 'payment:failed',
  REFUND_PROCESSED = 'refund:processed',
  
  // Reminder notifications
  REMINDER_DEPARTURE = 'reminder:departure',
  REMINDER_24H = 'reminder:24h',
  REMINDER_1H = 'reminder:1h',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface Notification {
  id?: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data?: any;
  actionUrl?: string;
  actionText?: string;
  icon?: string;
  read?: boolean;
  createdAt?: string;
}

export interface NotificationOptions {
  persist?: boolean;
  sound?: boolean;
  badge?: boolean;
}

/**
 * Real-Time In-App Notification Service
 */
export class NotificationService {
  
  // ==================== BOOKING NOTIFICATIONS ====================
  
  /**
   * Send booking confirmation notification
   */
  static sendBookingConfirmation(
    userId: number,
    bookingData: {
      bookingCode: string;
      route: string;
      departureTime: string;
      seatNumber: number;
      price: number;
    }
  ): void {
    const notification: Notification = {
      id: this.generateNotificationId(),
      type: NotificationType.BOOKING_CREATED,
      priority: NotificationPriority.HIGH,
      title: '🎉 Booking Confirmed!',
      message: `Your booking ${bookingData.bookingCode} has been confirmed. Seat ${bookingData.seatNumber} for ${bookingData.route}.`,
      data: bookingData,
      actionUrl: `/bookings/${bookingData.bookingCode}`,
      actionText: 'View Booking',
      icon: '✅',
      read: false,
      createdAt: new Date().toISOString(),
    };

    this.sendToUser(userId, notification);
    logSuccess(`Booking confirmation notification sent to user ${userId}`);
  }

  /**
   * Send booking cancellation notification
   */
  static sendBookingCancellation(
    userId: number,
    bookingCode: string,
    reason?: string
  ): void {
    const notification: Notification = {
      id: this.generateNotificationId(),
      type: NotificationType.BOOKING_CANCELLED,
      priority: NotificationPriority.MEDIUM,
      title: '❌ Booking Cancelled',
      message: `Your booking ${bookingCode} has been cancelled. ${reason || 'Refund will be processed within 5-7 business days.'}`,
      data: { bookingCode, reason },
      icon: '🔄',
      read: false,
      createdAt: new Date().toISOString(),
    };

    this.sendToUser(userId, notification);
    logInfo(`Booking cancellation notification sent to user ${userId}`);
  }

  // ==================== SEAT NOTIFICATIONS ====================
  
  /**
   * Send seat availability update to schedule watchers
   */
  static sendSeatAvailabilityUpdate(
    scheduleId: number,
    travelDate: string,
    availableSeats: number,
    totalSeats: number
  ): void {
    try {
      const socketServer = SocketServer.getInstance();
      const occupancyRate = ((totalSeats - availableSeats) / totalSeats) * 100;
      
      let priority = NotificationPriority.LOW;
      let title = '🪑 Seats Updated';
      let icon = 'ℹ️';
      
      if (availableSeats <= 5) {
        priority = NotificationPriority.URGENT;
        title = '🔥 Critical: Very Few Seats!';
        icon = '⚠️';
      } else if (availableSeats <= 10) {
        priority = NotificationPriority.HIGH;
        title = '⚠️ Limited Seats Available';
        icon = '⏰';
      } else if (occupancyRate >= 50) {
        priority = NotificationPriority.MEDIUM;
        title = '📊 Seats Filling Up';
        icon = '📈';
      }

      const notification: Notification = {
        id: this.generateNotificationId(),
        type: availableSeats <= 5 ? NotificationType.SEAT_CRITICAL : NotificationType.SEAT_UPDATED,
        priority,
        title,
        message: `${availableSeats} of ${totalSeats} seats available for this journey.`,
        data: {
          scheduleId,
          travelDate,
          availableSeats,
          totalSeats,
          occupancyRate: occupancyRate.toFixed(1),
        },
        icon,
        read: false,
        createdAt: new Date().toISOString(),
      };

      socketServer.getIO().to(`schedule:${scheduleId}`).emit('notification', notification);
      socketServer.emitSeatAvailability(scheduleId, travelDate, Array.from({ length: availableSeats }, (_, i) => i + 1));
      
      logInfo(`Seat availability notification sent for schedule ${scheduleId}: ${availableSeats}/${totalSeats} seats`);
    } catch (error) {
      logError('Error sending seat availability notification', error);
    }
  }

  /**
   * Send low seat warning
   */
  static sendLowSeatWarning(
    scheduleId: number,
    travelDate: string,
    remainingSeats: number,
    route: string
  ): void {
    try {
      const socketServer = SocketServer.getInstance();
      
      const notification: Notification = {
        id: this.generateNotificationId(),
        type: NotificationType.SEAT_LOW,
        priority: NotificationPriority.HIGH,
        title: '⚠️ Hurry! Limited Seats',
        message: `Only ${remainingSeats} seats left for ${route} on ${new Date(travelDate).toLocaleDateString()}. Book now!`,
        data: {
          scheduleId,
          travelDate,
          remainingSeats,
          route,
        },
        actionUrl: `/schedules/${scheduleId}?date=${travelDate}`,
        actionText: 'Book Now',
        icon: '🚨',
        read: false,
        createdAt: new Date().toISOString(),
      };

      socketServer.getIO().to(`schedule:${scheduleId}`).emit('notification', notification);
      socketServer.emitLowSeatWarning(scheduleId, travelDate, remainingSeats);
      
      logInfo(`Low seat warning sent for schedule ${scheduleId}: ${remainingSeats} seats remaining`);
    } catch (error) {
      logError('Error sending low seat warning', error);
    }
  }

  // ==================== SCHEDULE NOTIFICATIONS ====================
  
  /**
   * Send schedule update notification
   */
  static sendScheduleUpdate(
    scheduleId: number,
    routeId: number,
    details: {
      route?: string;
      updateType?: 'time' | 'price' | 'general';
      oldValue?: string;
      newValue?: string;
      message?: string;
    }
  ): void {
    try {
      const socketServer = SocketServer.getInstance();
      
      let title = '📅 Schedule Updated';
      let message = details.message || 'Schedule has been updated.';
      let type = NotificationType.SCHEDULE_UPDATED;
      let priority = NotificationPriority.MEDIUM;
      
      if (details.updateType === 'time') {
        type = NotificationType.SCHEDULE_TIME_CHANGED;
        title = '⏰ Departure Time Changed';
        message = `${details.route}: Time changed from ${details.oldValue} to ${details.newValue}`;
        priority = NotificationPriority.HIGH;
      } else if (details.updateType === 'price') {
        type = NotificationType.SCHEDULE_PRICE_CHANGED;
        title = '💰 Price Updated';
        message = `${details.route}: Price changed from RWF ${details.oldValue} to RWF ${details.newValue}`;
      }

      const notification: Notification = {
        id: this.generateNotificationId(),
        type,
        priority,
        title,
        message,
        data: {
          scheduleId,
          routeId,
          ...details,
        },
        actionUrl: `/schedules/${scheduleId}`,
        actionText: 'View Schedule',
        icon: details.updateType === 'time' ? '⏰' : details.updateType === 'price' ? '💵' : '📋',
        read: false,
        createdAt: new Date().toISOString(),
      };

      socketServer.getIO().to(`schedule:${scheduleId}`).emit('notification', notification);
      socketServer.getIO().to(`route:${routeId}`).emit('notification', notification);
      socketServer.emitScheduleUpdated({ id: scheduleId, ...details });
      
      logInfo(`Schedule update notification sent for schedule ${scheduleId}`);
    } catch (error) {
      logError('Error sending schedule update notification', error);
    }
  }

  /**
   * Send new schedule created notification
   */
  static sendScheduleCreated(
    routeId: number,
    scheduleData: {
      scheduleId: number;
      route: string;
      departureTime: string;
      price: number;
      busType: string;
    }
  ): void {
    try {
      const socketServer = SocketServer.getInstance();
      
      const notification: Notification = {
        id: this.generateNotificationId(),
        type: NotificationType.SCHEDULE_CREATED,
        priority: NotificationPriority.MEDIUM,
        title: '🆕 New Schedule Available',
        message: `New ${scheduleData.busType} schedule for ${scheduleData.route} departing at ${scheduleData.departureTime}. Price: RWF ${scheduleData.price.toLocaleString()}`,
        data: scheduleData,
        actionUrl: `/schedules/${scheduleData.scheduleId}`,
        actionText: 'Book Now',
        icon: '🚌',
        read: false,
        createdAt: new Date().toISOString(),
      };

      socketServer.getIO().to(`route:${routeId}`).emit('notification', notification);
      
      logInfo(`New schedule notification sent for route ${routeId}`);
    } catch (error) {
      logError('Error sending schedule created notification', error);
    }
  }

  // ==================== ROUTE NOTIFICATIONS ====================
  
  /**
   * Send route update notification
   */
  static sendRouteUpdate(
    routeId: number,
    routeData: {
      route: string;
      updateType: 'created' | 'updated' | 'deleted';
      message?: string;
    }
  ): void {
    try {
      const socketServer = SocketServer.getInstance();
      
      let type = NotificationType.ROUTE_UPDATED;
      let title = '🗺️ Route Updated';
      let priority = NotificationPriority.MEDIUM;
      let icon = '🔄';
      
      if (routeData.updateType === 'created') {
        type = NotificationType.ROUTE_CREATED;
        title = '🆕 New Route Available';
        icon = '🚀';
      } else if (routeData.updateType === 'deleted') {
        type = NotificationType.ROUTE_DELETED;
        title = '❌ Route Discontinued';
        priority = NotificationPriority.HIGH;
        icon = '⚠️';
      }

      const notification: Notification = {
        id: this.generateNotificationId(),
        type,
        priority,
        title,
        message: routeData.message || `${routeData.route} has been ${routeData.updateType}.`,
        data: {
          routeId,
          ...routeData,
        },
        actionUrl: routeData.updateType !== 'deleted' ? `/routes/${routeId}` : undefined,
        actionText: routeData.updateType !== 'deleted' ? 'View Route' : undefined,
        icon,
        read: false,
        createdAt: new Date().toISOString(),
      };

      socketServer.getIO().to(`route:${routeId}`).emit('notification', notification);
      socketServer.emitRouteUpdated({ id: routeId, ...routeData });
      
      logInfo(`Route ${routeData.updateType} notification sent for route ${routeId}`);
    } catch (error) {
      logError('Error sending route notification', error);
    }
  }

  // ==================== REMINDER NOTIFICATIONS ====================
  
  /**
   * Send travel reminder notification
   */
  static sendTravelReminder(
    userId: number,
    bookingData: {
      bookingCode: string;
      route: string;
      departureTime: string;
      seatNumber: number;
      travelDate: string;
      hoursUntilDeparture: number;
    }
  ): void {
    let title = '⏰ Travel Reminder';
    let type = NotificationType.REMINDER_DEPARTURE;
    let priority = NotificationPriority.MEDIUM;
    
    if (bookingData.hoursUntilDeparture <= 1) {
      title = '🚨 Departing in 1 Hour!';
      type = NotificationType.REMINDER_1H;
      priority = NotificationPriority.URGENT;
    } else if (bookingData.hoursUntilDeparture <= 24) {
      title = '📅 Departing Tomorrow';
      type = NotificationType.REMINDER_24H;
      priority = NotificationPriority.HIGH;
    }

    const notification: Notification = {
      id: this.generateNotificationId(),
      type,
      priority,
      title,
      message: `Your bus to ${bookingData.route} departs in ${bookingData.hoursUntilDeparture} hour${bookingData.hoursUntilDeparture > 1 ? 's' : ''}. Don't forget your ID and booking code!`,
      data: bookingData,
      actionUrl: `/bookings/${bookingData.bookingCode}`,
      actionText: 'View Details',
      icon: bookingData.hoursUntilDeparture <= 1 ? '🚨' : '⏰',
      read: false,
      createdAt: new Date().toISOString(),
    };

    this.sendToUser(userId, notification);
    logInfo(`Travel reminder sent to user ${userId} - ${bookingData.hoursUntilDeparture}h until departure`);
  }

  // ==================== SYSTEM NOTIFICATIONS ====================
  
  /**
   * Broadcast system announcement
   */
  static broadcastSystemAnnouncement(
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    data?: any
  ): void {
    try {
      const socketServer = SocketServer.getInstance();
      
      const notification: Notification = {
        id: this.generateNotificationId(),
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        priority,
        title,
        message,
        data,
        icon: '📢',
        read: false,
        createdAt: new Date().toISOString(),
      };

      socketServer.broadcastSystemNotification(notification);
      logInfo('System announcement broadcasted to all users');
    } catch (error) {
      logError('Error broadcasting system announcement', error);
    }
  }

  /**
   * Send maintenance notification
   */
  static sendMaintenanceNotification(
    maintenanceWindow: {
      startTime: string;
      endTime: string;
      reason?: string;
    }
  ): void {
    const notification: Notification = {
      id: this.generateNotificationId(),
      type: NotificationType.SYSTEM_MAINTENANCE,
      priority: NotificationPriority.HIGH,
      title: '🔧 Scheduled Maintenance',
      message: `System maintenance scheduled from ${maintenanceWindow.startTime} to ${maintenanceWindow.endTime}. ${maintenanceWindow.reason || 'Service may be temporarily unavailable.'}`,
      data: maintenanceWindow,
      icon: '⚠️',
      read: false,
      createdAt: new Date().toISOString(),
    };

    this.broadcastToAll(notification);
    logInfo('Maintenance notification sent to all users');
  }

  // ==================== HELPER METHODS ====================
  
  /**
   * Send notification to specific user
   */
  private static sendToUser(userId: number, notification: Notification): void {
    try {
      const socketServer = SocketServer.getInstance();
      socketServer.sendNotificationToUser(userId, notification);
    } catch (error) {
      logError(`Error sending notification to user ${userId}`, error);
    }
  }

  /**
   * Broadcast notification to all connected users
   */
  private static broadcastToAll(notification: Notification): void {
    try {
      const socketServer = SocketServer.getInstance();
      socketServer.broadcastSystemNotification(notification);
    } catch (error) {
      logError('Error broadcasting notification', error);
    }
  }

  /**
   * Generate unique notification ID
   */
  private static generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats(): Promise<{
    connectedClients: number;
    timestamp: string;
  }> {
    try {
      const socketServer = SocketServer.getInstance();
      return {
        connectedClients: socketServer.getConnectedClientsCount(),
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