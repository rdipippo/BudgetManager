# 🎟 Ticket Lord

A full-stack event ticketing platform. Hosts create and manage events, attendees purchase tickets with Stripe, and mobile-ready via Capacitor.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, CSS Modules |
| Mobile | Capacitor (iOS & Android) |
| Backend | Node.js, Express, TypeScript |
| Database | MySQL 8 |
| Payments | Stripe (PaymentIntents + Connect) |
| Auth | JWT (15min) + HttpOnly refresh tokens (7d) |

## Quick Start

### Prerequisites
- Node.js 20+
- MySQL 8+
- Stripe account (test keys)

### Database
```bash
mysql -u root -p < backend/database/schema.sql
```

### Backend
```bash
cd backend
cp .env.example .env    # Fill in your values
npm install
npm run dev             # http://localhost:5001
```

### Frontend
```bash
cd frontend
npm install
npm run dev             # http://localhost:3001
```

### Mobile (Capacitor)
```bash
cd frontend
npm run build
npm run cap:sync
npm run cap:android     # Opens Android Studio
npm run cap:ios         # Opens Xcode
```

## User Roles

| Role | Capabilities |
|------|-------------|
| `attendee` | Browse events, purchase tickets, view/download tickets |
| `host` | All attendee capabilities + create/manage events, check-in scanner, Stripe payouts |
| `admin` | Full system access |

## API Routes

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/verify-email?token=
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/profile
PUT    /api/auth/profile

GET    /api/events                        Public listing
GET    /api/events/:id                    Public detail
GET    /api/events/host/my-events         Host: own events
POST   /api/events                        Host: create
PUT    /api/events/:id                    Host: update
DELETE /api/events/:id                    Host: delete (draft only)
POST   /api/events/:id/ticket-types       Host: add ticket type
PUT    /api/events/:id/ticket-types/:ttId Host: update ticket type
DELETE /api/events/:id/ticket-types/:ttId Host: remove ticket type
GET    /api/events/:id/attendees          Host: attendee list
POST   /api/events/:id/check-in           Host: ticket check-in

POST   /api/orders                        Create order + Stripe intent
GET    /api/orders/my-orders              User's orders
GET    /api/orders/:id                    Order detail
POST   /api/orders/:id/refund             Request refund

GET    /api/tickets/my-tickets            User's tickets
GET    /api/tickets/:id                   Ticket detail
GET    /api/tickets/number/:number        Lookup by ticket number

GET    /api/payments/config               Stripe publishable key
POST   /api/payments/webhook              Stripe webhook
POST   /api/payments/connect              Host: create Connect account
GET    /api/payments/connect/status       Host: Connect account status

GET    /api/health                        Health check
```

## Security

- Helmet.js with strict CSP headers
- bcrypt password hashing (cost factor 12)
- JWT access tokens (15min) + rotating HttpOnly refresh tokens (7d)
- Rate limiting: 100 req/15min general, 10 req/15min auth
- Input validation via express-validator on all endpoints
- SQL injection prevention via parameterized queries
- CORS restricted to frontend origin
- Stripe webhook signature verification
- 30-minute inactivity logout on frontend

## Accessibility

- Semantic HTML5 with ARIA roles/labels
- Skip-to-main-content link
- All interactive elements keyboard-navigable
- Focus-visible outlines
- Screen reader announcements via `aria-live`
- Reduced-motion support for animations
- Color contrast meets WCAG 2.1 AA
- Form fields labeled and error-linked via `aria-describedby`
