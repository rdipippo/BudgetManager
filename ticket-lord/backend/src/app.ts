import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { generalLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/auth.routes';
import eventsRoutes from './routes/events.routes';
import ordersRoutes from './routes/orders.routes';
import ticketsRoutes from './routes/tickets.routes';
import paymentsRoutes from './routes/payments.routes';

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://js.stripe.com'],
      frameSrc: ["'self'", 'https://js.stripe.com'],
      connectSrc: ["'self'", 'https://api.stripe.com'],
    },
  },
}));

// CORS
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Stripe webhook needs raw body - must be before json middleware
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    // Already handled via raw body, pass to router
    next();
  }
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(generalLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ticket-lord-api', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/payments', paymentsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🎟  Ticket Lord API running on port ${PORT}`);
});

export default app;
