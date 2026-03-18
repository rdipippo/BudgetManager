import { Router } from 'express';
import { EventsController } from '../controllers/events.controller';
import { authenticate, requireHost } from '../middleware/auth';
import { eventValidation, ticketTypeValidation, idParam } from '../middleware/validation';

const router = Router();

// Public routes
router.get('/', EventsController.list);
router.get('/:id', idParam, EventsController.getById);

// Host routes (authenticated)
router.get('/host/my-events', authenticate, requireHost, EventsController.getMyEvents);
router.post('/', authenticate, requireHost, eventValidation, EventsController.create);
router.put('/:id', authenticate, requireHost, idParam, EventsController.update);
router.delete('/:id', authenticate, requireHost, idParam, EventsController.delete);

// Ticket types management
router.post('/:id/ticket-types', authenticate, requireHost, idParam, ticketTypeValidation, EventsController.addTicketType);
router.put('/:id/ticket-types/:ticketTypeId', authenticate, requireHost, EventsController.updateTicketType);
router.delete('/:id/ticket-types/:ticketTypeId', authenticate, requireHost, EventsController.deleteTicketType);

// Attendee management / check-in
router.get('/:id/attendees', authenticate, requireHost, idParam, EventsController.getAttendees);
router.post('/:id/check-in', authenticate, requireHost, idParam, EventsController.checkIn);

export default router;
