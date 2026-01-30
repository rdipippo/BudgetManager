import { Router } from 'express';
import { BudgetController } from '../controllers';
import { authMiddleware } from '../middleware';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware';

const router = Router();

const createBudgetValidation = [
  body('categoryId')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('startDay')
    .optional()
    .isInt({ min: 1, max: 28 })
    .withMessage('Start day must be between 1 and 28'),
  handleValidationErrors,
];

const updateBudgetValidation = [
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('startDay')
    .optional()
    .isInt({ min: 1, max: 28 })
    .withMessage('Start day must be between 1 and 28'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
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

router.get('/', BudgetController.getAll);
router.get('/summary', BudgetController.getSummary);
router.get('/:id', idParamValidation, BudgetController.getById);
router.post('/', createBudgetValidation, BudgetController.create);
router.put('/:id', idParamValidation, updateBudgetValidation, BudgetController.update);
router.delete('/:id', idParamValidation, BudgetController.delete);

export default router;
