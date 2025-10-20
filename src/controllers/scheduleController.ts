import { Request, Response } from 'express';
import { BusSchedule, Bus, Route, BusCompany, Booking } from '../models';

export class ScheduleController {
  static async getAllSchedules(_req: Request, res: Response): Promise<void> {
    try {
      const schedules = await BusSchedule.findAll({
        where: { is_active: true },
        include: [
          {
            model: Bus,
            as: 'bus',
            attributes: ['plate_number', 'bus_type', 'total_seats'],
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
        order: [
          [{ model: Route, as: 'route' }, 'departure_city', 'ASC'],
          ['departure_time', 'ASC'],
        ],
      });
      res.json({ schedules });
    } catch (error: any) {
      console.error('Get schedules error:', error);
      res.status(500).json({ error: 'Failed to fetch schedules' });
    }
  }

  static async getScheduleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const schedule = await BusSchedule.findByPk(id, {
        include: [
          {
            model: Bus,
            as: 'bus',
            attributes: ['plate_number', 'bus_type', 'total_seats'],
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
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      res.json({ schedule });
    } catch (error: any) {
      console.error('Get schedule error:', error);
      res.status(500).json({ error: 'Failed to fetch schedule' });
    }
  }

  static async getSchedulesByRoute(req: Request, res: Response) {
    try {
      const { routeId } = req.params;
      const schedules = await BusSchedule.findAll({
        where: { route_id: routeId, is_active: true },
        include: [
          {
            model: Bus,
            as: 'bus',
            attributes: ['plate_number', 'bus_type', 'total_seats'],
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
        order: [['departure_time', 'ASC']],
      });
      res.json({ schedules });
    } catch (error: any) {
      console.error('Get schedules by route error:', error);
      res.status(500).json({ error: 'Failed to fetch schedules' });
    }
  }

  static async getAvailableSeats(req: Request, res: Response): Promise<void> {
    try {
      const { scheduleId } = req.params;
      const { travel_date } = req.query;

      if (!travel_date) {
        res.status(400).json({ error: 'Travel date is required' });
        return;
      }

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
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      const bookedSeats = await Booking.findAll({
        where: {
          schedule_id: scheduleId,
          travel_date: travel_date as string,
          status: 'confirmed',
        },
        attributes: ['seat_number'],
      });

      const booked = bookedSeats.map((b) => b.seat_number);
      const totalSeats = (schedule as any).bus.total_seats;
      const allSeats = Array.from({ length: totalSeats }, (_, i) => i + 1);
      const availableSeats = allSeats.filter((seat) => !booked.includes(seat));

      res.json({
        schedule_id: scheduleId,
        travel_date,
        available_seats: availableSeats,
        total_available: availableSeats.length,
      });
    } catch (error: any) {
      console.error('Get available seats error:', error);
      res.status(500).json({ error: 'Failed to fetch available seats' });
    }
  }

  static async createSchedule(req: Request, res: Response) {
    try {
      const {
        bus_id,
        route_id,
        departure_time,
        arrival_time,
        price,
        available_days,
        is_active,
      } = req.body;

      const schedule = await BusSchedule.create({
        bus_id,
        route_id,
        departure_time,
        arrival_time,
        price,
        available_days,
        is_active,
      });

      res.status(201).json({
        message: 'Schedule created successfully',
        schedule,
      });
    } catch (error: any) {
      console.error('Create schedule error:', error);
      res.status(500).json({ error: 'Failed to create schedule' });
    }
  }

  static async updateSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { departure_time, arrival_time, price, is_active } = req.body;

      const schedule = await BusSchedule.findByPk(id);
      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      await schedule.update({
        departure_time,
        arrival_time,
        price,
        is_active,
      });

      res.json({
        message: 'Schedule updated successfully',
        schedule,
      });
    } catch (error: any) {
      console.error('Update schedule error:', error);
      res.status(500).json({ error: 'Failed to update schedule' });
    }
  }

  static async deleteSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const schedule = await BusSchedule.findByPk(id);

      if (!schedule) {
        res.status(404).json({ error: 'Schedule not found' });
        return;
      }

      await schedule.destroy();
      res.json({ message: 'Schedule deleted successfully' });
    } catch (error: any) {
      console.error('Delete schedule error:', error);
      res.status(500).json({ error: 'Failed to delete schedule' });
    }
  }
}