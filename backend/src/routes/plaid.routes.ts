import { Router } from 'express';
import { PlaidController } from '../controllers';
import { authMiddleware, canManageAccountsMiddleware } from '../middleware';
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
// Account management routes are restricted for advisors and partial-access members
router.post('/create-link-token', authMiddleware, canManageAccountsMiddleware, PlaidController.createLinkToken);
router.post('/exchange-token', authMiddleware, canManageAccountsMiddleware, exchangeTokenValidation, PlaidController.exchangeToken);
router.delete('/items/:id', authMiddleware, canManageAccountsMiddleware, idParamValidation, PlaidController.deleteItem);

// Read-only routes accessible to all (advisors and partial members can view accounts)
router.get('/items', authMiddleware, PlaidController.getItems);
router.post('/items/:id/sync', authMiddleware, idParamValidation, PlaidController.syncItem);
router.get('/accounts/balance-history', authMiddleware, PlaidController.getBalanceHistory);
router.patch('/accounts/:id/visibility', authMiddleware, visibilityValidation, PlaidController.setAccountVisibility);

export default router;
