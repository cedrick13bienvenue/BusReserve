import { Booking, BusSchedule, User, Bus, BusCompany, Route } from '../models';
import { EmailService, BookingEmailData, BookingCancellationEmailData } from './emailService';
import { NotificationService } from './notificationService';
import { logInfo, logError, logSuccess } from '../utils/loggerUtils';
import sequelize from '../config/database';

export class BookingService {
  /**
   * Create a new booking with real-time notifications
   */
  static async createBooking(
    userId: number,
    bookingData: {
      schedule_id: number;
      travel_date: Date;
      seat_number: number;
    }
  ) {
    const { schedule_id, travel_date, seat_number } = bookingData;

    logInfo(`Creating booking for user ${userId}, schedule ${schedule_id}, seat ${seat_number}`);

    // Validate schedule exists and get all details
    const schedule = await BusSchedule.findByPk(schedule_id, {
      include: [
        {
          model: Bus,
          as: 'bus',
          attributes: ['total_seats', 'plate_number', 'bus_type'],
          include: [
            {
              model: BusCompany,
              as: 'company',
              attributes: ['name'],
            },
          ],
        },
        {
          model: Route,
          as: 'route',
          attributes: ['departure_city', 'arrival_city', 'distance_km', 'estimated_duration_minutes'],
        },
      ],
    });

    if (!schedule) {
      logError(`Schedule ${schedule_id} not found`);
      throw new Error('Schedule not found');
    }

    const scheduleData: any = schedule;

    // Check if seat is available
    const existingBooking = await Booking.findOne({
      where: {
        schedule_id,
        travel_date,
        seat_number,
        status: 'confirmed',
      },
    });

    if (existingBooking) {
      logError(`Seat ${seat_number} already booked for schedule ${schedule_id} on ${travel_date}`);
      throw new Error('Seat is not available');
    }

    // Get user details
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate booking code
    const tempBookingCode = `T${Date.now()}`;
    const booking = await Booking.create({
      user_id: userId,
      schedule_id,
      travel_date,
      seat_number,
      status: 'confirmed',
      booking_type: 'one-way',
      booking_code: tempBookingCode,
    });

    // Generate final booking code
    const finalBookingCode = this.generateEnhancedBookingCode(booking.id);
    await booking.update({ booking_code: finalBookingCode });

    logSuccess(`Booking created: ${finalBookingCode} for user ${userId}`);

    // Get full booking details
    const fullBooking = await this.getBookingById(booking.id);

    // ==================== SEND REAL-TIME NOTIFICATION ====================
    
    const route = `${scheduleData.route.departure_city} → ${scheduleData.route.arrival_city}`;
    
    // Send booking confirmation notification to user
    NotificationService.sendBookingConfirmation(userId, {
      bookingCode: finalBookingCode,
      route,
      departureTime: scheduleData.departure_time,
      seatNumber: seat_number,
      price: parseFloat(scheduleData.price),
    });

    // Get updated seat availability
    const availableSeatsData = await this.getAvailableSeatsForSchedule(
      schedule_id,
      travel_date.toString()
    );

    // Send seat availability update to all watchers
    NotificationService.sendSeatAvailabilityUpdate(
      schedule_id,
      travel_date.toString(),
      availableSeatsData.total_available,
      scheduleData.bus.total_seats
    );

    // Send low seat warning if applicable (less than 10 seats)
    if (availableSeatsData.total_available <= 10) {
      NotificationService.sendLowSeatWarning(
        schedule_id,
        travel_date.toString(),
        availableSeatsData.total_available,
        route
      );
    }

    // ==================== SEND EMAIL NOTIFICATION ====================
    
    try {
      const emailData: BookingEmailData = {
        passengerName: user.full_name,
        passengerEmail: user.email,
        bookingCode: finalBookingCode,
        travelDate: travel_date.toString(),
        departureCity: scheduleData.route.departure_city,
        arrivalCity: scheduleData.route.arrival_city,
        departureTime: scheduleData.departure_time,
        arrivalTime: scheduleData.arrival_time,
        busCompany: scheduleData.bus.company.name,
        plateNumber: scheduleData.bus.plate_number,
        seatNumber: seat_number,
        price: parseFloat(scheduleData.price),
        distance: scheduleData.route.distance_km,
        duration: scheduleData.route.estimated_duration_minutes,
      };

      await EmailService.sendBookingConfirmation(emailData);
      logSuccess(`Booking confirmation email sent to ${user.email}`);
    } catch (error) {
      logError('Failed to send booking confirmation email', error);
    }

    return fullBooking;
  }

