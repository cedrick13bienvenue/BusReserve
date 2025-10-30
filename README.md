# Rwanda Bus Booking System

A comprehensive bus booking system for intercity travel in Rwanda, allowing passengers to view routes, check available buses and seats, and reserve tickets online without visiting the bus park.

## Features

### For Passengers

- User registration and authentication
- User login and logout with JWT token management
- View all available routes and bus schedules
- Check real-time seat availability
- Book seats for specific dates
- View booking history
- Cancel bookings
- Receive booking confirmation codes
- Secure logout with token blacklisting

### For Administrators

- Manage routes (create, update, delete)
- Manage bus schedules
- View all bookings
- Update booking status
- Monitor daily operations

## Technology Stack

- **Backend**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Sequelize
- **Authentication**: JWT (JSON Web Tokens) with token blacklisting
- **Password Hashing**: bcryptjs
- **Validation**: express-validator

## Project Structure

```
bus-booking-system/
├── src/
│   ├── config/
│   │   ├── app.ts              # Application configuration
│   │   └── database.ts         # Database connection
│   ├── controllers/
│   │   ├── authController.ts   # Authentication logic
│   │   ├── bookingController.ts # Booking management
│   │   ├── routeController.ts  # Route management
│   │   └── scheduleController.ts # Schedule management
│   ├── database/
│   │   ├── migrations/
│   │   │   └── 001_init_schema.sql # Database schema
│   │   ├── seeds/
│   │   │   └── seed.sql        # Sample data
│   │   └── runMigrations.ts    # Migration runner
│   ├── middleware/
│   │   ├── auth.ts             # Authentication middleware
│   │   ├── errorHandler.ts    # Error handling
│   │   └── validation.ts       # Request validation
│   ├── models/
│   │   ├── User.ts             # User model
│   │   ├── Route.ts            # Route model
│   │   ├── BusSchedule.ts      # Schedule model
│   │   ├── Booking.ts          # Booking model
│   │   └── TokenBlacklist.ts   # Token blacklist model
│   ├── routes/
│   │   ├── authRoutes.ts       # Auth endpoints
│   │   ├── bookingRoutes.ts    # Booking endpoints
│   │   ├── routeRoutes.ts      # Route endpoints
│   │   └── scheduleRoutes.ts   # Schedule endpoints
│   ├── services/
│   │   ├── authService.ts      # Authentication business logic
│   │   ├── bookingService.ts   # Booking business logic
│   │   ├── routeService.ts     # Route business logic
│   │   └── scheduleService.ts  # Schedule business logic
│   ├── swagger/
│   │   ├── config.ts           # Swagger configuration
│   │   ├── schemas/            # API schemas
│   │   └── paths/              # API path definitions
│   ├── app.ts                  # Express app setup
│   └── server.ts               # Server entry point
├── .env.example                # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Steps

1. **Clone the repository**

```bash
git clone <repository-url>
cd bus-booking-system
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=bus_booking_db
DB_USER=postgres
DB_PASSWORD=your_password

JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
```

4. **Create PostgreSQL database**

```bash
createdb bus_booking_db
```

5. **Run migrations**

```bash
npm run db:migrate
```

6. **Seed the database (optional)**

```bash
npm run db:seed
```

7. **Start the development server**

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user and receive JWT token
- `POST /api/auth/logout` - Logout user and invalidate token (authenticated)
- `GET /api/auth/profile` - Get user profile (authenticated)
- `PUT /api/auth/profile` - Update user profile (authenticated)

### Routes

- `GET /api/routes` - Get all routes
- `GET /api/routes/:id` - Get route by ID
- `GET /api/routes/departure/:departure` - Get routes by departure city
- `POST /api/routes` - Create route (admin only)
- `PUT /api/routes/:id` - Update route (admin only)
- `DELETE /api/routes/:id` - Delete route (admin only)

### Schedules

- `GET /api/schedules` - Get all schedules
- `GET /api/schedules/:id` - Get schedule by ID
- `GET /api/schedules/route/:routeId` - Get schedules by route
- `GET /api/schedules/:scheduleId/available-seats?travel_date=YYYY-MM-DD` - Get available seats
- `POST /api/schedules` - Create schedule (admin only)
- `PUT /api/schedules/:id` - Update schedule (admin only)
- `DELETE /api/schedules/:id` - Delete schedule (admin only)

### Bookings

- `POST /api/bookings` - Create booking (authenticated)
- `GET /api/bookings/my-bookings` - Get user bookings (authenticated)
- `GET /api/bookings/code/:code` - Get booking by code (authenticated)
- `DELETE /api/bookings/:code` - Cancel booking (authenticated)
- `GET /api/bookings` - Get all bookings (admin only)
- `PUT /api/bookings/:id/status` - Update booking status (admin only)

## Sample API Usage

### Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "phone_number": "+250788123456",
    "password": "Password123"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "Password123"
  }'
```

