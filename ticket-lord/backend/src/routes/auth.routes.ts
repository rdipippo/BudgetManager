import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import {
  registerValidation,
  loginValidation,
} from '../middleware/validation';
import { authLimiter, passwordResetLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, registerValidation, AuthController.register);
router.post('/login', authLimiter, loginValidation, AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.post('/logout', authenticate, AuthController.logout);
router.get('/verify-email', AuthController.verifyEmail);
router.post('/forgot-password', passwordResetLimiter, AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.get('/profile', authenticate, AuthController.getProfile);
router.put('/profile', authenticate, AuthController.updateProfile);

export default router;
