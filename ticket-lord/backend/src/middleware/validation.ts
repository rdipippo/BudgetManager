import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const handleValidation = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

export const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('role').optional().isIn(['attendee', 'host']).withMessage('Invalid role'),
  handleValidation,
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  handleValidation,
];

export const eventValidation = [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description required'),
  body('category').isIn(['music','sports','arts','food','business','technology','education','other']),
  body('venueName').trim().notEmpty().withMessage('Venue name required'),
  body('venueAddress').trim().notEmpty().withMessage('Venue address required'),
  body('city').trim().notEmpty(),
  body('state').trim().notEmpty(),
  body('country').trim().notEmpty(),
  body('startDate').isISO8601().withMessage('Valid start date required'),
  body('endDate').isISO8601().withMessage('Valid end date required'),
  handleValidation,
];

export const ticketTypeValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Ticket type name required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be non-negative'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('maxPerOrder').optional().isInt({ min: 1, max: 20 }),
  body('minPerOrder').optional().isInt({ min: 1 }),
  handleValidation,
];

export const orderValidation = [
  body('eventId').isInt({ min: 1 }).withMessage('Valid event ID required'),
  body('items').isArray({ min: 1 }).withMessage('Order items required'),
  body('items.*.ticketTypeId').isInt({ min: 1 }),
  body('items.*.quantity').isInt({ min: 1, max: 20 }),
  handleValidation,
];

export const idParam = [
  param('id').isInt({ min: 1 }).withMessage('Valid ID required'),
  handleValidation,
];
