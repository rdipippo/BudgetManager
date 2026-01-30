import { Router } from 'express';
import { RuleController } from '../controllers';
import { authMiddleware } from '../middleware';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware';

const router = Router();

const createRuleValidation = [
  body('categoryId')
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('matchType')
    .isIn(['merchant', 'description', 'amount_range', 'combined'])
    .withMessage('Match type must be merchant, description, amount_range, or combined'),
  body('merchantPattern')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Merchant pattern must be at most 255 characters'),
  body('descriptionPattern')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description pattern must be at most 255 characters'),
  body('amountMin')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('Amount min must be a number'),
  body('amountMax')
    .optional({ nullable: true })
    .isNumeric()
    .withMessage('Amount max must be a number'),
  body('isExactMatch')
    .optional()
    .isBoolean()
    .withMessage('isExactMatch must be a boolean'),
  body('priority')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Priority must be a non-negative integer'),
  handleValidationErrors,
];

const updateRuleValidation = [
  body('categoryId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Category ID must be a positive integer'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  body('matchType')
    .optional()
    .isIn(['merchant', 'description', 'amount_range', 'combined'])
    .withMessage('Match type must be merchant, description, amount_range, or combined'),
  body('merchantPattern')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Merchant pattern must be at most 255 characters'),
  body('descriptionPattern')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Description pattern must be at most 255 characters'),
  body('amountMin')
    .optional({ nullable: true })
    .custom((value) => value === null || !isNaN(parseFloat(value)))
    .withMessage('Amount min must be a number or null'),
  body('amountMax')
    .optional({ nullable: true })
    .custom((value) => value === null || !isNaN(parseFloat(value)))
    .withMessage('Amount max must be a number or null'),
  body('isExactMatch')
    .optional()
    .isBoolean()
    .withMessage('isExactMatch must be a boolean'),
  body('priority')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Priority must be a non-negative integer'),
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

router.get('/', RuleController.getAll);
router.get('/:id', idParamValidation, RuleController.getById);
router.post('/', createRuleValidation, RuleController.create);
router.put('/:id', idParamValidation, updateRuleValidation, RuleController.update);
router.delete('/:id', idParamValidation, RuleController.delete);
router.post('/apply', RuleController.applyRules);

export default router;
