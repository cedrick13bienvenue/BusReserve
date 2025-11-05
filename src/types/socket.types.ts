/**
 * Socket.IO event types and interfaces
 */

// Client to Server Events
export interface ClientToServerEvents {
  'join:schedule': (scheduleId: number) => void;
  'leave:schedule': (scheduleId: number) => void;
  'join:route': (routeId: number) => void;
  'leave:route': (routeId: number) => void;
  'request:seats': (data: { scheduleId: number; travelDate: string }) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  // Booking events
  'booking:created': (data: BookingCreatedEvent) => void;
  'booking:cancelled': (data: BookingCancelledEvent) => void;
  'booking:status:updated': (data: BookingStatusEvent) => void;

  // Seat events
  'seats:updated': (data: SeatUpdateEvent) => void;
  'seats:availability': (data: SeatAvailabilityEvent) => void;
  'seats:low': (data: LowSeatEvent) => void;
  'seats:requested': (data: SeatRequestEvent) => void;
  'seats:update': (data: SeatAvailabilityUpdateEvent) => void;

  // Schedule events
  'schedule:updated': (data: ScheduleUpdateEvent) => void;

  // Route events
  'route:updated': (data: RouteUpdateEvent) => void;
  'route:schedule:updated': (data: RouteScheduleUpdateEvent) => void;

  // Notification events
  notification: (data: NotificationEvent) => void;
  'system:notification': (data: SystemNotificationEvent) => void;

  // Error event
  error: (data: ErrorEvent) => void;
}

// Event Data Interfaces

export interface BookingCreatedEvent {
  booking: any;
  message: string;
}

export interface BookingCancelledEvent {
  bookingCode: string;
  message: string;
}

export interface BookingStatusEvent {
  type: string;
  title: string;
  message: string;
  data: {
    bookingCode: string;
    status: string;
  };
}

export interface SeatUpdateEvent {
  scheduleId: number;
  travelDate: string;
  message: string;
}

export interface SeatAvailabilityEvent {
  scheduleId: number;
  travelDate: string;
  availableSeats: number[];
  totalAvailable: number;
  timestamp: string;
}

export interface LowSeatEvent {
  scheduleId: number;
  travelDate: string;
  remainingSeats: number;
  message: string;
  timestamp: string;
}

export interface SeatRequestEvent {
  scheduleId: number;
  travelDate: string;
}

export interface SeatAvailabilityUpdateEvent {
  scheduleId: number;
  travelDate: string;
  availableSeats: number;
  timestamp: string;
}

export interface ScheduleUpdateEvent {
  schedule: any;
  message: string;
}

export interface RouteUpdateEvent {
  route: any;
  message: string;
}

export interface RouteScheduleUpdateEvent {
  schedule: any;
}

export interface NotificationEvent {
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'medium' | 'high';
  actionUrl?: string;
  actionText?: string;
  timestamp: string;
  read?: boolean;
}

export interface SystemNotificationEvent {
  type: string;
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high';
  timestamp: string;
}

export interface ErrorEvent {
  message: string;
  code?: string;
  details?: any;
}

// Socket Authentication
export interface SocketAuthData {
  token?: string;
  userId?: number;
  userRole?: string;
}

// Room names
export const SocketRooms = {
  user: (userId: number) => `user:${userId}`,
  schedule: (scheduleId: number) => `schedule:${scheduleId}`,
  route: (routeId: number) => `route:${routeId}`,
  admin: () => 'admin',
} as const;