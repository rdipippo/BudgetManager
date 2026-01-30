import { Router } from 'express';
import { PlaidController } from '../controllers';
import { authMiddleware } from '../middleware';
import { body, param } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware';

const router = Router();

const exchangeTokenValidation = [
  body('publicToken')
    .notEmpty()
    .withMessage('Public token is required'),
  handleValidationErrors,
];

const idParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  handleValidationErrors,
];

// Webhook endpoint (no auth - uses Plaid's verification)
router.post('/webhook', PlaidController.handleWebhook);

const visibilityValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
  body('hidden')
    .isBoolean()
    .withMessage('Hidden must be a boolean'),
  handleValidationErrors,
];

// Protected routes
router.post('/create-link-token', authMiddleware, PlaidController.createLinkToken);
router.post('/exchange-token', authMiddleware, exchangeTokenValidation, PlaidController.exchangeToken);
router.get('/items', authMiddleware, PlaidController.getItems);
router.post('/items/:id/sync', authMiddleware, idParamValidation, PlaidController.syncItem);
router.delete('/items/:id', authMiddleware, idParamValidation, PlaidController.deleteItem);
router.patch('/accounts/:id/visibility', authMiddleware, visibilityValidation, PlaidController.setAccountVisibility);

export default router;
