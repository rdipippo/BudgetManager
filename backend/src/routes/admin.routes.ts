import { Router } from 'express';
import { AdminController } from '../controllers';
import { authMiddleware, adminMiddleware, superAdminMiddleware, authLimiter } from '../middleware';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// Admin endpoints
router.get('/users', AdminController.getUsers);
router.patch('/users/:id/enabled', authLimiter, AdminController.toggleUserEnabled);
router.post('/users/:id/reset-password', authLimiter, AdminController.adminResetPassword);

// Super admin only endpoints
router.patch('/users/:id/role', superAdminMiddleware, authLimiter, AdminController.toggleUserRole);

export default router;
