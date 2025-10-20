import { Request, Response } from 'express';
import { Route } from '../models';

export class RouteController {
  static async getAllRoutes(_req: Request, res: Response): Promise<void> {
    try {
      const routes = await Route.findAll({
        order: [['departure_city', 'ASC'], ['arrival_city', 'ASC']],
      });
      res.json({ routes });
    } catch (error: any) {
      console.error('Get routes error:', error);
      res.status(500).json({ error: 'Failed to fetch routes' });
    }
  }

  static async getRouteById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const route = await Route.findByPk(id);

      if (!route) {
        res.status(404).json({ error: 'Route not found' });
        return;
      }

      res.json({ route });
    } catch (error: any) {
      console.error('Get route error:', error);
      res.status(500).json({ error: 'Failed to fetch route' });
    }
  }

  static async getRoutesByDeparture(req: Request, res: Response) {
    try {
      const { departure } = req.params;
      const routes = await Route.findAll({
        where: { departure_city: departure },
        order: [['arrival_city', 'ASC']],
      });
      res.json({ routes });
    } catch (error: any) {
      console.error('Get routes by departure error:', error);
      res.status(500).json({ error: 'Failed to fetch routes' });
    }
  }

  static async createRoute(req: Request, res: Response): Promise<void> {
    try {
      const { departure_city, arrival_city, distance_km, estimated_duration_minutes } = req.body;

      const route = await Route.create({
        departure_city,
        arrival_city,
        distance_km,
        estimated_duration_minutes,
      });

      res.status(201).json({
        message: 'Route created successfully',
        route,
      });
    } catch (error: any) {
      console.error('Create route error:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        res.status(400).json({ error: 'Route already exists' });
        return;
      }
      res.status(500).json({ error: 'Failed to create route' });
    }
  }

  static async updateRoute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { departure_city, arrival_city, distance_km, estimated_duration_minutes } = req.body;

      const route = await Route.findByPk(id);
      if (!route) {
        res.status(404).json({ error: 'Route not found' });
        return;
      }

      await route.update({
        departure_city,
        arrival_city,
        distance_km,
        estimated_duration_minutes,
      });

      res.json({
        message: 'Route updated successfully',
        route,
      });
    } catch (error: any) {
      console.error('Update route error:', error);
      res.status(500).json({ error: 'Failed to update route' });
    }
  }

  static async deleteRoute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const route = await Route.findByPk(id);

      if (!route) {
        res.status(404).json({ error: 'Route not found' });
        return;
      }

      await route.destroy();
      res.json({ message: 'Route deleted successfully' });
    } catch (error: any) {
      console.error('Delete route error:', error);
      res.status(500).json({ error: 'Failed to delete route' });
    }
  }
}