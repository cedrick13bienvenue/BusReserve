import { BusSchedule, Bus, Route, BusCompany, Booking } from '../models';
import { NotificationService } from './notificationService';
import { logInfo, logSuccess } from '../utils/loggerUtils';

/**
 * Enhanced Schedule Service with Real-Time Notifications
 */
export class ScheduleService {
  /**
   * Get all schedules
   */
  static async getAllSchedules() {
    return await BusSchedule.findAll({
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
          attributes: [
            'departure_city',
            'arrival_city',
            'distance_km',
            'estimated_duration_minutes',
          ],
        },
      ],
      order: [
        [{ model: Route, as: 'route' }, 'departure_city', 'ASC'],
        ['departure_time', 'ASC'],
      ],
    });
  }

  /**
   * Get schedule by ID
   */
  static async getScheduleById(id: number) {
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
          attributes: [
            'departure_city',
            'arrival_city',
            'distance_km',
            'estimated_duration_minutes',
          ],
        },
      ],
    });

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    return schedule;
  }

  /**
   * Get schedules by route
   */
  static async getSchedulesByRoute(routeId: number) {
    return await BusSchedule.findAll({
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
          attributes: [
            'departure_city',
            'arrival_city',
            'distance_km',
            'estimated_duration_minutes',
          ],
        },
      ],
      order: [['departure_time', 'ASC']],
    });
  }

  /**
   * Get available seats
   */
  static async getAvailableSeats(scheduleId: number, travelDate: string) {
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

  /**
   * Create schedule with real-time notifications
   */
  static async createSchedule(scheduleData: {
    bus_id: number;
    route_id: number;
    departure_time: string;
    arrival_time: string;
    price: number;
    available_days?: string;
    is_active?: boolean;
  }) {
    logInfo('Creating new schedule');

    const schedule = await BusSchedule.create(scheduleData);
    
    // Get full schedule details for notification
    const fullSchedule: any = await this.getScheduleById(schedule.id);
    
    const route = `${fullSchedule.route.departure_city} → ${fullSchedule.route.arrival_city}`;
    
    logSuccess(`Schedule ${schedule.id} created for route ${route}`);

    // ==================== SEND REAL-TIME NOTIFICATION ====================
    
    // Send notification to all users watching this route
    NotificationService.sendScheduleCreated(scheduleData.route_id, {
      scheduleId: schedule.id,
      route,
      departureTime: scheduleData.departure_time,
      price: scheduleData.price,
      busType: fullSchedule.bus.bus_type,
    });

    return schedule;
  }

  /**
   * Update schedule with real-time notifications
   */
  static async updateSchedule(
    id: number,
    updateData: {
      departure_time?: string;
      arrival_time?: string;
      price?: number;
      is_active?: boolean;
    }
  ) {
    logInfo(`Updating schedule ${id}`);

    const schedule: any = await this.getScheduleById(id);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Store old values for comparison
    const oldDepartureTime = schedule.departure_time;
    const oldPrice = parseFloat(schedule.price);
    const route = `${schedule.route.departure_city} → ${schedule.route.arrival_city}`;

    // Update schedule
    await schedule.update(updateData);
    
    logSuccess(`Schedule ${id} updated`);

    // ==================== SEND REAL-TIME NOTIFICATIONS ====================
    
    // Departure time changed
    if (updateData.departure_time && updateData.departure_time !== oldDepartureTime) {
      NotificationService.sendScheduleUpdate(
        id,
        schedule.route_id,
        {
          route,
          updateType: 'time',
          oldValue: oldDepartureTime,
          newValue: updateData.departure_time,
        }
      );
      
      logInfo(`Departure time changed notification sent for schedule ${id}`);
    }

    // Price changed
    if (updateData.price && updateData.price !== oldPrice) {
      NotificationService.sendScheduleUpdate(
        id,
        schedule.route_id,
        {
          route,
          updateType: 'price',
          oldValue: oldPrice.toLocaleString(),
          newValue: updateData.price.toLocaleString(),
        }
      );
      
      logInfo(`Price change notification sent for schedule ${id}`);
    }

    // General update (if other fields changed)
    if (updateData.arrival_time || updateData.is_active !== undefined) {
      let message = `Schedule updated for ${route}`;
      
      if (updateData.is_active === false) {
        message = `⚠️ Schedule temporarily unavailable for ${route}`;
      } else if (updateData.is_active === true) {
        message = `✅ Schedule reactivated for ${route}`;
      }
      
      NotificationService.sendScheduleUpdate(
        id,
        schedule.route_id,
        {
          route,
          updateType: 'general',
          message,
        }
      );
    }

    return schedule;
  }

  /**
   * Delete schedule with notifications
   */
  static async deleteSchedule(id: number) {
    logInfo(`Deleting schedule ${id}`);

    const schedule: any = await this.getScheduleById(id);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    const route = `${schedule.route.departure_city} → ${schedule.route.arrival_city}`;
    const routeId = schedule.route_id;

    await schedule.destroy();
    
    logSuccess(`Schedule ${id} deleted`);

    // ==================== SEND REAL-TIME NOTIFICATION ====================
    
    // Notify all users watching this schedule
    NotificationService.sendScheduleUpdate(
      id,
      routeId,
      {
        route,
        updateType: 'general',
        message: `⚠️ Schedule for ${route} at ${schedule.departure_time} has been discontinued`,
      }
    );

    return { message: 'Schedule deleted successfully' };
  }
}

