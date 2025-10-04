# FPL Hub Backend

A robust backend API for FPL Hub - A Fantasy Premier League platform designed for the Ghana market.

## 🚀 Features

### 🔐 Authentication & User Management
- **JWT-based authentication** with secure token management
- **User registration and login** with password hashing
- **Profile management** with update capabilities
- **Password change** functionality
- **Token verification** endpoints

### ⚽ FPL Integration
- **Real-time FPL data** from official Fantasy Premier League API
- **Player information** with stats, prices, and form
- **Team data** for all Premier League clubs
- **Gameweek management** with current and upcoming fixtures
- **FPL team linking** - Connect user accounts to official FPL teams
- **Squad data retrieval** with captain/vice-captain information

### 🏆 League Management
- **Create and manage leagues** with entry fees and prize pools
- **League types** - Classic and Head-to-Head formats
- **League standings** with real-time rankings
- **Join/leave league** functionality
- **League statistics** and performance tracking

### 💰 Transaction System
- **Payment processing** for league entry fees
- **Transaction history** with detailed records
- **Multiple payment methods** (MTN, Vodafone, AirtelTigo, Card)
- **Prize distribution** tracking
- **Wallet management** with balance tracking



## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **Prisma** - Database ORM and migrations
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **axios** - HTTP client for FPL API
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable management

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone and Install

```bash
cd fpl-hub-backend
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/fpl_hub"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-here"

# Server
PORT=5000

# Optional: Logging
NODE_ENV=development
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed database with sample data
npx prisma db seed
```

### 4. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

### 5. Test the API

```bash
# Run comprehensive API tests
npm test
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Key Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user
- `GET /auth/verify` - Verify JWT token

#### User Management
- `POST /user/link-fpl-team` - Link FPL team to user account
- `DELETE /user/unlink-fpl-team` - Unlink FPL team
- `GET /user/fpl-team` - Get user's linked FPL team
- `GET /user/fpl-squad/{teamId}` - Get user's FPL squad
- `GET /user/profile` - Get user profile
- `PUT /user/profile` - Update user profile
- `PUT /user/change-password` - Change password

#### FPL Data
- `GET /fpl/players` - Get all players
- `GET /fpl/teams` - Get all Premier League teams
- `GET /fpl/gameweek/current` - Get current gameweek
- `GET /fpl/team/{teamId}` - Get FPL team by ID
- `GET /fpl/team/{teamId}/squad` - Get FPL team squad
- `POST /fpl/validate-team` - Validate team composition

#### League Management
- `POST /leagues` - Create new league
- `GET /leagues` - Get all leagues
- `GET /leagues/{leagueId}` - Get league details
- `POST /leagues/{leagueId}/join` - Join league
- `GET /leagues/{leagueId}/standings` - Get league standings



For complete API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 🗄️ Database Schema

### Core Models

#### User
- Basic user information (email, username, password)
- FPL team linking (`fplTeamId`)
- Profile data (phone, verification status)



#### League
- League configuration (name, type, entry fee)
- Prize pool and participant limits
- Status tracking (open, in-progress, completed)

#### LeagueEntry
- Junction table for teams in leagues
- Points and ranking tracking
- Join timestamps

#### Transaction
- Payment and prize transaction records
- Multiple payment method support
- Status tracking (pending, completed, failed)

## 🔧 Development

### Project Structure
```
fpl-hub-backend/
├── src/
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic
│   ├── middleware/      # Custom middleware
│   ├── models/          # Data models
│   └── config/          # Configuration files
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── migrations/      # Database migrations
├── server.js           # Main server file
├── test-api.js         # API test suite
└── package.json        # Dependencies and scripts
```

### Available Scripts

```bash
# Development
npm run dev          # Start with nodemon (auto-reload)

# Production
npm start            # Start production server

# Testing
npm test             # Run API tests

# Database
npx prisma studio    # Open Prisma Studio (database GUI)
npx prisma migrate dev  # Create and apply migrations
npx prisma generate     # Generate Prisma client
npx prisma db push      # Push schema changes to database
```

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `JWT_SECRET` | Secret key for JWT tokens | Yes | - |
| `PORT` | Server port | No | 5000 |
| `NODE_ENV` | Environment mode | No | development |

## 🧪 Testing

The backend includes a comprehensive test suite that covers:

- Server health checks
- User authentication (register/login)
- FPL data retrieval
- FPL team linking
- User profile management
- API error handling

Run tests with:
```bash
npm test
```

## 🔒 Security Features

- **Password hashing** using bcrypt
- **JWT token authentication** with expiration
- **Input validation** on all endpoints
- **SQL injection prevention** via Prisma ORM
- **CORS configuration** for frontend integration
- **Rate limiting** (can be added)
- **Environment variable protection**

## 📊 Performance Features

- **FPL data caching** (5-minute cache for API calls)
- **Database connection pooling** via Prisma
- **Efficient queries** with proper indexing
- **Response compression** (can be added)
- **Error logging** and monitoring

## 🚀 Deployment

### Production Checklist

1. **Environment Variables**
   - Set `NODE_ENV=production`
   - Use strong `JWT_SECRET`
   - Configure production `DATABASE_URL`

2. **Database**
   - Run migrations: `npx prisma migrate deploy`
   - Generate client: `npx prisma generate`

3. **Security**
   - Enable HTTPS
   - Configure CORS for production domain
   - Set up rate limiting
   - Add request logging

4. **Monitoring**
   - Set up error tracking (Sentry, etc.)
   - Configure health checks
   - Monitor database performance

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npx prisma generate

EXPOSE 5000

CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Check the [API Documentation](./API_DOCUMENTATION.md)
- Review the test suite for usage examples
- Open an issue on GitHub

## 🔄 API Versioning

Current API version: **v2.0.0**

The API follows semantic versioning. Breaking changes will be communicated in advance and may require frontend updates.