  /**
   * Create round-trip booking
   */
  static async createRoundTripBooking(
    userId: number,
    bookingData: {
      outbound: {
        schedule_id: number;
        travel_date: Date;
        seat_number: number;
      };
      return: {
        schedule_id: number;
        travel_date: Date;
        seat_number: number;
      };
    }
  ) {
    const transaction = await sequelize.transaction();

    try {
      logInfo(`Creating round-trip booking for user ${userId}`);

      // Validate return date is after outbound date
      const outboundDate = new Date(bookingData.outbound.travel_date);
      const returnDate = new Date(bookingData.return.travel_date);

      if (returnDate <= outboundDate) {
        throw new Error('Return date must be after departure date');
      }

      // Check if outbound seat is available
      const outboundExisting = await Booking.findOne({
        where: {
          schedule_id: bookingData.outbound.schedule_id,
          travel_date: bookingData.outbound.travel_date,
          seat_number: bookingData.outbound.seat_number,
          status: 'confirmed',
        },
        transaction,
      });

      if (outboundExisting) {
        throw new Error('Outbound seat is not available');
      }

      // Check if return seat is available
      const returnExisting = await Booking.findOne({
        where: {
          schedule_id: bookingData.return.schedule_id,
          travel_date: bookingData.return.travel_date,
          seat_number: bookingData.return.seat_number,
          status: 'confirmed',
        },
        transaction,
      });

      if (returnExisting) {
        throw new Error('Return seat is not available');
      }

      // Create outbound booking (parent)
      const tempCode = `T${Date.now()}`;
      const outboundBooking = await Booking.create(
        {
          user_id: userId,
          schedule_id: bookingData.outbound.schedule_id,
          travel_date: bookingData.outbound.travel_date,
          seat_number: bookingData.outbound.seat_number,
          status: 'confirmed',
          booking_type: 'round-trip',
          booking_code: tempCode,
          return_travel_date: bookingData.return.travel_date,
        },
        { transaction }
      );

      // Generate final booking code
      const finalCode = this.generateEnhancedBookingCode(outboundBooking.id);
      await outboundBooking.update({ booking_code: finalCode }, { transaction });

      // Create return booking (child)
      const returnBooking = await Booking.create(
        {
          user_id: userId,
          schedule_id: bookingData.return.schedule_id,
          travel_date: bookingData.return.travel_date,
          seat_number: bookingData.return.seat_number,
          status: 'confirmed',
          booking_type: 'round-trip',
          booking_code: `${finalCode}-RTN`,
          parent_booking_id: outboundBooking.id,
        },
        { transaction }
      );

      await transaction.commit();

      logSuccess(`Round-trip booking created: ${finalCode} for user ${userId}`);

      // Get full booking details
      const fullOutbound = await this.getBookingById(outboundBooking.id);
      const fullReturn = await this.getBookingById(returnBooking.id);

      // Calculate total price
      const totalPrice =
        parseFloat((fullOutbound as any).schedule.price) +
        parseFloat((fullReturn as any).schedule.price);

      // Send notifications
      const outboundRoute = `${(fullOutbound as any).schedule.route.departure_city} → ${
        (fullOutbound as any).schedule.route.arrival_city
      }`;

      NotificationService.sendBookingConfirmation(userId, {
        bookingCode: finalCode,
        route: `${outboundRoute} (Round-trip)`,
        departureTime: (fullOutbound as any).schedule.departure_time,
        seatNumber: bookingData.outbound.seat_number,
        price: totalPrice,
      });

      // Update seat availability for both journeys
      await this.notifySeatUpdates(
        bookingData.outbound.schedule_id,
        bookingData.outbound.travel_date.toString()
      );
      await this.notifySeatUpdates(
        bookingData.return.schedule_id,
        bookingData.return.travel_date.toString()
      );
      return {
        booking_code: finalCode,
        booking_type: 'round-trip' as const,
        outbound: fullOutbound,
        return: fullReturn,
        total_price: totalPrice,
      };
    } catch (error) {
      await transaction.rollback();
      logError('Round-trip booking creation failed', error);
      throw error;
    }
  }

