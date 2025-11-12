import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/authRoutes';
import routeRoutes from './routes/routeRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import bookingRoutes from './routes/bookingRoutes';
import { errorHandler } from './middleware/errorHandler';
import { swaggerDocument } from './swagger';
import { config } from './config/app';

const app: Application = express();

// Security middleware - disable CSP in development for easier testing
app.use(
  helmet({
    contentSecurityPolicy: config.nodeEnv === 'development' ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.socket.io"],
        connectSrc: ["'self'", "ws:", "wss:", "https://cdn.socket.io"], // Added CDN here
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Bus Booking API Documentation',
}));

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