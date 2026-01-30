import { Response } from 'express';
import { UserModel } from '../models';
import { TokenService, EmailService } from '../services';
import { AuthRequest } from '../middleware';

export const AdminController = {
  async getUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      const users = await UserModel.findAll();
      const publicUsers = users.map((user) => UserModel.toPublic(user));
      res.json({ users: publicUsers });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  },

  async toggleUserEnabled(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        res.status(400).json({ error: 'enabled must be a boolean' });
        return;
      }

      // Prevent admin from disabling themselves
      if (userId === req.userId && !enabled) {
        res.status(400).json({ error: 'Cannot disable your own account' });
        return;
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      await UserModel.updateEnabled(userId, enabled);

      // If disabling, revoke all refresh tokens
      if (!enabled) {
        await TokenService.revokeAllUserRefreshTokens(userId);
      }

      res.json({ message: `User ${enabled ? 'enabled' : 'disabled'} successfully` });
    } catch (error) {
      console.error('Toggle user enabled error:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  },

  async adminResetPassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);

      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Generate reset token and send email
      const resetToken = await TokenService.generatePasswordResetToken(userId);
      await EmailService.sendPasswordResetEmail(user.email, resetToken, user.first_name || undefined);

      res.json({ message: 'Password reset email sent successfully' });
    } catch (error) {
      console.error('Admin reset password error:', error);
      res.status(500).json({ error: 'Failed to send password reset email' });
    }
  },

  async toggleUserRole(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.id, 10);
      const { role } = req.body;

      // Only allow toggling between 'user' and 'admin'
      if (role !== 'user' && role !== 'admin') {
        res.status(400).json({ error: 'Role must be "user" or "admin"' });
        return;
      }

      // Prevent super_admin from changing their own role
      if (userId === req.userId) {
        res.status(400).json({ error: 'Cannot change your own role' });
        return;
      }

      const user = await UserModel.findById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Prevent changing super_admin role
      if (user.role === 'super_admin') {
        res.status(400).json({ error: 'Cannot change super admin role' });
        return;
      }

      await UserModel.updateRole(userId, role);

      // Revoke tokens to force re-login with new role
      await TokenService.revokeAllUserRefreshTokens(userId);

      res.json({ message: `User role updated to ${role} successfully` });
    } catch (error) {
      console.error('Toggle user role error:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  },
};
