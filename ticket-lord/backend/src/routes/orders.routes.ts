import { Router } from 'express';
import { OrdersController } from '../controllers/orders.controller';
import { authenticate } from '../middleware/auth';
import { orderValidation, idParam } from '../middleware/validation';
import { purchaseLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/', authenticate, purchaseLimiter, orderValidation, OrdersController.createOrder);
router.get('/my-orders', authenticate, OrdersController.getMyOrders);
router.get('/:id', authenticate, idParam, OrdersController.getOrder);
router.post('/:id/refund', authenticate, idParam, OrdersController.requestRefund);

export default router;
