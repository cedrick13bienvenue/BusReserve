import { Request, Response } from 'express';
import { Booking, BusSchedule, User, Bus, BusCompany, Route } from '../models';

export class BookingController {
  static async createBooking(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { schedule_id, travel_date, seat_number } = req.body;

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
        res.status(404).json({ error: 'Schedule not found' });
        return;
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
        res.status(400).json({ error: 'Seat is not available' });
        return;
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
      const bookingDetails = await Booking.findByPk(booking.id, {
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

      res.status(201).json({
        message: 'Booking created successfully',
        booking: bookingDetails,
      });
    } catch (error: any) {
      console.error('Create booking error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        res.status(400).json({ error: 'This seat is already booked' });
        return;
      }
      res.status(500).json({ error: 'Failed to create booking' });
    }
  }

  static async getMyBookings(_req: Request, res: Response): Promise<void> {
    try {
      const userId = (_req as any).user.id;
      const bookings = await Booking.findAll({
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

      res.json({ bookings });
    } catch (error: any) {
      console.error('Get bookings error:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  }

  static async getBookingByCode(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.params;
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
        res.status(404).json({ error: 'Booking not found' });
        return;
      }

      res.json({ booking });
    } catch (error: any) {
      console.error('Get booking error:', error);
      res.status(500).json({ error: 'Failed to fetch booking' });
    }
  }

  static async getAllBookings(_req: Request, res: Response): Promise<void> {
    try {
      const bookings = await Booking.findAll({
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
      res.json({ bookings });
    } catch (error: any) {
      console.error('Get all bookings error:', error);
      res.status(500).json({ error: 'Failed to fetch bookings' });
    }
  }

  static async cancelBooking(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { code } = req.params;

      const booking = await Booking.findOne({
        where: {
          booking_code: code,
          user_id: userId,
          status: 'confirmed',
        },
      });

      if (!booking) {
        res.status(404).json({ error: 'Booking not found or already cancelled' });
        return;
      }

      await booking.update({ status: 'cancelled' });
      res.json({ message: 'Booking cancelled successfully' });
    } catch (error: any) {
      console.error('Cancel booking error:', error);
      res.status(500).json({ error: 'Failed to cancel booking' });
    }
  }

  static async updateBookingStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['confirmed', 'cancelled', 'completed'].includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      const booking = await Booking.findByPk(id);
      if (!booking) {
        res.status(404).json({ error: 'Booking not found' });
        return;
      }

      await booking.update({ status });

      res.json({
        message: 'Booking status updated successfully',
        booking,
      });
    } catch (error: any) {
      console.error('Update booking status error:', error);
      res.status(500).json({ error: 'Failed to update booking status' });
    }
  }
}