import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes';
import routeRoutes from './routes/routeRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import bookingRoutes from './routes/bookingRoutes';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Bus Booking System API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/bookings', bookingRoutes);

// Error handling
app.use(errorHandler);

export default app;