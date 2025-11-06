import { Booking, BusSchedule, User, Bus, BusCompany, Route } from '../models';
import SocketServer from '../config/socket';
import { logInfo, logError, logSuccess } from '../utils/loggerUtils';

export class BookingService {
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

    // Validate schedule exists
    const schedule = await BusSchedule.findByPk(schedule_id, {
      include: [
        {
          model: Bus,
          as: 'bus',
          attributes: ['total_seats'],
        },
      ],
    });

    if (!schedule) {
      logError(`Schedule ${schedule_id} not found`);
      throw new Error('Schedule not found');
    }

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

    // Generate temporary booking code (short enough for DB)
    const tempBookingCode = `T${Date.now()}`;

    // Create booking with temporary code
    const booking = await Booking.create({
      user_id: userId,
      schedule_id,
      travel_date,
      seat_number,
      status: 'confirmed',
      booking_code: tempBookingCode,
    });

    // Generate final booking code using the booking ID
    const paddedId = booking.id.toString().padStart(6, '0');
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const finalBookingCode = `BK${timestamp}${paddedId}`;

    // Update with final booking code
    await booking.update({ booking_code: finalBookingCode });

    logSuccess(`Booking created: ${finalBookingCode} for user ${userId}`);

    // Get full booking details
    const fullBooking = await this.getBookingById(booking.id);

    // Emit real-time events
    try {
      const socketServer = SocketServer.getInstance();
      socketServer.emitBookingCreated({
        ...fullBooking.toJSON(),
        user_id: userId,
        schedule_id,
        travel_date,
      });

      // Get updated seat availability
      const availableSeats = await this.getAvailableSeatsForSchedule(
        schedule_id,
        travel_date.toString()
      );

      // Emit seat availability update
      socketServer.emitSeatAvailability(
        schedule_id,
        travel_date.toString(),
        availableSeats.available_seats
      );

      // Emit low seat warning if applicable
      const totalSeats = (schedule as any).bus.total_seats;
      const remainingSeats = availableSeats.total_available;
      const occupancyRate = ((totalSeats - remainingSeats) / totalSeats) * 100;

      if (occupancyRate >= 80) {
        socketServer.emitLowSeatWarning(
          schedule_id,
          travel_date.toString(),
          remainingSeats
        );
      }

      logSuccess(`Real-time events emitted for booking ${finalBookingCode}`);
    } catch (error) {
      logError('Error emitting real-time events', error);
      // Don't fail the booking if real-time notification fails
    }

    return fullBooking;
  }

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
              attributes: ['plate_number'],
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
              attributes: ['plate_number'],
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
              attributes: ['plate_number'],
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

  static async cancelBooking(userId: number, code: string) {
    logInfo(`Cancelling booking ${code} for user ${userId}`);
    
    const booking = await Booking.findOne({
      where: {
        booking_code: code,
        user_id: userId,
        status: 'confirmed',
      },
    });

    if (!booking) {
      logError(`Booking not found or already cancelled: ${code}`);
      throw new Error('Booking not found or already cancelled');
    }

    await booking.update({ status: 'cancelled' });

    logSuccess(`Booking cancelled: ${code}`);

    // Emit real-time events
    try {
      const socketServer = SocketServer.getInstance();
      socketServer.emitBookingCancelled({
        ...booking.toJSON(),
        user_id: userId,
      });

      // Get updated seat availability
      const availableSeats = await this.getAvailableSeatsForSchedule(
        booking.schedule_id,
        booking.travel_date.toString()
      );

      // Emit seat availability update
      socketServer.emitSeatAvailability(
        booking.schedule_id,
        booking.travel_date.toString(),
        availableSeats.available_seats
      );

      logSuccess(`Real-time events emitted for cancelled booking ${code}`);
    } catch (error) {
      logError('Error emitting real-time events', error);
    }

    return booking;
  }

  static async updateBookingStatus(
    id: number,
    status: 'confirmed' | 'cancelled' | 'completed'
  ) {
    logInfo(`Updating booking ${id} status to ${status}`);
    
    const booking = await Booking.findByPk(id);
    if (!booking) {
      logError(`Booking not found: ${id}`);
      throw new Error('Booking not found');
    }

    await booking.update({ status });

    logSuccess(`Booking ${id} status updated to ${status}`);

    // Emit real-time notification to the user
    try {
      const socketServer = SocketServer.getInstance();
      socketServer.sendNotificationToUser(booking.user_id, {
        type: 'booking:status:updated',
        title: 'Booking Status Updated',
        message: `Your booking ${booking.booking_code} status has been updated to ${status}`,
        data: {
          bookingCode: booking.booking_code,
          status,
        },
      });

      logSuccess(`Notification sent to user ${booking.user_id} for booking ${booking.booking_code}`);
    } catch (error) {
      logError('Error emitting real-time notification', error);
    }

    return booking;
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
              attributes: ['plate_number'],
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
}