**Response:**

```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "full_name": "John Doe",
      "email": "john@example.com",
      "phone_number": "+250788123456",
      "role": "passenger"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "message": "Logged out successfully"
}
```

### Get Available Routes

```bash
curl http://localhost:3000/api/routes
```

### Check Available Seats

```bash
curl "http://localhost:3000/api/schedules/1/available-seats?travel_date=2025-10-30"
```

### Create a Booking

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "schedule_id": 1,
    "travel_date": "2025-11-05",
    "seat_number": 15
  }'
```

## Database Schema

The system uses the following main tables:

- **users** - User accounts (passengers and admins)
- **bus_companies** - Bus operating companies
- **routes** - Available travel routes
- **buses** - Bus information
- **bus_schedules** - Bus departure/arrival schedules
- **bookings** - Passenger reservations
- **token_blacklist** - Invalidated JWT tokens for logout functionality

## Development

### Run migrations

```bash
npm run db:migrate
```

### Undo last migration

```bash
npm run db:migrate:undo
```

### Run seeders

```bash
npm run db:seed
```

### Build for production

```bash
npm run build
```

### Start production server

```bash
npm start
```

## Security Features

- Password hashing with bcrypt (10 rounds)
- JWT-based authentication with configurable expiration
- **Token blacklisting on logout** - prevents reuse of invalidated tokens
- Role-based access control (passenger/admin)
- Input validation and sanitization with express-validator
- CORS and Helmet security headers
- SQL injection prevention with parameterized queries (Sequelize ORM)
- Automatic cleanup of expired blacklisted tokens

## API Documentation

Interactive API documentation is available via Swagger UI:

```
http://localhost:3000/api-docs
```

## Token Management

### How Logout Works

1. User calls `/api/auth/logout` with their JWT token
2. Token is decoded to extract expiration time
3. Token is added to `token_blacklist` table with expiration date
4. All subsequent requests with that token are rejected (401 Unauthorized)
5. Expired tokens are automatically cleaned from blacklist (daily cron job)

## Automated Token Cleanup

The system automatically cleans up expired tokens from the blacklist to maintain optimal database performance.

### How It Works

- **Schedule**: Daily at 2:00 AM
- **Action**: Removes all tokens with `expires_at < current_time`
- **Logs**: Cleanup results are logged for monitoring
- **Automatic**: Runs automatically on server startup

### Customizing the Schedule

To change the cleanup schedule, edit `src/services/cronService.ts`:

```typescript
// Current: Daily at 2:00 AM
cron.schedule('0 2 * * *', async () => { ... });

// Common cron patterns:
// Every hour:        '0 * * * *'
// Every 6 hours:     '0 */6 * * *'
// Every day at noon: '0 12 * * *'
// Every Sunday 3 AM: '0 3 * * 0'
// Every Monday 1 AM: '0 1 * * 1'
```

### Cron Schedule Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, 0 or 7 = Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Monitoring Logs

The cleanup process logs its activity:

```bash
# Successful cleanup
[2025-10-30T02:00:00.000Z] [INFO] Starting expired token cleanup...
[2025-10-30T02:00:00.123Z] [SUCCESS] Removed 15 expired token(s) from blacklist

# No tokens to remove
[2025-10-30T02:00:00.000Z] [INFO] Starting expired token cleanup...
[2025-10-30T02:00:00.123Z] [INFO] No expired tokens to remove

# Error case
[2025-10-30T02:00:00.000Z] [INFO] Starting expired token cleanup...
[2025-10-30T02:00:00.123Z] [ERROR] Failed to clean up expired tokens
```
