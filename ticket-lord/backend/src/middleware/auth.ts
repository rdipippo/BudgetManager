import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { UserModel } from '../models/user.model';

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const token = authHeader.slice(7);
    const payload = AuthService.verifyAccessToken(token);
    req.user = { id: payload.userId, email: payload.email, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };

export const requireHost = requireRole('host', 'admin');
export const requireAdmin = requireRole('admin');
