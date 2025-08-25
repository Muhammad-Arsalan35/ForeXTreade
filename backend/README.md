# Clover Path Rewards - Backend API

A comprehensive Node.js/Express backend for the Clover Path Rewards application with PostgreSQL database, JWT authentication, and full CRUD operations.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Password hashing with bcrypt
  - Role-based access control
  - Password reset functionality

- **User Management**
  - User registration and login
  - Profile management
  - VIP level system
  - Referral system

- **Financial Operations**
  - Deposit management with approval workflow
  - Withdrawal requests
  - Wallet balance tracking
  - Financial records and history

- **Task System**
  - Video-based tasks
  - Reward calculation based on VIP level
  - Task completion tracking
  - Daily task limits

- **Communication**
  - In-app messaging system

- **Security**
  - Rate limiting
  - Input validation with Joi
  - CORS configuration
  - Helmet security headers
  - File upload security

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd clover-path-rewards/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   Edit `.env` file with your configuration values.

4. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb clover_path_rewards
   
   # Run migrations
   npm run db:migrate
   ```

5. **Start the server**
   ```bash
   # Development
   npm run server:dev
   
   # Production
   npm run server
   ```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clover_path_rewards
DB_USER=postgres
DB_PASSWORD=your-database-password


```

## 📊 Database Schema

### Core Tables

- **users** - User accounts and profiles
- **referrals** - Referral relationships and commissions
- **payment_methods** - Available payment options
- **deposits** - User deposit requests and approvals
- **withdrawals** - User withdrawal requests and approvals
- **tasks** - Available tasks for users
- **task_completions** - User task completion records
- **vip_levels** - VIP level configurations
- **user_levels** - User VIP level tracking
- **financial_records** - Transaction history
- **messages** - In-app messaging system
- **system_settings** - Application configuration

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset
- `GET /api/auth/verify` - Token verification

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/wallet` - Get wallet balances
- `GET /api/users/referrals` - Get referral history

### Deposits
- `POST /api/deposits` - Create deposit request
- `GET /api/deposits` - Get user deposits
- `GET /api/deposits/:id` - Get specific deposit
- `PUT /api/deposits/:id/approve` - Approve deposit (admin)

### Withdrawals
- `POST /api/withdrawals` - Create withdrawal request
- `GET /api/withdrawals` - Get user withdrawals
- `PUT /api/withdrawals/:id/approve` - Approve withdrawal (admin)

### Tasks
- `GET /api/tasks` - Get available tasks
- `POST /api/tasks/:id/complete` - Complete a task
- `GET /api/tasks/completions` - Get task completion history

### VIP System
- `GET /api/vip/levels` - Get VIP levels
- `POST /api/vip/upgrade` - Upgrade VIP level
- `GET /api/vip/benefits` - Get VIP benefits

### Financial
- `GET /api/financial/records` - Get financial records
- `GET /api/financial/statistics` - Get financial statistics

### Invites
- `POST /api/invites` - Send invitation
- `GET /api/invites` - Get invitation history

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Bcrypt with 12 salt rounds
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **Input Validation** - Joi schema validation
- **CORS Protection** - Configured for frontend domain
- **Security Headers** - Helmet.js implementation
- **File Upload Security** - Multer with file type validation

## 📧 Communication Features

### In-App Messaging
- System notifications
- Transaction alerts
- Task completion notifications

## 🚀 Deployment

### Development
```bash
npm run server:dev
```

### Production
```bash
npm run build
npm run server
```

### Docker (Optional)
```bash
docker build -t clover-path-rewards-backend .
docker run -p 5000:5000 clover-path-rewards-backend
```

## 📝 API Documentation

### Request Format
All requests should include:
- `Content-Type: application/json` header
- `Authorization: Bearer <token>` header (for protected routes)

### Response Format
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

### Error Format
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📊 Monitoring

- **Health Check**: `GET /api/health`
- **Logging**: Morgan HTTP request logging
- **Error Tracking**: Comprehensive error handling
- **Performance**: Query execution time logging

## 🔧 Development

### Database Migrations
```bash
npm run db:migrate
```

### Seed Data
```bash
npm run db:seed
```

### Code Quality
```bash
npm run lint
npm run format
```

## 📞 Support

For support and questions:
- Email: support@cloverpathrewards.com
- Phone: +923001234567

## 📄 License

This project is proprietary software. All rights reserved.
