import { Booking, BusSchedule, User, Bus, BusCompany, Route } from '../models';

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
      throw new Error('Seat is not available');
    }

    // Create booking
    const booking = await Booking.create({
      user_id: userId,
      schedule_id,
      travel_date,
      seat_number,
      status: 'confirmed',
    });

    // Get full booking details
    return await this.getBookingById(booking.id);
  }

  static async getUserBookings(userId: number) {
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
      throw new Error('Booking not found');
    }

    return booking;
  }

  static async getAllBookings() {
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
    const booking = await Booking.findOne({
      where: {
        booking_code: code,
        user_id: userId,
        status: 'confirmed',
      },
    });

    if (!booking) {
      throw new Error('Booking not found or already cancelled');
    }

    await booking.update({ status: 'cancelled' });
    return booking;
  }

  static async updateBookingStatus(
    id: number,
    status: 'confirmed' | 'cancelled' | 'completed'
  ) {
    const booking = await Booking.findByPk(id);
    if (!booking) {
      throw new Error('Booking not found');
    }

    await booking.update({ status });
    return booking;
  }

  private static async getBookingById(id: number) {
    return await Booking.findByPk(id, {
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
  }
}