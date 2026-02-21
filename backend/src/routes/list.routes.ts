import { Router } from 'express';
import { ListController } from '../controllers';
import { authMiddleware } from '../middleware';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware';

const router = Router();

const listValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('List name must be between 1 and 100 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color (e.g., #FF5733)'),
  body('icon')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Icon name must be at most 50 characters'),
  handleValidationErrors,
];

const updateListValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('List name must be between 1 and 100 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color (e.g., #FF5733)'),
  body('icon')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Icon name must be at most 50 characters'),
  handleValidationErrors,
];

const listItemValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Item name must be between 1 and 255 characters'),
  handleValidationErrors,
];

const updateListItemValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Item name must be between 1 and 255 characters'),
  body('isCompleted')
    .optional()
    .isBoolean()
    .withMessage('isCompleted must be a boolean'),
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
  handleValidationErrors,
];

const idParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors,
];

const itemIdParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('List ID must be a positive integer'),
  param('itemId')
    .isInt({ min: 1 })
    .withMessage('Item ID must be a positive integer'),
  handleValidationErrors,
];

// All routes require authentication
router.use(authMiddleware);

// List CRUD
router.get('/', ListController.getAll);
router.get('/:id', idParamValidation, ListController.getById);
router.post('/', listValidation, ListController.create);
router.put('/:id', idParamValidation, updateListValidation, ListController.update);
router.delete('/:id', idParamValidation, ListController.delete);

// List Item CRUD
router.post('/:id/items', idParamValidation, listItemValidation, ListController.createItem);
router.put('/:id/items/:itemId', itemIdParamValidation, updateListItemValidation, ListController.updateItem);
router.patch('/:id/items/:itemId/toggle', itemIdParamValidation, ListController.toggleItem);
router.delete('/:id/items/:itemId', itemIdParamValidation, ListController.deleteItem);

export default router;
