import { createServer } from 'http';
import app from './app';
import { config } from './config/app';
import sequelize, { testConnection } from './config/database';
import { CronService } from './services/cronService';
import SocketServer from './config/socket';

const PORT = config.port;

// Create HTTP server
const httpServer = createServer(app);

// Initialize database and start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Initialize Socket.IO
    SocketServer.initialize(httpServer);

    // Start server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📍 Environment: ${config.nodeEnv}`);
      console.log(`🌐 API URL: ${config.app.url}`);
      console.log(`💡 Health check: ${config.app.url}/health`);
      console.log(`📚 API Docs: ${config.app.url}/api-docs`);
      console.log(`⚡ WebSocket: Enabled`);

      // Start cron jobs
      if (config.nodeEnv === 'production' || config.nodeEnv === 'development') {
        CronService.startAllJobs();
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n👋 ${signal} signal received: closing HTTP server`);
  
  // Close Socket.IO connections
  try {
    const socketServer = SocketServer.getInstance();
    socketServer.getIO().close(() => {
      console.log('✅ Socket.IO connections closed');
    });
  } catch (error) {
    console.log('⚠️  Socket.IO not initialized or already closed');
  }

  // Close HTTP server
  httpServer.close(async () => {
    console.log('✅ HTTP server closed');
    
    // Close database connection
    await sequelize.close();
    console.log('✅ Database connection closed');
    
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('⚠️  Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown('UNHANDLED_REJECTION');
});

startServer();