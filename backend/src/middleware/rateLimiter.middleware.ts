import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import { config } from '../config';

// E2E tests fan out many requests against the dev server. When the
// DISABLE_RATE_LIMIT flag is set (Playwright sets it on the spawned backend)
// or the request hits a /api/test/* helper, skip the limiter entirely.
const skipForTests = (req: Request): boolean => {
  if (process.env.DISABLE_RATE_LIMIT === '1') return true;
  return req.path.startsWith('/test/') || req.originalUrl.startsWith('/api/test/');
};

export const generalLimiter = rateLimit({
  windowMs: config.rateLimits.general.windowMs,
  max: config.rateLimits.general.max,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForTests,
});

export const authLimiter = rateLimit({
  windowMs: config.rateLimits.auth.windowMs,
  max: config.rateLimits.auth.max,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForTests,
});

export const passwordResetLimiter = rateLimit({
  windowMs: config.rateLimits.passwordReset.windowMs,
  max: config.rateLimits.passwordReset.max,
  message: { error: 'Too many password reset requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipForTests,
});
