import { Router } from 'express';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import categoryRoutes from './category.routes';
import plaidRoutes from './plaid.routes';
import transactionRoutes from './transaction.routes';
import ruleRoutes from './rule.routes';
import budgetRoutes from './budget.routes';
import settingsRoutes from './settings.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/categories', categoryRoutes);
router.use('/plaid', plaidRoutes);
router.use('/transactions', transactionRoutes);
router.use('/rules', ruleRoutes);
router.use('/budgets', budgetRoutes);
router.use('/settings', settingsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
