import { Router } from 'express';
import { TransactionController } from '../controllers';
import { authMiddleware } from '../middleware';
import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware';

const router = Router();

const createTransactionValidation = [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number'),
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),
  body('merchantName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Merchant name must be at most 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
  body('categoryId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  body('notes')
    .optional()
    .trim(),
  handleValidationErrors,
];

const updateTransactionValidation = [
  body('amount')
    .optional()
    .isNumeric()
    .withMessage('Amount must be a number'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date'),
  body('merchantName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Merchant name must be at most 255 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),
  body('categoryId')
    .optional({ nullable: true })
    .custom((value) => value === null || (Number.isInteger(value) && value > 0))
    .withMessage('Category ID must be a positive integer or null'),
  body('notes')
    .optional()
    .trim(),
  handleValidationErrors,
];

const updateCategoryValidation = [
  body('categoryId')
    .custom((value) => value === null || (Number.isInteger(value) && value > 0))
    .withMessage('Category ID must be a positive integer or null'),
  handleValidationErrors,
];

const idParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors,
];

const listQueryValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('categoryId')
    .optional()
    .custom((value) => value === 'null' || !isNaN(parseInt(value)))
    .withMessage('Category ID must be a number or "null"'),
  query('accountId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Account ID must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  handleValidationErrors,
];

// All routes require authentication
router.use(authMiddleware);

router.get('/', listQueryValidation, TransactionController.getAll);
router.get('/:id', idParamValidation, TransactionController.getById);
router.post('/', createTransactionValidation, TransactionController.create);
router.put('/:id', idParamValidation, updateTransactionValidation, TransactionController.update);
router.put('/:id/category', idParamValidation, updateCategoryValidation, TransactionController.updateCategory);
router.delete('/:id', idParamValidation, TransactionController.delete);

export default router;
