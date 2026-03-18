import { Router } from 'express';
import { TicketsController } from '../controllers/tickets.controller';
import { authenticate } from '../middleware/auth';
import { idParam } from '../middleware/validation';

const router = Router();

router.get('/my-tickets', authenticate, TicketsController.getMyTickets);
router.get('/number/:number', authenticate, TicketsController.getTicketByNumber);
router.get('/:id', authenticate, idParam, TicketsController.getTicketById);

export default router;
