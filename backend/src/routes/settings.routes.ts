import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authMiddleware } from '../middleware';

const router = Router();

// All settings routes require authentication
router.use(authMiddleware);

// Transaction column preferences
router.get('/transactions', SettingsController.getTransactionPreferences);
router.put('/transactions', SettingsController.updateTransactionPreferences);

export default router;
