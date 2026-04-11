import { Router } from 'express';
import { NoteController } from '../controllers';
import { authMiddleware } from '../middleware';
import { body, query, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware';

const router = Router();
router.use(authMiddleware);

const ENTITY_TYPES = ['plaid_account', 'category', 'monthly_budget'];

const getNotesValidation = [
  query('entityType').isIn(ENTITY_TYPES).withMessage('Invalid entity type'),
  query('entityId').isInt({ min: 0 }).withMessage('entityId must be a non-negative integer'),
  query('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
  handleValidationErrors,
];

const createNoteValidation = [
  body('entityType').isIn(ENTITY_TYPES).withMessage('Invalid entity type'),
  body('entityId').isInt({ min: 0 }).withMessage('entityId must be a non-negative integer'),
  body('body').trim().isLength({ min: 1, max: 2000 }).withMessage('Note body must be 1–2000 characters'),
  body('year').optional().isInt({ min: 2000, max: 2100 }).withMessage('Invalid year'),
  body('month').optional().isInt({ min: 1, max: 12 }).withMessage('Invalid month'),
  handleValidationErrors,
];

const updateNoteValidation = [
  param('id').isInt({ min: 1 }).withMessage('Invalid note ID'),
  body('body').trim().isLength({ min: 1, max: 2000 }).withMessage('Note body must be 1–2000 characters'),
  handleValidationErrors,
];

const idParamValidation = [
  param('id').isInt({ min: 1 }).withMessage('Invalid note ID'),
  handleValidationErrors,
];

router.get('/', getNotesValidation, NoteController.getNotes);
router.post('/', createNoteValidation, NoteController.createNote);
router.put('/:id', updateNoteValidation, NoteController.updateNote);
router.delete('/:id', idParamValidation, NoteController.deleteNote);

export default router;
