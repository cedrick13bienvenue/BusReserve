# Rwanda Bus Booking System

A comprehensive bus booking system for intercity travel in Rwanda, allowing passengers to view routes, check available buses and seats, and reserve tickets online without visiting the bus park.

## Features

### For Passengers

- User registration and authentication
- View all available routes and bus schedules
- Check real-time seat availability
- Book seats for specific dates
- View booking history
- Cancel bookings
- Receive booking confirmation codes

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
- **Authentication**: JWT (JSON Web Tokens)
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
│   │   └── Booking.ts          # Booking model
│   ├── routes/
│   │   ├── authRoutes.ts       # Auth endpoints
│   │   ├── bookingRoutes.ts    # Booking endpoints
│   │   ├── routeRoutes.ts      # Route endpoints
│   │   └── scheduleRoutes.ts   # Schedule endpoints
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
npm run migration:run
```

6. **Seed the database (optional)**

```bash
psql -d bus_booking_db -f src/database/seeds/seed.sql
```

7. **Start the development server**

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
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

### Get Available Routes

```bash
curl http://localhost:3000/api/routes
```

### Check Available Seats

```bash
curl "http://localhost:3000/api/schedules/1/available-seats?travel_date=2025-10-20"
```

### Create a Booking

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "schedule_id": 1,
    "travel_date": "2025-10-20",
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

## Development

### Build for production

```bash
npm run build
```

### Start production server

```bash
npm start
```

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Role-based access control (passenger/admin)
- Input validation and sanitization
- CORS and Helmet security headers
- SQL injection prevention with parameterized queries
