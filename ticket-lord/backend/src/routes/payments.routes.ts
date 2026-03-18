import { Router } from 'express';
import { PaymentsController } from '../controllers/payments.controller';
import { authenticate, requireHost } from '../middleware/auth';

const router = Router();

router.get('/config', PaymentsController.getPublishableKey);
router.post('/webhook', PaymentsController.webhook); // raw body handled in app.ts
router.post('/connect', authenticate, requireHost, PaymentsController.connectStripeAccount);
router.get('/connect/status', authenticate, PaymentsController.getConnectStatus);

export default router;
