import { Router } from 'express';
import { body, param } from 'express-validator';
import { GoalController } from '../controllers';
import { authMiddleware } from '../middleware';
import { handleValidationErrors } from '../middleware/validation.middleware';

const router = Router();

const idParamValidation = [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  handleValidationErrors,
];

const createValidation = [
  body('name')
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name is required and must be at most 255 characters'),
  body('goalType')
    .isIn(['save_balance', 'pay_off_credit', 'reduce_spending', 'spend_target'])
    .withMessage('Invalid goal type'),
  body('targetDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Target date must be a valid date'),
  body('plaidAccountId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Account ID must be a positive integer'),
  body('categoryId')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  body('targetAmount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Target amount must be a non-negative number'),
  body('baselineAmount')
    .optional({ nullable: true })
    .isFloat()
    .withMessage('Baseline amount must be a number'),
  body('targetBalance')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Target balance must be a non-negative number'),
  body('baselineTotal')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Baseline total must be a non-negative number'),
  body('reductionType')
    .optional({ nullable: true })
    .isIn(['fixed', 'percent'])
    .withMessage('Reduction type must be fixed or percent'),
  body('reductionAmount')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('Reduction amount must be a non-negative number'),
  body('creditAccountIds')
    .optional({ nullable: true })
    .isArray()
    .withMessage('creditAccountIds must be an array'),
  body('creditAccountIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Each credit account ID must be a positive integer'),
  handleValidationErrors,
];

const updateValidation = [
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be at most 255 characters'),
  body('targetDate')
    .optional({ nullable: true, checkFalsy: true })
    .isISO8601()
    .withMessage('Target date must be a valid date'),
  body('targetAmount').optional({ nullable: true }).isFloat({ min: 0 }),
  body('baselineAmount').optional({ nullable: true }).isFloat(),
  body('targetBalance').optional({ nullable: true }).isFloat({ min: 0 }),
  body('baselineTotal').optional({ nullable: true }).isFloat({ min: 0 }),
  body('reductionType')
    .optional({ nullable: true })
    .isIn(['fixed', 'percent']),
  body('reductionAmount').optional({ nullable: true }).isFloat({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('creditAccountIds').optional({ nullable: true }).isArray(),
  body('creditAccountIds.*').optional().isInt({ min: 1 }),
  handleValidationErrors,
];

router.use(authMiddleware);

router.get('/', GoalController.getAll);
router.get('/:id', idParamValidation, GoalController.getById);
router.post('/', createValidation, GoalController.create);
router.put('/:id', idParamValidation, updateValidation, GoalController.update);
router.delete('/:id', idParamValidation, GoalController.delete);

export default router;