  /**
   * Create multi-city booking
   */
  static async createMultiCityBooking(
    userId: number,
    bookingData: {
      legs: Array<{
        schedule_id: number;
        travel_date: Date;
        seat_number: number;
        sequence: number;
      }>;
    }
  ) {
    const transaction = await sequelize.transaction();

    try {
      logInfo(`Creating multi-city booking for user ${userId} with ${bookingData.legs.length} legs`);

      // Validate legs are in chronological order
      const sortedLegs = [...bookingData.legs].sort((a, b) => a.sequence - b.sequence);
      for (let i = 1; i < sortedLegs.length; i++) {
        const prevDate = new Date(sortedLegs[i - 1].travel_date);
        const currentDate = new Date(sortedLegs[i].travel_date);
        if (currentDate < prevDate) {
          throw new Error('Travel dates must be in chronological order');
        }
      }

      // Check if all seats are available
      for (const leg of sortedLegs) {
        const existingBooking = await Booking.findOne({
          where: {
            schedule_id: leg.schedule_id,
            travel_date: leg.travel_date,
            seat_number: leg.seat_number,
            status: 'confirmed',
          },
          transaction,
        });

        if (existingBooking) {
          throw new Error(`Seat ${leg.seat_number} is not available for leg ${leg.sequence}`);
        }
      }

      // Create parent booking (first leg)
      const firstLeg = sortedLegs[0];
      const tempCode = `T${Date.now()}`;
      const parentBooking = await Booking.create(
        {
          user_id: userId,
          schedule_id: firstLeg.schedule_id,
          travel_date: firstLeg.travel_date,
          seat_number: firstLeg.seat_number,
          status: 'confirmed',
          booking_type: 'multi-city',
          booking_code: tempCode,
          leg_sequence: 1,
        },
        { transaction }
      );

      // Generate final booking code
      const finalCode = this.generateEnhancedBookingCode(parentBooking.id);
      await parentBooking.update({ booking_code: finalCode }, { transaction });

      // Create child bookings for remaining legs
      const childBookings = [];
      for (let i = 1; i < sortedLegs.length; i++) {
        const leg = sortedLegs[i];
        const childBooking = await Booking.create(
          {
            user_id: userId,
            schedule_id: leg.schedule_id,
            travel_date: leg.travel_date,
            seat_number: leg.seat_number,
            status: 'confirmed',
            booking_type: 'multi-city',
            booking_code: `${finalCode}-L${i + 1}`,
            parent_booking_id: parentBooking.id,
            leg_sequence: i + 1,
          },
          { transaction }
        );
        childBookings.push(childBooking);
      }

      await transaction.commit();

      logSuccess(`Multi-city booking created: ${finalCode} for user ${userId}`);

      // Get full booking details
      const allBookings = [
        await this.getBookingById(parentBooking.id),
        ...(await Promise.all(childBookings.map((b) => this.getBookingById(b.id)))),
      ];

      // Calculate total price
      const totalPrice = allBookings.reduce(
        (sum, booking) => sum + parseFloat((booking as any).schedule.price),
        0
      );

      // Send notification
      const routesSummary = allBookings
        .map((b: any) => `${b.schedule.route.departure_city} → ${b.schedule.route.arrival_city}`)
        .join(' → ');

      NotificationService.sendBookingConfirmation(userId, {
        bookingCode: finalCode,
        route: `${routesSummary} (Multi-city)`,
        departureTime: (allBookings[0] as any).schedule.departure_time,
        seatNumber: firstLeg.seat_number,
        price: totalPrice,
      });

      // Update seat availability for all legs
      for (const leg of sortedLegs) {
        await this.notifySeatUpdates(leg.schedule_id, leg.travel_date.toString());
      }

      return {
        booking_code: finalCode,
        booking_type: 'multi-city' as const,
        legs: allBookings,
        total_price: totalPrice,
      };
    } catch (error) {
      await transaction.rollback();
      logError('Multi-city booking creation failed', error);
      throw error;
    }
  }

