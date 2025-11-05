import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './app';
import { logInfo, logError, logSuccess } from '../utils/loggerUtils';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  userRole?: string;
}

export class SocketServer {
  private io: Server;
  private static instance: SocketServer;

  private constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    logSuccess('Socket.IO server initialized');
  }

  public static initialize(httpServer: HTTPServer): SocketServer {
    if (!SocketServer.instance) {
      SocketServer.instance = new SocketServer(httpServer);
    }
    return SocketServer.instance;
  }

  public static getInstance(): SocketServer {
    if (!SocketServer.instance) {
      throw new Error('SocketServer not initialized. Call initialize() first.');
    }
    return SocketServer.instance;
  }

  private setupMiddleware(): void {
    // Authentication middleware
    this.io.use((socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          logInfo('Socket connection attempted without token');
          return next();
        }

        const decoded = jwt.verify(token, config.jwt.secret) as any;
        socket.userId = decoded.id;
        socket.userRole = decoded.role;

        logInfo(`Socket authenticated for user ${decoded.id}`);
        next();
      } catch (error) {
        logError('Socket authentication failed', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logSuccess(`Client connected: ${socket.id}`, {
        userId: socket.userId,
        context: 'SOCKET',
      });

      // Join user-specific room
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
        logInfo(`User ${socket.userId} joined personal room`);
      }

      // Join schedule-specific room
      socket.on('join:schedule', (scheduleId: number) => {
        socket.join(`schedule:${scheduleId}`);
        logInfo(`Socket ${socket.id} joined schedule:${scheduleId}`);
      });

      // Leave schedule-specific room
      socket.on('leave:schedule', (scheduleId: number) => {
        socket.leave(`schedule:${scheduleId}`);
        logInfo(`Socket ${socket.id} left schedule:${scheduleId}`);
      });

      // Join route-specific room
      socket.on('join:route', (routeId: number) => {
        socket.join(`route:${routeId}`);
        logInfo(`Socket ${socket.id} joined route:${routeId}`);
      });

      // Leave route-specific room
      socket.on('leave:route', (routeId: number) => {
        socket.leave(`route:${routeId}`);
        logInfo(`Socket ${socket.id} left route:${routeId}`);
      });

      // Request current seat availability
      socket.on('request:seats', async (data: { scheduleId: number; travelDate: string }) => {
        try {
          // This will be handled by emitting from the service layer
          socket.emit('seats:requested', { scheduleId: data.scheduleId, travelDate: data.travelDate });
        } catch (error) {
          logError('Error handling seats request', error);
          socket.emit('error', { message: 'Failed to fetch seat availability' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logInfo(`Client disconnected: ${socket.id} - Reason: ${reason}`, {
          userId: socket.userId,
          context: 'SOCKET',
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        logError(`Socket error for ${socket.id}`, error, {
          userId: socket.userId,
          context: 'SOCKET',
        });
      });
    });
  }

  // Emit booking created event
  public emitBookingCreated(booking: any): void {
    try {
      const { schedule_id, user_id, travel_date } = booking;

      // Notify the user who made the booking
      this.io.to(`user:${user_id}`).emit('booking:created', {
        booking,
        message: 'Your booking has been confirmed!',
      });

      // Notify all clients watching this schedule
      this.io.to(`schedule:${schedule_id}`).emit('seats:updated', {
        scheduleId: schedule_id,
        travelDate: travel_date,
        message: 'Seat availability updated',
      });

      logInfo(`Booking created event emitted for schedule ${schedule_id}`);
    } catch (error) {
      logError('Error emitting booking created event', error);
    }
  }

  // Emit booking cancelled event
  public emitBookingCancelled(booking: any): void {
    try {
      const { schedule_id, user_id, travel_date, booking_code } = booking;

      // Notify the user
      this.io.to(`user:${user_id}`).emit('booking:cancelled', {
        bookingCode: booking_code,
        message: 'Your booking has been cancelled',
      });

      // Notify all clients watching this schedule (seat is now available)
      this.io.to(`schedule:${schedule_id}`).emit('seats:updated', {
        scheduleId: schedule_id,
        travelDate: travel_date,
        message: 'Seat availability updated',
      });

      logInfo(`Booking cancelled event emitted for schedule ${schedule_id}`);
    } catch (error) {
      logError('Error emitting booking cancelled event', error);
    }
  }

  // Emit seat availability update
  public emitSeatAvailability(scheduleId: number, travelDate: string, availableSeats: number[]): void {
    try {
      this.io.to(`schedule:${scheduleId}`).emit('seats:availability', {
        scheduleId,
        travelDate,
        availableSeats,
        totalAvailable: availableSeats.length,
        timestamp: new Date().toISOString(),
      });

      logInfo(`Seat availability emitted for schedule ${scheduleId}`);
    } catch (error) {
      logError('Error emitting seat availability', error);
    }
  }

  // Emit low seat warning
  public emitLowSeatWarning(scheduleId: number, travelDate: string, remainingSeats: number): void {
    try {
      this.io.to(`schedule:${scheduleId}`).emit('seats:low', {
        scheduleId,
        travelDate,
        remainingSeats,
        message: `Only ${remainingSeats} seats remaining!`,
        timestamp: new Date().toISOString(),
      });

      logInfo(`Low seat warning emitted for schedule ${scheduleId}`);
    } catch (error) {
      logError('Error emitting low seat warning', error);
    }
  }

  // Emit schedule update
  public emitScheduleUpdated(schedule: any): void {
    try {
      this.io.to(`schedule:${schedule.id}`).emit('schedule:updated', {
        schedule,
        message: 'Schedule has been updated',
      });

      // Also emit to route room
      this.io.to(`route:${schedule.route_id}`).emit('route:schedule:updated', {
        schedule,
      });

      logInfo(`Schedule updated event emitted for schedule ${schedule.id}`);
    } catch (error) {
      logError('Error emitting schedule update', error);
    }
  }

  // Emit route update
  public emitRouteUpdated(route: any): void {
    try {
      this.io.to(`route:${route.id}`).emit('route:updated', {
        route,
        message: 'Route information has been updated',
      });

      logInfo(`Route updated event emitted for route ${route.id}`);
    } catch (error) {
      logError('Error emitting route update', error);
    }
  }

  // Send notification to specific user
  public sendNotificationToUser(userId: number, notification: any): void {
    try {
      this.io.to(`user:${userId}`).emit('notification', {
        ...notification,
        timestamp: new Date().toISOString(),
      });

      logInfo(`Notification sent to user ${userId}`);
    } catch (error) {
      logError('Error sending user notification', error);
    }
  }

  // Broadcast system notification
  public broadcastSystemNotification(notification: any): void {
    try {
      this.io.emit('system:notification', {
        ...notification,
        timestamp: new Date().toISOString(),
      });

      logInfo('System notification broadcasted');
    } catch (error) {
      logError('Error broadcasting system notification', error);
    }
  }

  // Get socket.io instance
  public getIO(): Server {
    return this.io;
  }

  // Get connected clients count
  public getConnectedClientsCount(): number {
    return this.io.engine.clientsCount;
  }

  // Get clients in a specific room
  public async getClientsInRoom(room: string): Promise<string[]> {
    const sockets = await this.io.in(room).fetchSockets();
    return sockets.map(socket => socket.id);
  }
}

export default SocketServer;