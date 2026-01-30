# Account Manager

A secure, cross-platform login system built with React, Node.js, MySQL, and Capacitor.

## Features

- User registration with email verification
- Secure login with JWT authentication
- Password reset via email
- Remember me functionality
- Multi-language support (English, Spanish)
- Cross-platform (Web, iOS, Android)
- Responsive design

## Tech Stack

### Frontend
- React 18 with TypeScript
- React Router for navigation
- Capacitor 5 for iOS/Android/Web
- i18next for internationalization
- Axios for HTTP requests
- Plain CSS with CSS custom properties

### Backend
- Express.js with TypeScript
- MySQL2 for database
- bcrypt for password hashing (cost factor 12)
- jsonwebtoken for JWT tokens
- nodemailer for email sending
- express-rate-limit for rate limiting
- helmet for security headers
- express-validator for input validation

## Project Structure

```
AccountManager/
├── frontend/                    # React + Capacitor app
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── screens/             # Login, Register, etc.
│   │   ├── services/            # API service layer
│   │   ├── i18n/                # Internationalization
│   │   ├── styles/              # CSS files
│   │   ├── context/             # Auth context
│   │   └── App.tsx
│   └── package.json
│
├── backend/                     # Node.js Express API
│   ├── src/
│   │   ├── controllers/         # Route handlers
│   │   ├── middleware/          # Auth, validation, rate limiting
│   │   ├── models/              # Database models
│   │   ├── routes/              # API routes
│   │   ├── services/            # Email, token services
│   │   ├── config/              # Configuration
│   │   └── app.ts
│   ├── database/
│   │   └── schema.sql           # MySQL schema
│   └── package.json
│
└── README.md
```

## Setup

### Prerequisites

- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Database Setup

1. Create the database and tables:

```bash
mysql -u root -p < backend/database/schema.sql
```

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create environment file:

```bash
cp .env.example .env
```

4. Configure the `.env` file with your settings:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=account_manager
DB_USER=root
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email (configure with your SMTP provider)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
EMAIL_FROM=noreply@example.com

# App URLs
APP_URL=http://localhost:3000
API_URL=http://localhost:5000
PORT=5000
```

5. Start the development server:

```bash
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The app will be available at http://localhost:3000

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create new account |
| POST | /api/auth/login | Login user |
| POST | /api/auth/logout | Logout user |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/forgot-password | Request password reset |
| POST | /api/auth/reset-password | Reset password with token |
| GET | /api/auth/verify-email/:token | Verify email address |
| POST | /api/auth/resend-verification | Resend verification email |
| GET | /api/auth/me | Get current user |
| GET | /api/health | Health check |

## Security Features

1. **Password Security**
   - bcrypt hashing with cost factor 12
   - Minimum requirements: 8+ chars, uppercase, lowercase, number, special character

2. **Authentication**
   - JWT access tokens (15 min expiry)
   - Refresh tokens (7 days, stored hashed in DB)
   - Secure HTTP-only cookies for web

3. **API Security**
   - Rate limiting (100 requests/15min general, 10/15min for auth)
   - Input validation and sanitization
   - Parameterized SQL queries
   - Helmet.js security headers
   - CORS configuration

4. **Password Reset**
   - Cryptographically secure random tokens
   - Token expiry (1 hour)
   - One-time use tokens

## Building for Production

### Backend

```bash
cd backend
npm run build
npm start
```

### Frontend (Web)

```bash
cd frontend
npm run build
```

### Mobile (Capacitor)

```bash
cd frontend
npm run build
npx cap sync

# iOS (requires Mac)
npx cap open ios

# Android
npx cap open android
```

## Customization

### Theming

Edit `frontend/src/styles/variables.css` to customize colors, spacing, and typography:

```css
:root {
  --color-primary: #4F46E5;
  --color-primary-hover: #4338CA;
  /* ... */
}
```

### Translations

Add or modify translations in `frontend/src/i18n/locales/`:
- `en.json` - English
- `es.json` - Spanish

## License

MIT
