import { Router } from 'express';
import { CategoryController } from '../controllers';
import { authMiddleware } from '../middleware';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware';

const router = Router();

const categoryValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category name must be between 1 and 100 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color (e.g., #FF5733)'),
  body('icon')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Icon name must be at most 50 characters'),
  body('parentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Parent ID must be a positive integer'),
  body('isIncome')
    .optional()
    .isBoolean()
    .withMessage('isIncome must be a boolean'),
  handleValidationErrors,
];

const updateCategoryValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Category name must be between 1 and 100 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color (e.g., #FF5733)'),
  body('icon')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Icon name must be at most 50 characters'),
  body('parentId')
    .optional({ nullable: true })
    .custom((value) => value === null || (Number.isInteger(value) && value > 0))
    .withMessage('Parent ID must be a positive integer or null'),
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

// All routes require authentication
router.use(authMiddleware);

router.get('/', CategoryController.getAll);
router.get('/:id', idParamValidation, CategoryController.getById);
router.post('/', categoryValidation, CategoryController.create);
router.put('/:id', idParamValidation, updateCategoryValidation, CategoryController.update);
router.delete('/:id', idParamValidation, CategoryController.delete);

export default router;