  /**
   * Cancel booking with real-time notifications
   */
  static async cancelBooking(userId: number, code: string) {
    logInfo(`Cancelling booking ${code} for user ${userId}`);
    
    const booking = await Booking.findOne({
      where: {
        booking_code: code,
        user_id: userId,
        status: 'confirmed',
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['full_name', 'email'],
        },
        {
          model: BusSchedule,
          as: 'schedule',
          include: [
            {
              model: Bus,
              as: 'bus',
              attributes: ['total_seats'],
            },
            {
              model: Route,
              as: 'route',
              attributes: ['departure_city', 'arrival_city'],
            },
          ],
        },
      ],
    });

    if (!booking) {
      logError(`Booking not found or already cancelled: ${code}`);
      throw new Error('Booking not found or already cancelled');
    }

    await booking.update({ status: 'cancelled' });
    logSuccess(`Booking cancelled: ${code}`);

    const bookingData: any = booking;

    // ==================== SEND REAL-TIME NOTIFICATION ====================
    
    // Send cancellation notification to user
    NotificationService.sendBookingCancellation(
      userId,
      code,
      'Refund will be processed within 5-7 business days'
    );

    // Get updated seat availability
    const availableSeatsData = await this.getAvailableSeatsForSchedule(
      booking.schedule_id,
      booking.travel_date.toString()
    );

    // Send seat availability update (seat is now available!)
    NotificationService.sendSeatAvailabilityUpdate(
      booking.schedule_id,
      booking.travel_date.toString(),
      availableSeatsData.total_available,
      bookingData.schedule.bus.total_seats
    );

    // ==================== SEND EMAIL NOTIFICATION ====================
    
    try {
      const emailData: BookingCancellationEmailData = {
        passengerName: bookingData.user.full_name,
        passengerEmail: bookingData.user.email,
        bookingCode: code,
        travelDate: booking.travel_date.toString(),
        departureCity: bookingData.schedule.route.departure_city,
        arrivalCity: bookingData.schedule.route.arrival_city,
      };

      await EmailService.sendBookingCancellation(emailData);
      logSuccess(`Cancellation email sent to ${bookingData.user.email}`);
    } catch (error) {
      logError('Failed to send cancellation email', error);
    }