/**
 * Enhanced Route Service with Real-Time Notifications
 */
export class RouteService {
  /**
   * Get all routes
   */
  static async getAllRoutes() {
    return await Route.findAll({
      order: [['departure_city', 'ASC'], ['arrival_city', 'ASC']],
    });
  }

  /**
   * Get route by ID
   */
  static async getRouteById(id: number) {
    const route = await Route.findByPk(id);
    if (!route) {
      throw new Error('Route not found');
    }
    return route;
  }

  /**
   * Get routes by departure
   */
  static async getRoutesByDeparture(departureCity: string) {
    return await Route.findAll({
      where: { departure_city: departureCity },
      order: [['arrival_city', 'ASC']],
    });
  }

  /**
   * Create route with real-time notifications
   */
  static async createRoute(routeData: {
    departure_city: string;
    arrival_city: string;
    distance_km?: number;
    estimated_duration_minutes?: number;
  }) {
    logInfo(`Creating new route: ${routeData.departure_city} → ${routeData.arrival_city}`);

    const route = await Route.create(routeData);
    
    const routeStr = `${routeData.departure_city} → ${routeData.arrival_city}`;
    
    logSuccess(`Route ${route.id} created: ${routeStr}`);

    // ==================== SEND REAL-TIME NOTIFICATION ====================
    
    // Broadcast new route to all users
    NotificationService.sendRouteUpdate(route.id, {
      route: routeStr,
      updateType: 'created',
      message: `🆕 New route available: ${routeStr}! Check out schedules and book your seat now.`,
    });

    return route;
  }

  /**
   * Update route with real-time notifications
   */
  static async updateRoute(
    id: number,
    updateData: {
      departure_city?: string;
      arrival_city?: string;
      distance_km?: number;
      estimated_duration_minutes?: number;
    }
  ) {
    logInfo(`Updating route ${id}`);

    const route = await Route.findByPk(id);
    if (!route) {
      throw new Error('Route not found');
    }

    // Store old route info
    const oldRoute = `${route.departure_city} → ${route.arrival_city}`;

    await route.update(updateData);
    
    const newRoute = `${route.departure_city} → ${route.arrival_city}`;
    
    logSuccess(`Route ${id} updated: ${newRoute}`);

    // ==================== SEND REAL-TIME NOTIFICATION ====================
    
    let message = `Route information updated for ${newRoute}`;
    
    // Check if cities changed
    if (oldRoute !== newRoute) {
      message = `🔄 Route updated from ${oldRoute} to ${newRoute}`;
    } else if (updateData.distance_km) {
      message = `📏 Distance updated to ${updateData.distance_km} km for ${newRoute}`;
    } else if (updateData.estimated_duration_minutes) {
      const hours = Math.floor(updateData.estimated_duration_minutes / 60);
      const mins = updateData.estimated_duration_minutes % 60;
      message = `⏱️ Travel time updated to ${hours}h ${mins}m for ${newRoute}`;
    }

    NotificationService.sendRouteUpdate(id, {
      route: newRoute,
      updateType: 'updated',
      message,
    });

    return route;
  }

  /**
   * Delete route with notifications
   */
  static async deleteRoute(id: number) {
    logInfo(`Deleting route ${id}`);

    const route = await Route.findByPk(id);
    if (!route) {
      throw new Error('Route not found');
    }

    const routeStr = `${route.departure_city} → ${route.arrival_city}`;

    await route.destroy();
    
    logSuccess(`Route ${id} deleted: ${routeStr}`);

    // ==================== SEND REAL-TIME NOTIFICATION ====================
    
    NotificationService.sendRouteUpdate(id, {
      route: routeStr,
      updateType: 'deleted',
      message: `⚠️ Route ${routeStr} has been discontinued. Please check for alternative routes.`,
    });

    return { message: 'Route deleted successfully' };
  }
}