    return booking;
  }

  /**
   * Cancel complex booking (round-trip or multi-city)
   */
  static async cancelComplexBooking(userId: number, code: string) {
    const transaction = await sequelize.transaction();

    try {
      logInfo(`Cancelling complex booking ${code} for user ${userId}`);

      // Find parent booking
      const parentBooking = await Booking.findOne({
        where: {
          booking_code: code,
          user_id: userId,
          status: 'confirmed',
        },
        include: [
          {
            model: Booking,
            as: 'childBookings',
            where: { status: 'confirmed' },
            required: false,
          },
        ],
        transaction,
      });

      if (!parentBooking) {
        throw new Error('Booking not found or already cancelled');
      }

      // Cancel parent booking
      await parentBooking.update({ status: 'cancelled' }, { transaction });

      // Cancel all child bookings
      const childBookings = (parentBooking as any).childBookings || [];
      for (const child of childBookings) {
        await child.update({ status: 'cancelled' }, { transaction });
      }

      await transaction.commit();

      logSuccess(`Complex booking cancelled: ${code}`);

      // Send notifications
      NotificationService.sendBookingCancellation(
        userId,
        code,
        'All legs of your booking have been cancelled. Refund will be processed within 5-7 business days.'
      );

      // Update seat availability for all legs
      await this.notifySeatUpdates(
        parentBooking.schedule_id,
        parentBooking.travel_date.toString()
      );
      for (const child of childBookings) {
        await this.notifySeatUpdates(child.schedule_id, child.travel_date.toString());
      }

      return {
        message: 'Booking cancelled successfully',
        cancelled_bookings: [parentBooking, ...childBookings],
      };
    } catch (error) {
      await transaction.rollback();
      logError('Complex booking cancellation failed', error);
      throw error;
    }
  }

  /**
   * Update booking status with real-time notifications
   */
  static async updateBookingStatus(
    id: number,
    status: 'confirmed' | 'cancelled' | 'completed'
  ) {
    logInfo(`Updating booking ${id} status to ${status}`);
    
    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: BusSchedule,
          as: 'schedule',
          include: [
            {
              model: Route,
              as: 'route',
              attributes: ['departure_city', 'arrival_city'],
            },
          ],
        },
      ],
    });

    if (!booking) {
      logError(`Booking not found: ${id}`);
      throw new Error('Booking not found');
    }

    const oldStatus = booking.status;
    await booking.update({ status });
    logSuccess(`Booking ${id} status updated from ${oldStatus} to ${status}`);

    // ==================== SEND REAL-TIME NOTIFICATION ====================
    
    const scheduleData: any = booking.schedule;
    const routeText = `${scheduleData.route.departure_city} → ${scheduleData.route.arrival_city}`;
    
    let notificationTitle = '📝 Booking Updated';
    let notificationMessage = `Your booking ${booking.booking_code} status has been updated to ${status}.`;
    
    if (status === 'completed') {
      notificationTitle = '✅ Journey Completed';
      notificationMessage = `Thank you for traveling with us on ${routeText}! We hope you had a pleasant journey.`;
    } else if (status === 'cancelled') {
      notificationTitle = '❌ Booking Cancelled';
      notificationMessage = `Your booking ${booking.booking_code} has been cancelled. Refund will be processed shortly.`;
    }

    // Send notification to the user
    const socketServer = require('../config/socket').default.getInstance();
    socketServer.sendNotificationToUser(booking.user_id, {
      id: `notif_${Date.now()}`,
      type: 'booking:status:updated',
      priority: status === 'completed' ? 'low' : 'medium',
      title: notificationTitle,
      message: notificationMessage,
      data: {
        bookingCode: booking.booking_code,
        status,
        oldStatus,
        route: routeText,
      },
      actionUrl: `/bookings/${booking.booking_code}`,
      actionText: 'View Booking',
      icon: status === 'completed' ? '✅' : status === 'cancelled' ? '❌' : '📝',
      read: false,
      createdAt: new Date().toISOString(),
    });

    logSuccess(`Status update notification sent to user ${booking.user_id}`);

    return booking;
  }

  /**
   * Get user bookings
   */
  static async getUserBookings(userId: number) {
    logInfo(`Fetching bookings for user ${userId}`);
    
    return await Booking.findAll({
      where: { user_id: userId },
      include: [
        {
          model: BusSchedule,
          as: 'schedule',
          include: [
            {
              model: Bus,
              as: 'bus',
              attributes: ['plate_number', 'bus_type'],
              include: [
                {
                  model: BusCompany,
                  as: 'company',
                  attributes: ['name'],
                },
              ],
            },
            {
              model: Route,
              as: 'route',
              attributes: ['departure_city', 'arrival_city'],
            },
          ],
        },
      ],
      order: [['travel_date', 'DESC'], ['created_at', 'DESC']],
    });
  }

  /**
   * Get booking by code
   */
  static async getBookingByCode(code: string) {
    logInfo(`Fetching booking by code: ${code}`);
    
    const booking = await Booking.findOne({
      where: { booking_code: code },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['full_name', 'email', 'phone_number'],
        },
        {
          model: BusSchedule,
          as: 'schedule',
          include: [
            {
              model: Bus,
              as: 'bus',
              attributes: ['plate_number', 'bus_type'],
              include: [
                {
                  model: BusCompany,
                  as: 'company',
                  attributes: ['name'],
                },
              ],
            },
            {
              model: Route,
              as: 'route',
              attributes: ['departure_city', 'arrival_city'],
            },
          ],
        },
      ],
    });

    if (!booking) {
      logError(`Booking not found: ${code}`);
      throw new Error('Booking not found');
    }

    return booking;
  }

  /**
   * Get complete booking with all legs
   */
  static async getCompleteBooking(code: string) {
    const booking = await Booking.findOne({
      where: { booking_code: code },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['full_name', 'email', 'phone_number'],
        },
        {
          model: BusSchedule,
          as: 'schedule',
          include: [
            {
              model: Bus,
              as: 'bus',
              attributes: ['plate_number', 'bus_type'],
              include: [
                {
                  model: BusCompany,
                  as: 'company',
                  attributes: ['name'],
                },
              ],
            },
            {
              model: Route,
              as: 'route',
              attributes: ['departure_city', 'arrival_city'],
            },
          ],
        },
        {
          model: Booking,
          as: 'childBookings',
          include: [
            {
              model: BusSchedule,
              as: 'schedule',
              include: [
                {
                  model: Bus,
                  as: 'bus',
                  attributes: ['plate_number', 'bus_type'],
                  include: [
                    {
                      model: BusCompany,
                      as: 'company',
                      attributes: ['name'],
                    },
                  ],
                },
                {
                  model: Route,
                  as: 'route',
                  attributes: ['departure_city', 'arrival_city'],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    return booking;
  }

  /**
   * Get all bookings (admin)
   */
  static async getAllBookings() {
    logInfo('Fetching all bookings');
    
    return await Booking.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['full_name', 'email', 'phone_number'],
        },
        {
          model: BusSchedule,
          as: 'schedule',
          include: [
            {
              model: Bus,
              as: 'bus',
              attributes: ['plate_number', 'bus_type'],
              include: [
                {
                  model: BusCompany,
                  as: 'company',
                  attributes: ['name'],
                },
              ],
            },
            {
              model: Route,
              as: 'route',
              attributes: ['departure_city', 'arrival_city'],
            },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });
  }

  // ==================== PRIVATE HELPER METHODS ====================
  
  private static generateEnhancedBookingCode(bookingId: number): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let random = '';
    for (let i = 0; i < 4; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const paddedId = bookingId.toString().padStart(6, '0');
    return `BK${year}${month}${day}${hour}${minute}${random}${paddedId}`;
  }

  private static async getBookingById(id: number) {
    const booking = await Booking.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['full_name', 'email', 'phone_number'],
        },
        {
          model: BusSchedule,
          as: 'schedule',
          include: [
            {
              model: Bus,
              as: 'bus',
              attributes: ['plate_number', 'bus_type'],
              include: [
                {
                  model: BusCompany,
                  as: 'company',
                  attributes: ['name'],
                },
              ],
            },
            {
              model: Route,
              as: 'route',
              attributes: ['departure_city', 'arrival_city'],
            },
          ],
        },
      ],
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    return booking;
  }

  private static async getAvailableSeatsForSchedule(
    scheduleId: number,
    travelDate: string
  ) {
    const schedule = await BusSchedule.findByPk(scheduleId, {
      include: [
        {
          model: Bus,
          as: 'bus',
          attributes: ['total_seats'],
        },
      ],
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const bookedSeats = await Booking.findAll({
      where: {
        schedule_id: scheduleId,
        travel_date: travelDate,
        status: 'confirmed',
      },
      attributes: ['seat_number'],
    });

    const booked = bookedSeats.map((b) => b.seat_number);
    const totalSeats = (schedule as any).bus.total_seats;
    const allSeats = Array.from({ length: totalSeats }, (_, i) => i + 1);
    const availableSeats = allSeats.filter((seat) => !booked.includes(seat));

    return {
      schedule_id: scheduleId,
      travel_date: travelDate,
      available_seats: availableSeats,
      total_available: availableSeats.length,
    };
  }

  private static async notifySeatUpdates(scheduleId: number, travelDate: string) {
    const availableSeatsData = await this.getAvailableSeatsForSchedule(scheduleId, travelDate);
    const schedule: any = await BusSchedule.findByPk(scheduleId, {
      include: [
        {
          model: Bus,
          as: 'bus',
          attributes: ['total_seats'],
        },
        {
          model: Route,
          as: 'route',
          attributes: ['departure_city', 'arrival_city'],
        },
      ],
    });

    if (schedule) {
      NotificationService.sendSeatAvailabilityUpdate(
        scheduleId,
        travelDate,
        availableSeatsData.total_available,
        schedule.bus.total_seats
      );

      if (availableSeatsData.total_available <= 10) {
        NotificationService.sendLowSeatWarning(
          scheduleId,
          travelDate,
          availableSeatsData.total_available,
          `${schedule.route.departure_city} → ${schedule.route.arrival_city}`
        );
      }
    }
  }
}
